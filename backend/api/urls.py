from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/login/',           views.api_login),
    path('auth/register/',        views.api_register),
    path('auth/logout/',          views.api_logout),
    path('auth/me/',              views.api_me),
    path('auth/profile/',         views.api_profile_update),
    path('auth/change-password/', views.api_change_password),
    path('auth/delete/',          views.api_delete_account),
    path('auth/avatar/',          views.api_avatar_upload),

    # Workspace
    path('workspace/invite/',                           views.api_workspace_invite),
    path('workspace/invitations/sent/',                 views.api_workspace_sent_invitations),
    path('workspace/invitations/received/',             views.api_workspace_received_invitations),
    path('workspace/invitations/<int:invite_id>/accept/',  views.api_workspace_accept_invite),
    path('workspace/invitations/<int:invite_id>/decline/', views.api_workspace_decline_invite),
    path('workspace/invitations/<int:invite_id>/cancel/',  views.api_workspace_cancel_invite),

    # Quizzes
    path('quizzes/',                              views.api_quiz_list),
    path('quizzes/create/',                       views.api_quiz_create),
    path('quizzes/<int:quiz_id>/',                views.api_quiz_detail),
    path('quizzes/<int:quiz_id>/update/',         views.api_quiz_update),
    path('quizzes/<int:quiz_id>/delete/',         views.api_quiz_delete),
    path('quizzes/<int:quiz_id>/image/',          views.api_quiz_image_upload),
    path('quizzes/<int:quiz_id>/duplicate/',      views.api_quiz_duplicate),
    path('quizzes/<int:quiz_id>/practice/',       views.api_quiz_practice),
    path('quizzes/<int:quiz_id>/questions/add/',     views.api_question_create),
    path('quizzes/<int:quiz_id>/questions/reorder/', views.api_questions_reorder),
    path('quizzes/<int:quiz_id>/questions/<int:question_id>/update/', views.api_question_update),
    path('quizzes/<int:quiz_id>/questions/<int:question_id>/delete/', views.api_question_delete),
    path('quizzes/<int:quiz_id>/questions/<int:question_id>/image/',  views.api_question_image_upload),

    # Profile
    path('profile/stats/', views.api_profile_stats),

    # Sessions
    path('sessions/',                          views.api_session_list),
    path('sessions/create/',                   views.api_session_create),
    path('sessions/join/',                     views.api_session_join),
    path('sessions/<int:session_id>/',         views.api_session_detail),
    path('sessions/<int:session_id>/start/',   views.api_session_start),
    path('sessions/<int:session_id>/answer/',  views.api_session_answer),
    path('sessions/<int:session_id>/kick/',    views.api_session_kick),
    path('sessions/<int:session_id>/end/',     views.api_session_end),
    path('sessions/<int:session_id>/results/', views.api_session_results),
    path('sessions/<int:session_id>/questions/<int:question_id>/status/', views.api_session_question_status),
]
