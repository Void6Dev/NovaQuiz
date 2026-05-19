from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import AuthenticationForm

class RegisterForm(forms.ModelForm):
    username = forms.CharField(
        label='Логин',
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Логин',
        }))
    password = forms.CharField(
        label='Пароль', 
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'Пароль',
            'autocomplete': 'new-password',
            'type' : 'text'
        }))
    email = forms.CharField(
        label='Почта',
        widget=forms.TextInput(attrs={
        'class': 'form-input',
        'placeholder': 'Почта',
        'autocomplete': 'email',
        'type': 'email'
    })
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password']

class LoginForm(AuthenticationForm):
    username = forms.CharField(
        label='Логин',
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Логин',
        })
    )
    password = forms.CharField(
        label='Пароль',
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'Пароль',
            'autocomplete': 'new-password',
            'type' : 'text'
        })
    )
