import json
from datetime import date as date_type
from functools import wraps
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings

from auth_sys.models import Account, WorkspaceInvitation
from quiz.models import Quiz, Question, Answer, PracticeRecord
from hosting.models import Session, SessionPlayer, PlayerAnswer


def login_required(view_func):
    """Decorator for API endpoints that require authentication.
    Returns 401 JSON instead of redirecting to login page."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
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
    }


def _quiz_data(quiz):
    return {
        'id': quiz.id,
        'title': quiz.title,
        'topic': quiz.topic,
        'topic_display': quiz.get_topic_display(),
        'description': quiz.description or '',
        'image': quiz.image.url if quiz.image else None,
        'creator': quiz.creator.username,
        'created_at': quiz.created_at.isoformat(),
        'question_count': quiz.questions.count(),
    }


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
    }


# ─── AUTH ───────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def api_login(request):
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
@login_required
def api_avatar_upload(request):
    f = request.FILES.get('avatar')
    if not f:
        return JsonResponse({'error': 'No file provided'}, status=400)
    if not f.content_type.startswith('image/'):
        return JsonResponse({'error': 'File must be an image'}, status=400)
    account = getattr(request.user, 'account', None)
    if not account:
        return JsonResponse({'error': 'Account not found'}, status=404)
    account.image = f
    account.save()
    return JsonResponse({'avatar': account.image.url})


# ─── WORKSPACE ──────────────────────────────────────────────────────────────

import secrets
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

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

    # Cannot invite yourself
    if email == request.user.email:
        return JsonResponse({'error': 'Cannot invite yourself'}, status=400)

    # Check if already invited (don't spam same email)
    existing = WorkspaceInvitation.objects.filter(
        from_user=request.user,
        to_email=email,
        status='pending'
    )
    if existing.exists():
        return JsonResponse({'error': f'Already invited {email}. Pending response.'}, status=400)

    # Generate unique token for this invitation
    token = secrets.token_urlsafe(32)

    # Create or update invitation
    try:
        inv, created = WorkspaceInvitation.objects.update_or_create(
            from_user=request.user,
            to_email=email,
            defaults={'status': 'pending', 'token': token}
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
    qs = Quiz.objects.all().order_by('-created_at')
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
        qs = qs.filter(creator__username__icontains=creator)
    if topic:
        qs = qs.filter(topic=topic)
    return JsonResponse({'quizzes': [_quiz_data(q) for q in qs]})


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
        creator=request.user,
    )
    return JsonResponse(_quiz_data(quiz), status=201)


def api_quiz_detail(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    data = _quiz_data(quiz)
    data['questions'] = [_question_data(q) for q in quiz.questions.all()]
    return JsonResponse(data)


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

    # No rewards for playing your own quiz or replaying an already-rewarded quiz
    if quiz.creator == request.user:
        return JsonResponse({'credits_earned': 0, 'credits_total': account.credits if account else 0, 'already_rewarded': False})

    already = PracticeRecord.objects.filter(user=request.user, quiz=quiz).exists()
    if already:
        return JsonResponse({'credits_earned': 0, 'credits_total': account.credits if account else 0, 'already_rewarded': True})

    data = _json_body(request)
    correct = max(0, int(data.get('correct', 0)))
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
    if not f:
        return JsonResponse({'error': 'No file provided'}, status=400)
    if not f.content_type.startswith('image/'):
        return JsonResponse({'error': 'File must be an image'}, status=400)
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
    if not f:
        return JsonResponse({'error': 'No file provided'}, status=400)
    if not f.content_type.startswith('image/'):
        return JsonResponse({'error': 'File must be an image'}, status=400)
    question.image = f
    question.save()
    return JsonResponse({'image': question.image.url})


# ─── SESSIONS ────────────────────────────────────────────────────────────────

@login_required
def api_session_list(request):
    sessions = Session.objects.filter(is_active=True).order_by('-created_at')
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
        {'user_id': p.user_id, 'username': p.user.username, 'score': p.score, 'is_kicked': p.is_kicked}
        for p in session.players.filter(is_kicked=False)
    ]
    return JsonResponse(data)


@csrf_exempt
@login_required
def api_session_join(request):
    data = _json_body(request)
    code = data.get('code', '').upper()
    try:
        session = Session.objects.get(code=code, is_active=True, has_started=False)
    except Session.DoesNotExist:
        return JsonResponse({'error': 'Session not found or already started'}, status=404)

    if session.players.filter(user=request.user).exists():
        return JsonResponse(_session_data(session))
    if session.players.count() >= session.max_players:
        return JsonResponse({'error': 'Session is full'}, status=400)

    SessionPlayer.objects.create(session=session, user=request.user)
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
    return JsonResponse({'status': 'ok'})


@login_required
def api_session_question_status(request, session_id, question_id):
    session = get_object_or_404(Session, id=session_id)
    question = get_object_or_404(Question, id=question_id, quiz=session.session)
    answers = PlayerAnswer.objects.filter(session=session, question=question)
    total_players = session.players.filter(is_kicked=False).count()
    dist = []
    for ans in question.answers.all():
        dist.append({
            'id': ans.id,
            'text': ans.text,
            'is_correct': ans.is_correct,
            'count': answers.filter(answer=ans).count(),
        })
    return JsonResponse({
        'answered': answers.values('player').distinct().count(),
        'total': total_players,
        'distribution': dist,
    })


@csrf_exempt
@login_required
def api_session_answer(request, session_id):
    data = _json_body(request)
    session = get_object_or_404(Session, id=session_id)
    question = get_object_or_404(Question, id=data.get('question_id'))
    answer = get_object_or_404(Answer, id=data.get('answer_id'))

    if PlayerAnswer.objects.filter(session=session, player=request.user, question=question).exists():
        return JsonResponse({'error': 'You already answered this question'}, status=400)

    PlayerAnswer.objects.create(session=session, player=request.user, question=question, answer=answer)

    sp = get_object_or_404(SessionPlayer, session=session, user=request.user)
    if answer.is_correct:
        sp.score += 1
        is_first = not PlayerAnswer.objects.filter(
            session=session, question=question
        ).exclude(player=request.user).exists()
        if is_first:
            sp.score += 1
        sp.save()

    return JsonResponse({'status': 'ok', 'score': sp.score, 'correct': answer.is_correct})


@csrf_exempt
@login_required
def api_session_kick(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    if session.host != request.user:
        return JsonResponse({'error': 'Only the host can remove players'}, status=403)
    data = _json_body(request)
    SessionPlayer.objects.filter(session=session, user_id=data.get('user_id')).update(is_kicked=True)
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@login_required
def api_session_end(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    if session.host != request.user:
        return JsonResponse({'error': 'Only the host can end the session'}, status=403)
    session.has_ended = True
    session.is_active = False
    session.save()
    return JsonResponse({'status': 'ok'})


@login_required
def api_session_results(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    players = session.players.filter(is_kicked=False).order_by('-score', 'joined_at')
    return JsonResponse({
        'session_id': session.id,
        'quiz': session.session.title,
        'players': [
            {'username': p.user.username, 'score': p.score}
            for p in players
        ],
    })
