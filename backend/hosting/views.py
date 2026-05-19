import random
from django.utils import timezone
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse    
from .models import Session, SessionPlayer, PlayerAnswer
from quiz.models import Question, Answer, Quiz


@login_required
def session_list(request):
    sort_by = request.GET.get('sort', 'created_at') 
    host_name = request.GET.get('host')
    quiz = request.GET.get('quiz.title')
    session_started = request.GET.get('has_started')
    
    sessions = Session.objects.all()
    
    context = {
        'host': host_name,
        'hosted_quiz': quiz,
        'sort_by': sort_by,
        'sessions': sessions,
        'has_started': session_started,
    }
    return render(request, 'quiz_user/sessions.html', context)

@csrf_exempt
@require_POST
@login_required
def session_create_view(request):
    quiz_id = request.POST.get('quiz_id')
    quiz = get_object_or_404(Quiz, id=quiz_id)

    session = Session.objects.create(
        host=request.user,
        session=quiz
    )
    SessionPlayer.objects.create(session=session, user=request.user)

    return JsonResponse({
        'status': 'ok',
        'session_id': session.id,
        'redirect_url': f'/session/{session.id}/'
    })
    

@login_required
def session_waiting_room(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    player, created = SessionPlayer.objects.get_or_create(session=session, user=request.user)
    if player.is_kicked:
        return redirect('main_page')

    if request.method == 'POST' and session.host == request.user:
        session.time_per_question = request.POST.get('time', session.time_per_question)
        session.max_players = request.POST.get('limit', session.max_players)
        session.save()

    return render(request, 'session/session_waiting.html', {
        'session': session,
        'is_host': session.host == request.user,
    })
    
     
@login_required
def join_session_by_code(request):
    if request.method == 'POST':
        code = request.POST.get('code')
        try:
            session = Session.objects.get(code=code, is_active=True, has_started=False)
        except Session.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Сессия не найдена или уже началась.'})

        if session.players.filter(user=request.user).exists():
            return JsonResponse({'status': 'ok', 'redirect_url': f'/session/{session.id}/'})

        if session.players.count() >= session.max_players:
            return JsonResponse({'status': 'error', 'message': 'Сессия заполнена.'})

        SessionPlayer.objects.create(session=session, user=request.user)
        return JsonResponse({'status': 'ok', 'redirect_url': f'/session/{session.id}/'})

    return JsonResponse({'status': 'error', 'message': 'Неверный метод запроса.'}, status=405)    


@login_required
def get_session_players(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    players = [
        {'username': p.user.username, 'id': p.user.id}
        for p in session.players.filter(is_kicked=False)
    ]
    return JsonResponse({'players': players, 'started': session.has_started})


@require_POST
@login_required
def session_start(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    if session.host != request.user:
        return JsonResponse({'status': 'error', 'message': 'Only host can start'}, status=403)

    session.has_started = True
    session.save()
    return JsonResponse({'status': 'ok'})


@login_required
def session_play(request, session_id):
    session = get_object_or_404(Session, id=session_id, is_active=True)

    questions = list(session.session.questions.all())
    total = len(questions)

    question_index = int(request.GET.get('q', 0))
    if question_index >= total:
        return redirect('session_wait_for_other', session_id=session.id)

    question = questions[question_index]
    answers = list(question.answers.all())
    random.shuffle(answers)
    return render(request, 'session/session_play.html', {
        'session': session,
        'quiz': session.session,
        'question': question,
        'answers': answers,
        'index': question_index + 1,
        'total': total,
        'timer': session.time_per_question,
    })


@csrf_exempt
@require_POST
@login_required
def submit_answer_view(request, session_id):
    session_id = request.POST.get('session_id')
    question_id = request.POST.get('question_id')
    answer_id = request.POST.get('answer_id')

    try:
        session = Session.objects.get(id=session_id)
        question = Question.objects.get(id=question_id)
        answer = Answer.objects.get(id=answer_id)
        player = request.user

        if PlayerAnswer.objects.filter(session=session, player=player, question=question).exists():
            return JsonResponse({'status': 'error', 'message': 'Вы уже ответили'})

        PlayerAnswer.objects.create(
            session=session,
            player=player,
            question=question,
            answer=answer,
            submitted_at=timezone.now()
        )

        sp = SessionPlayer.objects.get(session=session, user=player)

        if answer.is_correct:
            sp.score += 1
            sp.save() 
            
            is_first = not PlayerAnswer.objects.filter(session=session, question=question).exclude(player=player).exists()
            if is_first:
                sp.score += 1
                sp.save()

        return JsonResponse({'status': 'ok', 'score': sp.score})

    except (Session.DoesNotExist, Question.DoesNotExist, Answer.DoesNotExist):
        return JsonResponse({'status': 'error', 'message': 'Неверные данные'})


@login_required
def session_wait_for_other(request, session_id):
    session = get_object_or_404(Session, id=session_id)

    total_players = session.players.filter(is_kicked=False).count()
    answered_players = PlayerAnswer.objects.filter(
        session=session,
    ).values_list("player", flat=True).distinct().count()

    if answered_players >= total_players:
        return redirect("session_results", session_id=session.id)

    return render(request, "session/session_wait_for_other.html", {
        "session": session,
        "total_players": total_players,
        "answered_players": answered_players,
    })


@login_required
def session_results(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    
    players = session.players.filter(is_kicked=False).order_by('-score', 'joined_at')
    return render(request, 'session/session_results.html', {
        'session': session,
        'players': players
    })
    
    
@require_POST
@login_required
def kick_player(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    if session.host != request.user:
        return JsonResponse({'status': 'error', 'message': 'Only host can kick'}, status=403)

    user_id = request.POST.get('user_id')
    SessionPlayer.objects.filter(session=session, user_id=user_id).update(is_kicked=True)
    return JsonResponse({'status': 'ok'})