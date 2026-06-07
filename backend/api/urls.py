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
    path('auth/avatar/transform/', views.api_avatar_transform),
    path('auth/forgot-password/', views.api_forgot_password),
    path('auth/reset-password/',  views.api_reset_password),

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
    path('quizzes/<int:quiz_id>/similar/',        views.api_quiz_similar),
    path('quizzes/<int:quiz_id>/practice/',       views.api_quiz_practice),
    path('quizzes/<int:quiz_id>/questions/add/',     views.api_question_create),
    path('quizzes/<int:quiz_id>/questions/reorder/', views.api_questions_reorder),
    path('quizzes/<int:quiz_id>/questions/<int:question_id>/update/', views.api_question_update),
    path('quizzes/<int:quiz_id>/questions/<int:question_id>/delete/', views.api_question_delete),
    path('quizzes/<int:quiz_id>/questions/<int:question_id>/image/',  views.api_question_image_upload),

    # Profile & Analytics
    path('analytics/',        views.api_analytics),
    path('analytics/export/', views.api_analytics_export),
    path('profile/stats/',    views.api_profile_stats),

    # Social
    path('quizzes/<int:quiz_id>/vote/',              views.api_quiz_vote),
    path('quizzes/<int:quiz_id>/comments/',          views.api_quiz_comments),
    path('comments/<int:comment_id>/',               views.api_comment_detail),
    path('comments/<int:comment_id>/vote/',          views.api_comment_vote),

    # Public profiles
    path('users/<str:username>/', views.api_user_profile),

    # Moderator admin
    path('admin/users/',                             views.api_admin_users),
    path('admin/users/<int:user_id>/permission/',    views.api_admin_set_permission),
    path('admin/quizzes/<int:quiz_id>/delete/',      views.api_moderator_quiz_delete),

    # Notifications
    path('notifications/',                views.api_notifications),
    path('notifications/<int:notif_id>/read/', views.api_notification_read),

    # Appeals
    path('deletions/<int:deletion_id>/appeal/', views.api_deletion_appeal),
    path('appeals/<int:deletion_id>/accept/',   views.api_appeal_accept),
    path('appeals/<int:deletion_id>/reject/',   views.api_appeal_reject),

    # Sessions
    path('sessions/',                                    views.api_session_list),
    path('sessions/create/',                             views.api_session_create),
    path('sessions/join/',                               views.api_session_join),
    path('sessions/<int:session_id>/',                   views.api_session_detail),
    path('sessions/<int:session_id>/start/',             views.api_session_start),
    path('sessions/<int:session_id>/answer/',            views.api_session_answer),
    path('sessions/<int:session_id>/kick/',              views.api_session_kick),
    path('sessions/<int:session_id>/end/',               views.api_session_end),
    path('sessions/<int:session_id>/results/',           views.api_session_results),
    path('sessions/<int:session_id>/teams/',             views.api_session_teams),
    path('sessions/<int:session_id>/join-team/',         views.api_session_join_team),
    path('sessions/<int:session_id>/questions/<int:question_id>/status/', views.api_session_question_status),
]
