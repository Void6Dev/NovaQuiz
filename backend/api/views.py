import json
from datetime import date as date_type
from functools import wraps
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.utils import timezone
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
import secrets
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.conf import settings

from datetime import date as _date, timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Count, F, Q, Sum

from auth_sys.models import Account, PasswordResetToken, WorkspaceInvitation
from quiz.models import Quiz, Question, Answer, PracticeRecord, UserStat, ActivityEntry, TopicStat, QuizVote, QuizComment, CommentVote
from hosting.models import Session, SessionPlayer, PlayerAnswer, SessionTeam


def login_required(view_func):
    """Decorator for API endpoints that require authentication.
    Returns 401 JSON instead of redirecting to login page."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper


def moderator_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        account = getattr(request.user, 'account', None)
        if not (request.user.is_superuser or (account and account.permission == 'moderator')):
            return JsonResponse({'error': 'Forbidden'}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper


def _json_body(request):
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return {}


def _user_data(user):
    account = getattr(user, 'account', None)
    return {
        'id': user.id,
        'username': user.username,
        'name': user.get_full_name() or user.username,
        'email': user.email,
        'credits': account.credits if account else 0,
        'permission': account.permission if account else 'user',
        'description': account.description if account else '',
        'birthday': account.birthday_day.isoformat() if account and account.birthday_day else '',
        'avatar': account.image.url if account and account.image else None,
        'avatar_transform': account.image_transform if account else '',
    }


def _quiz_data(quiz, user=None, include_stats=False):
    qcount   = getattr(quiz, 'question_count', None)
    # Use DB-level annotations when present (avoids N+1 on list views)
    likes    = getattr(quiz, 'likes',    None)
    dislikes = getattr(quiz, 'dislikes', None)
    if likes is None or dislikes is None:
        votes    = quiz.votes.aggregate(
            likes=Count('id', filter=Q(value=1)),
            dislikes=Count('id', filter=Q(value=-1)),
        )
        likes    = votes['likes']    or 0
        dislikes = votes['dislikes'] or 0
    my_vote = 0
    if user and getattr(user, 'is_authenticated', False):
        try:
            my_vote = QuizVote.objects.get(quiz=quiz, user=user).value
        except QuizVote.DoesNotExist:
            pass
    data = {
        'id': quiz.id,
        'title': quiz.title,
        'topic': quiz.topic,
        'topic_display': quiz.get_topic_display(),
        'description': quiz.description or '',
        'image': quiz.image.url if quiz.image else None,
        'cover_transform': quiz.image_transform or '',
        'creator': quiz.creator.username,
        'created_at': quiz.created_at.isoformat(),
        'question_count': qcount if qcount is not None else quiz.questions.count(),
        'is_public': quiz.is_public,
        'likes': likes,
        'dislikes': dislikes,
        'my_vote': my_vote,
    }
    if include_stats:
        data['comment_count'] = quiz.comments.filter(is_deleted=False).count()
    return data


def _question_data(q):
    return {
        'id': q.id,
        'text': q.text,
        'image': q.image.url if q.image else None,
        'image_url': q.image_url or '',
        'question_type': q.question_type,
        'correct_answer': q.correct_answer,
        'time_limit': q.time_limit,
        'points': q.points,
        'order': q.order,
        'shuffle_options': q.shuffle_options,
        'explanation': q.explanation or '',
        'image_transform': q.image_transform or '',
        'answers': [
            {
                'id': a.id,
                'text': a.text,
                'image': a.image.url if a.image else None,
                'image_url': a.image_url or '',
                'is_correct': a.is_correct,
            }
            for a in q.answers.all()
        ],
    }


def _session_data(s):
    teams = [
        {'id': t.id, 'name': t.name, 'color': t.color, 'order': t.order}
        for t in s.teams.all()
    ] if s.teams_enabled else []
    return {
        'id': s.id,
        'code': s.code,
        'quiz_id': s.session_id,
        'quiz_title': s.session.title,
        'host': s.host.username,
        'time_per_question': s.time_per_question,
        'max_players': s.max_players,
        'has_started': s.has_started,
        'has_ended': s.has_ended,
        'is_active': s.is_active,
        'created_at': s.created_at.isoformat(),
        'player_count': s.players.filter(is_kicked=False).count(),
        'teams_enabled': s.teams_enabled,
        'teams': teams,
    }


def _ws_broadcast(session_id, payload):
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        f'session_{session_id}',
        {'type': 'session.event', 'payload': payload},
    )


_LOGIN_MAX_ATTEMPTS = 10
_LOGIN_WINDOW = 60 * 15  # 15 minutes


def _get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _check_login_rate_limit(request):
    ip = _get_client_ip(request)
    key = f'login_ratelimit:{ip}'
    attempts = cache.get(key, 0)
    if attempts >= _LOGIN_MAX_ATTEMPTS:
        return True
    cache.set(key, attempts + 1, _LOGIN_WINDOW)
    return False


# ─── AUTH ───────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def api_login(request):
    if _check_login_rate_limit(request):
        return JsonResponse({'error': 'Too many login attempts. Try again later.'}, status=429)
    data = _json_body(request)
    user = authenticate(request, username=data.get('username'), password=data.get('password'))
    if user is None:
        return JsonResponse({'error': 'Invalid username or password'}, status=401)
    login(request, user)
    return JsonResponse(_user_data(user))


@csrf_exempt
@require_http_methods(['POST'])
def api_register(request):
    data = _json_body(request)
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()

    if not username or not password:
        return JsonResponse({'error': 'Username and password are required'}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username already taken'}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email)
    Account.objects.create(user=user)
    login(request, user)
    return JsonResponse(_user_data(user), status=201)


@csrf_exempt
@require_http_methods(['POST'])
def api_logout(request):
    logout(request)
    return JsonResponse({'status': 'ok'})


def api_me(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    return JsonResponse(_user_data(request.user))


@csrf_exempt
@login_required
def api_profile_update(request):
    data = _json_body(request)
    user = request.user
    account = getattr(user, 'account', None)
    changed = False

    if 'name' in data:
        parts = data['name'].strip().split(' ', 1)
        user.first_name = parts[0]
        user.last_name = parts[1] if len(parts) > 1 else ''
        changed = True
    if 'email' in data:
        user.email = data['email'].strip()
        changed = True
    if changed:
        user.save()

    if account:
        if 'description' in data:
            account.description = data['description']
        if 'birthday' in data:
            raw = data['birthday']
            if raw:
                try:
                    account.birthday_day = date_type.fromisoformat(raw)
                except ValueError:
                    pass
            else:
                account.birthday_day = None
        account.save()

    return JsonResponse(_user_data(user))


@csrf_exempt
@login_required
def api_change_password(request):
    data = _json_body(request)
    old = data.get('old_password', '')
    new = data.get('new_password', '')
    if not request.user.check_password(old):
        return JsonResponse({'error': 'Current password is incorrect'}, status=400)
    if len(new) < 6:
        return JsonResponse({'error': 'Password must be at least 6 characters'}, status=400)
    request.user.set_password(new)
    request.user.save()
    update_session_auth_hash(request, request.user)
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@login_required
def api_delete_account(request):
    user = request.user
    logout(request)
    user.delete()
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@require_http_methods(['POST'])
def api_forgot_password(request):
    data = _json_body(request)
    email = data.get('email', '').strip().lower()
    # Always return 200 to prevent email enumeration
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return JsonResponse({'status': 'ok'})

    token_obj = PasswordResetToken(user=user)
    token_obj.save()

    reset_url = f"{request.scheme}://{request.get_host()}/reset-password.html?token={token_obj.token}"
    try:
        send_mail(
            subject='Nova Quiz — Password Reset',
            message=f'Hi {user.username},\n\nClick the link below to reset your password (valid 1 hour):\n{reset_url}\n\nIf you did not request this, ignore this email.\n\n— Nova Quiz Team',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception:
        pass
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@require_http_methods(['POST'])
def api_reset_password(request):
    data = _json_body(request)
    raw_token = data.get('token', '').strip()
    new_password = data.get('new_password', '')

    if not raw_token:
        return JsonResponse({'error': 'Token is required'}, status=400)
    if len(new_password) < 6:
        return JsonResponse({'error': 'Password must be at least 6 characters'}, status=400)

    try:
        token_obj = PasswordResetToken.objects.select_related('user').get(token=raw_token)
    except PasswordResetToken.DoesNotExist:
        return JsonResponse({'error': 'Invalid or expired token'}, status=400)

    if not token_obj.is_valid:
        return JsonResponse({'error': 'Invalid or expired token'}, status=400)

    token_obj.used = True
    token_obj.save(update_fields=['used'])

    user = token_obj.user
    user.set_password(new_password)
    user.save()
    return JsonResponse({'status': 'ok'})


_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


def _validate_image(f):
    if not f:
        return 'No file provided'
    if not f.content_type.startswith('image/'):
        return 'File must be an image'
    if f.size > _MAX_IMAGE_SIZE:
        return 'Image must be smaller than 5 MB'
    return None


@csrf_exempt
@login_required
def api_avatar_upload(request):
    f = request.FILES.get('avatar')
    err = _validate_image(f)
    if err:
        return JsonResponse({'error': err}, status=400)
    account = getattr(request.user, 'account', None)
    if not account:
        return JsonResponse({'error': 'Account not found'}, status=404)
    account.image = f
    account.save()
    return JsonResponse({'avatar': account.image.url})


@csrf_exempt
@login_required
def api_avatar_transform(request):
    account = getattr(request.user, 'account', None)
    if not account:
        return JsonResponse({'error': 'Account not found'}, status=404)
    data = _json_body(request)
    account.image_transform = data.get('transform', '') or ''
    account.save()
    return JsonResponse({'avatar_transform': account.image_transform})


# ─── WORKSPACE ──────────────────────────────────────────────────────────────

def _validate_email(email):
    """Validate email format and return error message if invalid."""
    if not email or not email.strip():
        return 'Email is required'
    email = email.strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return 'Invalid email format'
    return None

@csrf_exempt
@login_required
def api_workspace_invite(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    data = _json_body(request)
    email = data.get('email', '').strip().lower()

    # Validate email format
    err = _validate_email(email)
    if err:
        return JsonResponse({'error': err}, status=400)

    # Cannot invite yourself (skip check if user has no email set)
    if request.user.email and email == request.user.email:
        return JsonResponse({'error': 'Cannot invite yourself'}, status=400)

    # Check if already invited (don't spam same email)
    existing = WorkspaceInvitation.objects.filter(
        from_user=request.user,
        to_email=email,
        status='pending'
    )
    if existing.exists():
        return JsonResponse({'error': f'Already invited {email}. Pending response.'}, status=400)

    # Create or update invitation (token is auto-generated in model.save())
    try:
        inv, created = WorkspaceInvitation.objects.update_or_create(
            from_user=request.user,
            to_email=email,
            defaults={'status': 'pending', 'token': secrets.token_urlsafe(32)}
        )
    except Exception as e:
        return JsonResponse({'error': f'Failed to create invitation: {str(e)}'}, status=500)

    # Try to send email notification
    email_sent = False
    if settings.DEBUG is False:
        try:
            send_mail(
                subject=f'{request.user.get_full_name() or request.user.username} invited you to Nova Quiz',
                message=f'''Hi,

{request.user.get_full_name() or request.user.username} ({request.user.username}) has invited you to collaborate on Nova Quiz!

If you have a Nova Quiz account, go to your workspace settings to accept this invitation.

If you don't have an account yet, create one at:
{request.build_absolute_uri('/')}

— Nova Quiz Team
''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            email_sent = True
        except Exception as e:
            print(f'Email failed for {email}: {str(e)}')

    return JsonResponse({
        'status': 'ok',
        'invitation_id': inv.id,
        'to_email': email,
        'email_sent': email_sent,
    }, status=201)


@login_required
def api_workspace_sent_invitations(request):
    """Get invitations sent BY the current user."""
    invitations = WorkspaceInvitation.objects.filter(from_user=request.user).order_by('-created_at')
    return JsonResponse({
        'sent': [
            {
                'id': inv.id,
                'to_email': inv.to_email,
                'status': inv.status,
                'created_at': inv.created_at.isoformat(),
                'updated_at': inv.updated_at.isoformat(),
            }
            for inv in invitations
        ]
    })


@login_required
def api_workspace_received_invitations(request):
    """Get invitations sent TO the current user."""
    invitations = WorkspaceInvitation.objects.filter(to_email=request.user.email).order_by('-created_at')
    return JsonResponse({
        'received': [
            {
                'id': inv.id,
                'from_user': inv.from_user.username,
                'from_name': inv.from_user.get_full_name() or inv.from_user.username,
                'status': inv.status,
                'created_at': inv.created_at.isoformat(),
                'updated_at': inv.updated_at.isoformat(),
            }
            for inv in invitations
        ]
    })


@csrf_exempt
@login_required
def api_workspace_accept_invite(request, invite_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    inv = get_object_or_404(WorkspaceInvitation, id=invite_id)

    if inv.to_email != request.user.email:
        return JsonResponse({'error': 'Access denied'}, status=403)

    if inv.status != 'pending':
        return JsonResponse({'error': f'Invitation already {inv.status}'}, status=400)

    inv.status = 'accepted'
    inv.to_user = request.user
    inv.save()

    return JsonResponse({
        'status': 'ok',
        'invitation_id': inv.id,
        'from_user': inv.from_user.username,
    })


@csrf_exempt
@login_required
def api_workspace_decline_invite(request, invite_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    inv = get_object_or_404(WorkspaceInvitation, id=invite_id)

    if inv.to_email != request.user.email:
        return JsonResponse({'error': 'Access denied'}, status=403)

    if inv.status != 'pending':
        return JsonResponse({'error': f'Invitation already {inv.status}'}, status=400)

    inv.status = 'declined'
    inv.save()

    return JsonResponse({
        'status': 'ok',
        'invitation_id': inv.id,
    })


@csrf_exempt
@login_required
def api_workspace_cancel_invite(request, invite_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    inv = get_object_or_404(WorkspaceInvitation, id=invite_id)

    # Must be the sender (to cancel sent invitations)
    if inv.from_user != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)

    # Can only cancel pending invitations
    if inv.status != 'pending':
        return JsonResponse({'error': f'Cannot cancel {inv.status} invitation'}, status=400)

    inv.delete()
    return JsonResponse({'status': 'ok'})


# ─── QUIZZES ────────────────────────────────────────────────────────────────

def api_quiz_list(request):
    qs = Quiz.objects.annotate(
        question_count=Count('questions', distinct=True),
        likes=Count('votes', filter=Q(votes__value=1), distinct=True),
        dislikes=Count('votes', filter=Q(votes__value=-1), distinct=True),
    ).order_by('-created_at')
    topic = request.GET.get('topic')
    creator = request.GET.get('creator')
    if request.GET.get('mine') == '1':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Not authenticated'}, status=401)
        qs = qs.filter(creator=request.user)
    elif request.GET.get('shared') == '1':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Not authenticated'}, status=401)
        workspace_owners = WorkspaceInvitation.objects.filter(
            to_email=request.user.email, status='accepted'
        ).values_list('from_user', flat=True)
        qs = qs.filter(creator__in=workspace_owners)
    elif creator:
        qs = qs.filter(creator__username__icontains=creator, is_public=True)
    else:
        qs = qs.filter(is_public=True)
    if topic:
        qs = qs.filter(topic=topic)
    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))

    try:
        page = max(1, int(request.GET.get('page', 1)))
        page_size = min(max(1, int(request.GET.get('page_size', 20))), 100)
    except (ValueError, TypeError):
        page, page_size = 1, 20

    total = qs.count()
    offset = (page - 1) * page_size
    quizzes = qs[offset:offset + page_size]

    user = request.user if request.user.is_authenticated else None
    return JsonResponse({
        'quizzes': [_quiz_data(q, user=user) for q in quizzes],
        'total': total,
        'page': page,
        'page_size': page_size,
        'has_next': (offset + page_size) < total,
    })


@csrf_exempt
@login_required
def api_quiz_create(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    data = _json_body(request)
    quiz = Quiz.objects.create(
        title=data.get('title', 'Untitled quiz'),
        topic=data.get('topic', Quiz.Topic.GENERAL_KNOWLEDGE),
        description=data.get('description', ''),
        is_public=bool(data.get('is_public', True)),
        creator=request.user,
    )
    return JsonResponse(_quiz_data(quiz), status=201)


def api_quiz_detail(request, quiz_id):
    quiz = get_object_or_404(Quiz.objects.annotate(question_count=Count('questions')), id=quiz_id)
    if not quiz.is_public and quiz.creator != getattr(request, 'user', None):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Access denied'}, status=403)
        is_workspace_member = WorkspaceInvitation.objects.filter(
            from_user=quiz.creator, to_email=request.user.email, status='accepted'
        ).exists()
        if not is_workspace_member:
            return JsonResponse({'error': 'Access denied'}, status=403)
    user = request.user if request.user.is_authenticated else None
    data = _quiz_data(quiz, user=user, include_stats=True)
    data['questions'] = [_question_data(q) for q in quiz.questions.all()]
    return JsonResponse(data)


def api_quiz_similar(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id, is_public=True)
    user = request.user if request.user.is_authenticated else None
    similar = (
        Quiz.objects
        .filter(is_public=True, topic=quiz.topic)
        .exclude(id=quiz_id)
        .annotate(
            question_count=Count('questions', distinct=True),
            likes=Count('votes', filter=Q(votes__value=1), distinct=True),
            dislikes=Count('votes', filter=Q(votes__value=-1), distinct=True),
        )
        .order_by('-likes', '-created_at')[:8]
    )
    return JsonResponse({'quizzes': [_quiz_data(q, user=user) for q in similar]})


@csrf_exempt
@login_required
def api_quiz_update(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    if quiz.creator != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)
    data = _json_body(request)
    for field in ('title', 'topic', 'description'):
        if field in data:
            setattr(quiz, field, data[field])
    if 'is_public' in data:
        quiz.is_public = bool(data['is_public'])
    if 'cover_transform' in data:
        quiz.image_transform = data['cover_transform'] or ''
    quiz.save()
    return JsonResponse(_quiz_data(quiz))


@csrf_exempt
@login_required
def api_quiz_delete(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    if quiz.creator != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)
    quiz.delete()
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@login_required
def api_quiz_duplicate(request, quiz_id):
    original = get_object_or_404(Quiz, id=quiz_id)
    new_quiz = Quiz.objects.create(
        title=original.title + ' (copy)',
        topic=original.topic,
        description=original.description or '',
        creator=request.user,
    )
    for q in original.questions.all():
        new_q = Question.objects.create(
            quiz=new_quiz, text=q.text,
            question_type=q.question_type,
            correct_answer=q.correct_answer,
            time_limit=q.time_limit,
            points=q.points,
        )
        for a in q.answers.all():
            Answer.objects.create(question=new_q, text=a.text, is_correct=a.is_correct)
    return JsonResponse(_quiz_data(new_quiz), status=201)


@csrf_exempt
@login_required
def api_quiz_practice(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    account = getattr(request.user, 'account', None)
    data = _json_body(request)
    correct   = max(0, int(data.get('correct', 0)))
    total_qs  = max(correct, int(data.get('total', correct)))

    # ── STATS — always tracked, even for own quizzes / replays ─────────────
    today = _date.today()
    stat, _ = UserStat.objects.get_or_create(user=request.user)
    xp_earned = correct * 10

    # Streak logic
    if stat.streak_last_date is None:
        stat.streak_current = 1
    elif stat.streak_last_date == today:
        pass  # already practiced today
    elif (today - stat.streak_last_date).days == 1:
        stat.streak_current += 1
    else:
        stat.streak_current = 1  # streak broken

    if stat.streak_last_date != today:
        stat.streak_last_date = today

    stat.streak_longest = max(stat.streak_longest, stat.streak_current)
    stat.xp += xp_earned
    stat.quizzes_played += 1
    stat.correct_total += correct
    stat.questions_total += total_qs
    stat.save()

    # Daily activity entry — get_or_create then atomic F() increment to avoid race conditions
    entry, created = ActivityEntry.objects.get_or_create(
        user=request.user, date=today,
        defaults={'xp': xp_earned, 'questions': total_qs, 'quizzes': 1},
    )
    if not created:
        ActivityEntry.objects.filter(pk=entry.pk).update(
            xp=F('xp') + xp_earned,
            questions=F('questions') + total_qs,
            quizzes=F('quizzes') + 1,
        )

    # Topic stat
    if total_qs > 0 and quiz.topic:
        ts, _ = TopicStat.objects.get_or_create(user=request.user, topic=quiz.topic)
        ts.correct += correct
        ts.total   += total_qs
        ts.save()
    # ───────────────────────────────────────────────────────────────────────

    # Credits: only for first play of someone else's quiz
    if quiz.creator == request.user:
        return JsonResponse({
            'credits_earned': 0,
            'credits_total': account.credits if account else 0,
            'already_rewarded': False,
        })

    already = PracticeRecord.objects.filter(user=request.user, quiz=quiz).exists()
    if already:
        return JsonResponse({
            'credits_earned': 0,
            'credits_total': account.credits if account else 0,
            'already_rewarded': True,
        })

    credits_earned = correct * 5
    PracticeRecord.objects.create(user=request.user, quiz=quiz)
    if credits_earned > 0 and account:
        account.credits += credits_earned
        account.save()

    return JsonResponse({
        'credits_earned': credits_earned,
        'credits_total': account.credits if account else 0,
        'already_rewarded': False,
    })


@csrf_exempt
@login_required
def api_quiz_image_upload(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    if quiz.creator != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)
    f = request.FILES.get('image')
    err = _validate_image(f)
    if err:
        return JsonResponse({'error': err}, status=400)
    quiz.image = f
    quiz.save()
    return JsonResponse({'image': quiz.image.url})


# ─── QUESTIONS ───────────────────────────────────────────────────────────────

@csrf_exempt
@login_required
def api_question_create(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    if quiz.creator != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)
    data = _json_body(request)
    from django.db.models import Max
    max_order = quiz.questions.aggregate(Max('order'))['order__max']
    order = (max_order or 0) + 1
    question = Question.objects.create(
        quiz=quiz,
        text=data.get('text', ''),
        order=data.get('order', order),
        time_limit=data.get('time_limit', 30),
        points=data.get('points', 100),
        question_type=data.get('question_type', 'single'),
        correct_answer=data.get('correct_answer', ''),
        explanation=data.get('explanation', ''),
        image_transform=data.get('image_transform', ''),
    )
    for ans in data.get('answers', []):
        Answer.objects.create(
            question=question,
            text=ans.get('text', ''),
            is_correct=ans.get('is_correct', False),
        )
    return JsonResponse(_question_data(question), status=201)


@csrf_exempt
@login_required
def api_question_update(request, quiz_id, question_id):
    question = get_object_or_404(Question, id=question_id, quiz_id=quiz_id)
    if question.quiz.creator != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)
    data = _json_body(request)
    changed = False
    if 'text' in data:
        question.text = data['text']
        changed = True
    if 'image_url' in data:
        question.image_url = data['image_url'] or None
        changed = True
    if 'time_limit' in data:
        question.time_limit = int(data['time_limit'])
        changed = True
    if 'points' in data:
        question.points = int(data['points'])
        changed = True
    if 'shuffle_options' in data:
        question.shuffle_options = bool(data['shuffle_options'])
        changed = True
    if 'question_type' in data:
        question.question_type = data['question_type']
        changed = True
    if 'correct_answer' in data:
        question.correct_answer = data['correct_answer']
        changed = True
    if 'explanation' in data:
        question.explanation = data['explanation']
        changed = True
    if 'image_transform' in data:
        question.image_transform = data['image_transform'] or ''
        changed = True
    if changed:
        question.save()
    if 'answers' in data:
        incoming = data['answers']
        incoming_ids = set(a['id'] for a in incoming if a.get('id'))
        question.answers.exclude(id__in=incoming_ids).delete()
        for ans in incoming:
            ans_id = ans.get('id')
            if ans_id:
                Answer.objects.filter(id=ans_id, question=question).update(
                    text=ans.get('text', ''),
                    is_correct=ans.get('is_correct', False),
                )
            else:
                Answer.objects.create(
                    question=question,
                    text=ans.get('text', ''),
                    is_correct=ans.get('is_correct', False),
                )
    return JsonResponse(_question_data(question))


@csrf_exempt
@login_required
def api_question_delete(request, quiz_id, question_id):
    question = get_object_or_404(Question, id=question_id, quiz_id=quiz_id)
    if question.quiz.creator != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)
    question.delete()
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@login_required
def api_questions_reorder(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    if quiz.creator != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)
    ids = _json_body(request).get('ids', [])
    for idx, qid in enumerate(ids):
        Question.objects.filter(id=qid, quiz=quiz).update(order=idx)
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@login_required
def api_question_image_upload(request, quiz_id, question_id):
    question = get_object_or_404(Question, id=question_id, quiz_id=quiz_id)
    if question.quiz.creator != request.user:
        return JsonResponse({'error': 'Access denied'}, status=403)
    f = request.FILES.get('image')
    err = _validate_image(f)
    if err:
        return JsonResponse({'error': err}, status=400)
    question.image = f
    question.save()
    return JsonResponse({'image': question.image.url})


# ─── SESSIONS ────────────────────────────────────────────────────────────────

@login_required
def api_session_list(request):
    sessions = Session.objects.filter(has_ended=False).select_related('host', 'session').order_by('-created_at')
    return JsonResponse({'sessions': [_session_data(s) for s in sessions]})


@csrf_exempt
@login_required
def api_session_create(request):
    data = _json_body(request)
    quiz = get_object_or_404(Quiz, id=data.get('quiz_id'))
    session = Session.objects.create(host=request.user, session=quiz)
    return JsonResponse(_session_data(session), status=201)


@login_required
def api_session_detail(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    data = _session_data(session)
    data['players'] = [
        {
            'user_id': p.user_id,
            'username': p.user.username,
            'score': p.score,
            'is_kicked': p.is_kicked,
            'team_id': p.team_id,
            'team_name': p.team.name if p.team else None,
        }
        for p in session.players.filter(is_kicked=False).select_related('user', 'team')
    ]
    return JsonResponse(data)


@csrf_exempt
@login_required
def api_session_join(request):
    data = _json_body(request)
    code = data.get('code', '').upper()
    try:
        session = Session.objects.get(code=code, has_ended=False, has_started=False)
    except Session.DoesNotExist:
        return JsonResponse({'error': 'Session not found or already started'}, status=404)

    if session.players.filter(user=request.user).exists():
        return JsonResponse(_session_data(session))
    if session.players.count() >= session.max_players:
        return JsonResponse({'error': 'Session is full'}, status=400)

    SessionPlayer.objects.create(session=session, user=request.user)
    _ws_broadcast(session.id, {
        'type': 'player.joined',
        'username': request.user.username,
        'player_count': session.players.filter(is_kicked=False).count(),
    })
    return JsonResponse(_session_data(session))


@csrf_exempt
@login_required
def api_session_start(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    if session.host != request.user:
        return JsonResponse({'error': 'Only the host can start the session'}, status=403)
    data = _json_body(request)
    if 'time_per_question' in data:
        session.time_per_question = int(data['time_per_question'])
    if 'max_players' in data:
        session.max_players = int(data['max_players'])
    session.has_started = True
    session.save()
    _ws_broadcast(session.id, {'type': 'session.started'})
    return JsonResponse({'status': 'ok'})


@login_required
def api_session_question_status(request, session_id, question_id):
    session = get_object_or_404(Session, id=session_id)
    question = get_object_or_404(Question, id=question_id, quiz=session.session)
    answers = PlayerAnswer.objects.filter(session=session, question=question)
    total_players = session.players.filter(is_kicked=False).count()
    count_map = {
        row['answer_id']: row['cnt']
        for row in answers.values('answer_id').annotate(cnt=Count('id'))
    }
    dist = [
        {'id': a.id, 'text': a.text, 'is_correct': a.is_correct, 'count': count_map.get(a.id, 0)}
        for a in question.answers.all()
    ]
    return JsonResponse({
        'answered': answers.values('player').distinct().count(),
        'total': total_players,
        'distribution': dist,
    })


@csrf_exempt
@login_required
@transaction.atomic
def api_session_answer(request, session_id):
    data = _json_body(request)
    session = get_object_or_404(Session, id=session_id)
    question = get_object_or_404(Question, id=data.get('question_id'))
    answer = get_object_or_404(Answer, id=data.get('answer_id'))

    sp = get_object_or_404(SessionPlayer.objects.select_for_update(), session=session, user=request.user)

    if PlayerAnswer.objects.filter(session=session, player=request.user, question=question).exists():
        return JsonResponse({'error': 'You already answered this question'}, status=400)

    PlayerAnswer.objects.create(session=session, player=request.user, question=question, answer=answer)

    if answer.is_correct:
        is_first = not PlayerAnswer.objects.filter(
            session=session, question=question
        ).exclude(player=request.user).exists()
        sp.score += 2 if is_first else 1
        sp.save()

    answered = PlayerAnswer.objects.filter(session=session, question=question).values('player').distinct().count()
    total = session.players.filter(is_kicked=False).count()
    _ws_broadcast(session.id, {
        'type': 'player.answered',
        'question_id': question.id,
        'answered': answered,
        'total': total,
    })
    return JsonResponse({'status': 'ok', 'score': sp.score, 'correct': answer.is_correct})


@csrf_exempt
@login_required
def api_session_kick(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    if session.host != request.user:
        return JsonResponse({'error': 'Only the host can remove players'}, status=403)
    data = _json_body(request)
    user_id = data.get('user_id')
    SessionPlayer.objects.filter(session=session, user_id=user_id).update(is_kicked=True)
    try:
        kicked_username = User.objects.get(id=user_id).username
        _ws_broadcast(session.id, {'type': 'player.kicked', 'username': kicked_username})
    except User.DoesNotExist:
        pass
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@login_required
def api_session_end(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    if session.host != request.user:
        return JsonResponse({'error': 'Only the host can end the session'}, status=403)
    session.has_ended = True
    session.save()
    _ws_broadcast(session.id, {'type': 'session.ended'})
    return JsonResponse({'status': 'ok'})


@login_required
def api_session_results(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    players = session.players.filter(is_kicked=False).select_related('user').order_by('-score', 'joined_at')
    return JsonResponse({
        'session_id': session.id,
        'quiz': session.session.title,
        'players': [
            {'username': p.user.username, 'score': p.score}
            for p in players
        ],
    })


# ─── PROFILE STATS ───────────────────────────────────────────────────────────

_ACHIEVEMENTS = [
    {'id': 'first_play', 'name': 'First Steps',  'desc': 'Complete your first quiz'},
    {'id': 'on_fire',    'name': 'On Fire',       'desc': '7-day streak'},
    {'id': 'dedicated',  'name': 'Dedicated',     'desc': '30-day streak'},
    {'id': 'polymath',   'name': 'Polymath',       'desc': 'Play 5+ different topics'},
    {'id': 'century',    'name': 'Century',        'desc': 'Complete 100 quizzes'},
    {'id': 'scholar',    'name': 'Scholar',        'desc': 'Earn 1,000 XP'},
    {'id': 'sharp',      'name': 'Sharp',          'desc': '90%+ accuracy in a topic (10q+)'},
    {'id': 'mentor',     'name': 'Mentor',         'desc': 'Host 5 live sessions'},
]

_TOPIC_LABELS = {
    'GK': 'General Knowledge', 'MV': 'Movies & TV',    'VG': 'Video Games',
    'MU': 'Music',             'SC': 'Science & Nature','HS': 'History & Culture',
    'IN': 'Internet & Pop',    'SP': 'Sports',          'LT': 'Literature',
    'LG': 'Logic & Riddles',   'AN': 'Anime',           'CT': 'Cartoons',
}


@login_required
def api_analytics(request):
    from django.db.models.functions import TruncDate
    user = request.user
    range_param = request.GET.get('range', '7d')
    today = _date.today()

    if range_param == '7d':
        period_days = 7
    elif range_param == '30d':
        period_days = 30
    elif range_param == '90d':
        period_days = 90
    else:
        period_days = None

    this_start = (today - timedelta(days=period_days - 1)) if period_days else None
    prev_start = (today - timedelta(days=period_days * 2 - 1)) if period_days else None
    prev_end   = (today - timedelta(days=period_days)) if period_days else None

    # All sessions hosted by user
    all_sessions = Session.objects.filter(host=user)
    this_sessions = all_sessions.filter(created_at__date__gte=this_start) if this_start else all_sessions
    prev_sessions = all_sessions.filter(created_at__date__gte=prev_start, created_at__date__lte=prev_end) if period_days else Session.objects.none()

    from django.db.models import Avg
    total = this_sessions.count()
    completed = this_sessions.filter(has_ended=True).count()
    completion_rate = round(completed / total * 100, 1) if total > 0 else 0

    # Player count and avg score in this period
    players_qs = SessionPlayer.objects.filter(session__in=this_sessions)
    players_this = players_qs.count()
    avg_score_val = players_qs.aggregate(avg=Avg('score'))['avg'] or 0
    avg_score = round(avg_score_val, 1)

    # Sessions per day (this period) → dict keyed by date string
    by_day_qs = (
        this_sessions
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )
    by_day_map = {r['day'].isoformat(): r['count'] for r in by_day_qs}

    # Same for prev period
    prev_by_day_qs = (
        prev_sessions
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )
    prev_by_day_map = {r['day'].isoformat(): r['count'] for r in prev_by_day_qs}

    # Build aligned arrays (one entry per day in period)
    this_arr, prev_arr, labels = [], [], []
    if period_days:
        for i in range(period_days):
            d = this_start + timedelta(days=i)
            p = prev_start + timedelta(days=i) if prev_start else None
            this_arr.append(by_day_map.get(d.isoformat(), 0))
            prev_arr.append(prev_by_day_map.get(p.isoformat(), 0) if p else 0)
            labels.append(d.strftime('%b %d') if period_days > 7 else d.strftime('%a'))

    # Score distribution: bucket players by % correct answers
    answer_stats = (
        PlayerAnswer.objects
        .filter(session__in=this_sessions)
        .values('player_id')
        .annotate(
            total=Count('id'),
            correct=Count('id', filter=Q(answer__is_correct=True)),
        )
        .filter(total__gt=0)
    )
    dist_buckets = [0, 0, 0, 0, 0]  # 0-20, 20-40, 40-60, 60-80, 80-100
    for row in answer_stats:
        pct = row['correct'] / row['total'] * 100
        idx = min(int(pct / 20), 4)
        dist_buckets[idx] += 1
    score_dist = [
        {'range': '0–20',   'count': dist_buckets[0]},
        {'range': '20–40',  'count': dist_buckets[1]},
        {'range': '40–60',  'count': dist_buckets[2]},
        {'range': '60–80',  'count': dist_buckets[3]},
        {'range': '80–100', 'count': dist_buckets[4]},
    ]

    # Top quizzes (by ended session count, all time for this user)
    top_q = (
        Quiz.objects
        .filter(creator=user)
        .annotate(session_count=Count('sessions', filter=Q(sessions__has_ended=True)))
        .filter(session_count__gt=0)
        .order_by('-session_count')[:5]
    )

    # Hardest questions (lowest correct rate, min 3 answers, sessions hosted by user)
    q_stats = (
        PlayerAnswer.objects
        .filter(session__host=user)
        .values('question_id', 'question__text')
        .annotate(
            total=Count('id'),
            correct=Count('id', filter=Q(answer__is_correct=True)),
        )
        .filter(total__gte=3)
        .order_by('correct')[:5]
    )

    return JsonResponse({
        'range': range_param,
        'total_sessions': total,
        'completion_rate': completion_rate,
        'players': players_this,
        'avg_score': avg_score,
        'this_period': this_arr,
        'prev_period': prev_arr,
        'period_labels': labels,
        'score_dist': score_dist,
        'top_quizzes': [
            {'id': q.id, 'title': q.title, 'topic': q.topic, 'session_count': q.session_count}
            for q in top_q
        ],
        'hardest_questions': [
            {
                'question': r['question__text'],
                'total': r['total'],
                'correct_rate': round(r['correct'] / r['total'] * 100, 1) if r['total'] > 0 else 0,
            }
            for r in q_stats
        ],
    })


@login_required
def api_profile_stats(request):
    user = request.user
    today = _date.today()

    stat, _ = UserStat.objects.get_or_create(user=user)

    # ── weekly aggregates (last 7 days) ──────────────────────────────────────
    week_start = today - timedelta(days=6)
    week_qs = ActivityEntry.objects.filter(user=user, date__gte=week_start)
    xp_this_week     = week_qs.aggregate(s=Sum('xp'))['s'] or 0
    quizzes_this_week = week_qs.aggregate(s=Sum('quizzes'))['s'] or 0

    # ── accuracy ─────────────────────────────────────────────────────────────
    accuracy = 0.0
    if stat.questions_total > 0:
        accuracy = round(stat.correct_total / stat.questions_total * 100, 1)

    # ── activity heatmap (last 26 weeks) ─────────────────────────────────────
    heatmap_start = today - timedelta(weeks=26)
    activity_rows = ActivityEntry.objects.filter(user=user, date__gte=heatmap_start)
    activity = [
        {'date': a.date.isoformat(), 'xp': a.xp, 'questions': a.questions}
        for a in activity_rows
    ]

    # ── topic stats ──────────────────────────────────────────────────────────
    raw_topics = TopicStat.objects.filter(user=user, total__gt=0)
    topics = sorted(
        [
            {
                'topic':    ts.topic,
                'label':    _TOPIC_LABELS.get(ts.topic, ts.topic),
                'correct':  ts.correct,
                'total':    ts.total,
                'accuracy': round(ts.correct / ts.total * 100, 1),
            }
            for ts in raw_topics
        ],
        key=lambda x: -x['accuracy'],
    )

    # ── rank ─────────────────────────────────────────────────────────────────
    from django.contrib.auth.models import User as AuthUser
    higher_count = UserStat.objects.filter(xp__gt=stat.xp).count()
    total_users  = max(AuthUser.objects.count(), 1)
    rank    = higher_count + 1
    top_pct = round(rank / total_users * 100)

    # ── achievements ─────────────────────────────────────────────────────────
    topics_played   = raw_topics.count()
    sessions_hosted = Session.objects.filter(host=user).count()
    any_sharp = any(
        t['accuracy'] >= 90 and t['total'] >= 10 for t in topics
    )

    def _unlocked(aid):
        if aid == 'first_play': return stat.quizzes_played >= 1
        if aid == 'on_fire':    return stat.streak_current >= 7 or stat.streak_longest >= 7
        if aid == 'dedicated':  return stat.streak_current >= 30 or stat.streak_longest >= 30
        if aid == 'polymath':   return topics_played >= 5
        if aid == 'century':    return stat.quizzes_played >= 100
        if aid == 'scholar':    return stat.xp >= 1000
        if aid == 'sharp':      return any_sharp
        if aid == 'mentor':     return sessions_hosted >= 5
        return False

    achievements = [
        {**a, 'unlocked': _unlocked(a['id'])}
        for a in _ACHIEVEMENTS
    ]

    return JsonResponse({
        'xp':               stat.xp,
        'xp_this_week':     xp_this_week,
        'quizzes_played':   stat.quizzes_played,
        'quizzes_this_week': quizzes_this_week,
        'accuracy':         accuracy,
        'correct_total':    stat.correct_total,
        'questions_total':  stat.questions_total,
        'streak_current':   stat.streak_current,
        'streak_longest':   stat.streak_longest,
        'activity':         activity,
        'topics':           topics,
        'rank':             rank,
        'top_pct':          top_pct,
        'joined':           user.date_joined.isoformat(),
        'achievements':     achievements,
    })


# ─── SOCIAL: VOTES & COMMENTS ────────────────────────────────────────────────

@csrf_exempt
@login_required
def api_quiz_vote(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    data = _json_body(request)
    value = data.get('value', 0)
    if value not in (-1, 0, 1):
        return JsonResponse({'error': 'Invalid vote value'}, status=400)
    if value == 0:
        QuizVote.objects.filter(quiz=quiz, user=request.user).delete()
        my_vote = 0
    else:
        QuizVote.objects.update_or_create(quiz=quiz, user=request.user, defaults={'value': value})
        my_vote = value
    votes = quiz.votes.aggregate(likes=Count('id', filter=Q(value=1)), dislikes=Count('id', filter=Q(value=-1)))
    return JsonResponse({'likes': votes['likes'] or 0, 'dislikes': votes['dislikes'] or 0, 'my_vote': my_vote})


@csrf_exempt
def api_quiz_comments(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    user = request.user if request.user.is_authenticated else None

    if request.method == 'GET':
        sort = request.GET.get('sort', 'top')
        top_comments = (
            QuizComment.objects
            .filter(quiz=quiz, parent=None)
            .select_related('author', 'author__account')
            .prefetch_related('votes', 'replies__author', 'replies__author__account', 'replies__votes',
                              'replies__replies__author', 'replies__replies__author__account', 'replies__replies__votes')
        )

        def _cdata(c, depth=0):
            vote_map = {v.user_id: v.value for v in c.votes.all()}
            acc = getattr(c.author, 'account', None)
            return {
                'id': c.id,
                'author': c.author.username,
                'author_permission': acc.permission if acc else 'user',
                'author_avatar': acc.image.url if acc and acc.image else None,
                'author_avatar_transform': acc.image_transform if acc else '',
                'body': '' if c.is_deleted else c.body,
                'created_at': c.created_at.isoformat(),
                'edited_at': c.edited_at.isoformat() if c.edited_at else None,
                'is_deleted': c.is_deleted,
                'vote_score': sum(vote_map.values()),
                'my_vote': vote_map.get(user.id, 0) if user else 0,
                'replies': [_cdata(r, depth + 1) for r in c.replies.all()] if depth < 4 else [],
            }

        if sort == 'new':
            top_comments = top_comments.order_by('-created_at')
        result = [_cdata(c) for c in top_comments]
        if sort == 'top':
            result.sort(key=lambda c: c['vote_score'], reverse=True)
        return JsonResponse({'comments': result})

    if request.method == 'POST':
        if not user:
            return JsonResponse({'error': 'Login required'}, status=401)
        data = _json_body(request)
        body = data.get('body', '').strip()
        if not body:
            return JsonResponse({'error': 'Body required'}, status=400)
        if len(body) > 5000:
            return JsonResponse({'error': 'Comment too long (max 5000 chars)'}, status=400)
        parent = None
        pid = data.get('parent_id')
        if pid:
            parent = get_object_or_404(QuizComment, id=pid, quiz=quiz)
        c = QuizComment.objects.create(quiz=quiz, author=user, parent=parent, body=body)
        acc = getattr(user, 'account', None)
        return JsonResponse({
            'id': c.id, 'author': user.username,
            'author_permission': acc.permission if acc else 'user',
            'author_avatar': acc.image.url if acc and acc.image else None,
            'author_avatar_transform': acc.image_transform if acc else '',
            'body': c.body, 'created_at': c.created_at.isoformat(),
            'edited_at': None, 'is_deleted': False,
            'vote_score': 0, 'my_vote': 0, 'replies': [],
        }, status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def api_comment_detail(request, comment_id):
    comment = get_object_or_404(QuizComment, id=comment_id)
    if request.method == 'PATCH':
        if comment.author != request.user:
            return JsonResponse({'error': 'Access denied'}, status=403)
        data = _json_body(request)
        body = data.get('body', '').strip()
        if not body:
            return JsonResponse({'error': 'Body required'}, status=400)
        comment.body = body
        comment.edited_at = timezone.now()
        comment.save()
        return JsonResponse({'status': 'ok', 'body': comment.body})
    if request.method == 'DELETE':
        if comment.author != request.user:
            return JsonResponse({'error': 'Access denied'}, status=403)
        comment.is_deleted = True
        comment.body = ''
        comment.save()
        return JsonResponse({'status': 'ok'})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def api_comment_vote(request, comment_id):
    comment = get_object_or_404(QuizComment, id=comment_id)
    data = _json_body(request)
    value = data.get('value', 0)
    if value not in (-1, 0, 1):
        return JsonResponse({'error': 'Invalid vote value'}, status=400)
    if value == 0:
        CommentVote.objects.filter(comment=comment, user=request.user).delete()
    else:
        CommentVote.objects.update_or_create(comment=comment, user=request.user, defaults={'value': value})
    vote_score = sum(v.value for v in comment.votes.all())
    return JsonResponse({'vote_score': vote_score, 'my_vote': value})


# ─── ANALYTICS EXPORT ────────────────────────────────────────────────────────

@login_required
def api_analytics_export(request):
    import csv
    from django.http import HttpResponse
    range_param = request.GET.get('range', 'all')
    today = _date.today()
    start = None
    if range_param == '7d':   start = today - timedelta(days=7)
    elif range_param == '30d': start = today - timedelta(days=30)
    elif range_param == '90d': start = today - timedelta(days=90)

    sessions = Session.objects.filter(host=request.user, has_ended=True).select_related('session')
    if start:
        sessions = sessions.filter(created_at__date__gte=start)

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="quiz_results.csv"'
    response.write('﻿')  # UTF-8 BOM for Excel
    writer = csv.writer(response)
    writer.writerow(['Date', 'Session Code', 'Quiz', 'Username', 'Score', 'Rank'])
    for session in sessions.order_by('-created_at'):
        players = list(
            session.players.filter(is_kicked=False)
            .select_related('user').order_by('-score', 'joined_at')
        )
        for rank, sp in enumerate(players, 1):
            writer.writerow([
                session.created_at.date().isoformat(),
                session.code, session.session.title,
                sp.user.username, sp.score, rank,
            ])
    return response


# ─── SESSION TEAMS ───────────────────────────────────────────────────────────

@csrf_exempt
@login_required
def api_session_teams(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    if session.host != request.user:
        return JsonResponse({'error': 'Only the host can manage teams'}, status=403)
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    data = _json_body(request)
    teams_data = data.get('teams', [])
    session.teams.all().delete()
    session.teams_enabled = bool(teams_data)
    session.save(update_fields=['teams_enabled'])
    created = []
    for i, t in enumerate(teams_data):
        team = SessionTeam.objects.create(
            session=session, name=t.get('name', f'Team {i+1}')[:30],
            color=t.get('color', ''), order=i,
        )
        created.append({'id': team.id, 'name': team.name, 'color': team.color, 'order': team.order})
    _ws_broadcast(session.id, {'type': 'teams.updated', 'teams': created, 'teams_enabled': session.teams_enabled})
    return JsonResponse({'teams_enabled': session.teams_enabled, 'teams': created})


@csrf_exempt
@login_required
def api_session_join_team(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    sp = get_object_or_404(SessionPlayer, session=session, user=request.user)
    data = _json_body(request)
    team_id = data.get('team_id')
    if team_id:
        team = get_object_or_404(SessionTeam, id=team_id, session=session)
        sp.team = team
    else:
        sp.team = None
    sp.save(update_fields=['team'])
    players_data = [
        {
            'user_id': p.user_id, 'username': p.user.username, 'score': p.score,
            'team_id': p.team_id, 'team_name': p.team.name if p.team else None,
        }
        for p in session.players.filter(is_kicked=False).select_related('user', 'team')
    ]
    _ws_broadcast(session.id, {'type': 'team.assigned', 'players': players_data})
    return JsonResponse({'status': 'ok', 'team_id': sp.team_id})


# ─── PUBLIC USER PROFILE ─────────────────────────────────────────────────────

def api_user_profile(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    account = getattr(user, 'account', None)
    stat = getattr(user, 'stat', None)
    quiz_count = Quiz.objects.filter(creator=user, is_public=True).count()
    session_count = Session.objects.filter(host=user).count()
    heatmap_start = _date.today() - timedelta(weeks=26)
    activity = [
        {'date': a.date.isoformat(), 'xp': a.xp, 'questions': a.questions}
        for a in ActivityEntry.objects.filter(user=user, date__gte=heatmap_start).order_by('date')
    ]
    topics = []
    for ts in TopicStat.objects.filter(user=user, total__gt=0).order_by('-correct'):
        acc = round(ts.correct / ts.total * 100) if ts.total else 0
        topics.append({'topic': ts.topic, 'label': _TOPIC_LABELS.get(ts.topic, ts.topic), 'accuracy': acc, 'total': ts.total})
    return JsonResponse({
        'username': user.username,
        'name': user.get_full_name() or user.username,
        'avatar': account.image.url if account and account.image else None,
        'avatar_transform': account.image_transform if account else '',
        'description': account.description if account else '',
        'joined': user.date_joined.isoformat(),
        'xp': stat.xp if stat else 0,
        'streak_current': stat.streak_current if stat else 0,
        'quizzes_played': stat.quizzes_played if stat else 0,
        'quiz_count': quiz_count,
        'session_count': session_count,
        'activity': activity,
        'topics': topics,
    })


# ── Moderator admin ───────────────────────────────────────────────────────────

@csrf_exempt
@moderator_required
def api_admin_users(request):
    q = request.GET.get('q', '').strip()
    qs = User.objects.select_related('account').order_by('username')
    if q:
        qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q))
    users = [
        {
            'id': u.id,
            'username': u.username,
            'name': u.get_full_name() or u.username,
            'email': u.email,
            'permission': u.account.permission if hasattr(u, 'account') else 'user',
        }
        for u in qs[:50]
    ]
    return JsonResponse({'users': users})


@csrf_exempt
@moderator_required
def api_admin_set_permission(request, user_id):
    data = _json_body(request)
    permission = data.get('permission')
    if permission not in ('user', 'moderator'):
        return JsonResponse({'error': 'Invalid permission'}, status=400)
    target = get_object_or_404(User, id=user_id)
    if target == request.user and permission == 'user':
        return JsonResponse({'error': 'Cannot demote yourself'}, status=400)
    account, _ = Account.objects.get_or_create(user=target)
    account.permission = permission
    account.save(update_fields=['permission'])
    return JsonResponse({'ok': True, 'permission': permission})
