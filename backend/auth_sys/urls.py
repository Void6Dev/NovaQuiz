from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register_view, name='register'),
    path('auth/', views.login_view, name='auth'),
    path('logout/', views.logout_view, name='logout'),
]