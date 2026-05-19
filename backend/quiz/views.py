from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse

from .forms import QuizForm, QuestionForm
from .models import Quiz, Question, Answer
from .formsets import AnswerFormSet

def quiz_list_view(request):
    sort_by = request.GET.get('sort', 'created_at') 
    creator_name = request.GET.get('creator')
    topic = request.GET.get('topic')
    quizzes = Quiz.objects.all()

    if creator_name:
        quizzes = quizzes.filter(creator__username__icontains=creator_name)
        
    if topic:
        quizzes = quizzes.filter(topic=topic)

    if sort_by in ['created_at', 'title', 'topic', 'creator__username']:
        quizzes = quizzes.order_by(sort_by)
        
    context = {
        'quizzes': quizzes,
        'selected_topic': topic,
    }

    return render(request, 'quiz_user/main_page.html', context)


def username_autocomplete(request):
    query = request.GET.get('q', '')
    usernames = []

    if query:
        usernames = list(
            User.objects.filter(username__icontains=query)
            .values_list('username', flat=True)[:10]
        )
    return JsonResponse({'results': usernames})


def quiz_detail_view(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    return render(request, 'quiz_user/quiz_detail.html', {'quiz': quiz})


def quiz_delete_view(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    if request.user != quiz.creator:  
        return redirect('quiz_detail', quiz_id=quiz.id)
    
    if request.method == 'POST':
        quiz.delete()
        return redirect('main_page')
    return render(request, 'quiz_creator/quiz_delete.html', {'quiz': quiz})


@login_required
def quiz_start_view(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)

    questions = list(quiz.questions.all())

    if not questions:
        return render(request, 'quiz_user/quiz_empty.html', {'quiz': quiz})

    return redirect('quiz_question', quiz_id=quiz.id, question_index=1)


@login_required
def quiz_question_view(request, quiz_id, question_index):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    questions = list(quiz.questions.all())

    if question_index < 1 or question_index > len(questions):
        return redirect('quiz_result', quiz_id=quiz_id)

    question = questions[question_index - 1]
    answers = question.answers.all()

    if request.method == 'POST':
        selected = request.POST.get('answer')
        request.session.setdefault('quiz_answers', {})
        request.session['quiz_answers'][str(question.id)] = selected
        request.session.modified = True

        return redirect('quiz_question', quiz_id=quiz_id, question_index=question_index + 1)

    return render(request, 'quiz_user/quiz_question.html', {
        'quiz': quiz,
        'question': question,
        'answers': answers,
        'question_index': question_index,
        'total_questions': len(questions),
    })
    

def quiz_result_view(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)
    answers_given = request.session.get('quiz_answers', {})

    correct = 0
    total = 0

    for question in quiz.questions.all():
        total += 1
        selected = answers_given.get(str(question.id))
        if selected:
            try:
                answer = Answer.objects.get(id=int(selected), question=question)
                if answer.is_correct:
                    correct += 1
            except Answer.DoesNotExist:
                pass

    credits_earned = correct * 5
    if credits_earned > 0:
        account = request.user.account
        account.credits += credits_earned
        account.save()

    request.session['quiz_answers'] = {}

    return render(request, 'quiz_user/quiz_result.html', {
        'quiz': quiz,
        'correct': correct,
        'total': total,
        'credits_earned': credits_earned
    })
    
@login_required
def quiz_create_view(request):
    if request.method == 'POST':
        form = QuizForm(request.POST, request.FILES)
        if form.is_valid():
            quiz = form.save(commit=False)
            quiz.creator = request.user
            quiz.save()
            return redirect('quiz_edit', quiz_id=quiz.id)
    else:
        form = QuizForm()
    
    return render(request, 'quiz_creator/quiz_create.html', {'form': form})


@login_required
def quiz_edit_view(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id)

    if request.method == 'POST':
        question_form = QuestionForm(request.POST, request.FILES)
        formset = AnswerFormSet(request.POST, request.FILES, queryset=Answer.objects.none())

        if question_form.is_valid() and formset.is_valid():
            question = question_form.save(commit=False)
            question.quiz = quiz
            question.save()

            answers = formset.save(commit=False)
            for answer in answers:
                answer.question = question
                answer.save()
            for obj in formset.deleted_objects:
                obj.delete()

            return redirect('quiz_edit', quiz_id=quiz.id)
    else:
        question_form = QuestionForm()
        formset = AnswerFormSet(queryset=Answer.objects.none())

    return render(request, 'quiz_creator/quiz_edit.html', {
        'quiz': quiz,
        'question_form': question_form,
        'formset': formset,
        'questions': quiz.questions.all(),
    })


@login_required
def question_delete_view(request, quiz_id, question_id):
    question = get_object_or_404(Question, id=question_id, quiz_id=quiz_id)
    if request.method == 'POST':
        question.delete()
        return redirect('quiz_edit', quiz_id=quiz_id)


# Не реализованно
@login_required
def quiz_finish_view(request, quiz_id):
    quiz = get_object_or_404(Quiz, id=quiz_id, creator=request.user)
    
    # - установить флаг quiz.is_published
    # - запретить редактирование 
    # - отправить на модерацию мб

    return redirect('quiz_detail', quiz_id=quiz.id)

