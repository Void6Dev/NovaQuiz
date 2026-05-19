from django.urls import path
from . import views


urlpatterns = [
    path('', views.quiz_list_view, name='main_page'),
    path('quiz/<int:quiz_id>/', views.quiz_detail_view, name='quiz_detail'),
    path('quiz-create/', views.quiz_create_view, name='quiz_create'),
    path('quiz/<int:quiz_id>/delete/', views.quiz_delete_view, name='quiz_delete'),
    path('quiz/<int:quiz_id>/edit/', views.quiz_edit_view, name='quiz_edit'),
    path('quiz/<int:quiz_id>/question/<int:question_id>/delete/', views.question_delete_view, name='question_delete'),
    path('quiz/<int:quiz_id>/finish/', views.quiz_finish_view, name='quiz_finish'),
    path('quiz/<int:quiz_id>/start/', views.quiz_start_view, name='quiz_start'),
    path('quiz/<int:quiz_id>/question/<int:question_index>/', views.quiz_question_view, name='quiz_question'),
    path('quiz/<int:quiz_id>/result/', views.quiz_result_view, name='quiz_result'),
    path('autocomplete/', views.username_autocomplete, name='username_autocomplete'),
]