from django import forms
from .models import Quiz, Answer, Question
class QuizForm(forms.ModelForm):
    class Meta:
        model = Quiz
        fields = ['title', 'topic', 'description', 'image']
        
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'inputs',
                'placeholder': 'Название'
            }),
            'topic': forms.Select(attrs={
                'class': 'inputs',
            }),
            'description': forms.Textarea(attrs={
                'rows': 4,
                'class': 'inputs',
                'placeholder': 'Описание'
            }),
        }


class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ['text', 'image', 'image_url']
        widgets = {
            'text': forms.TextInput(attrs={'class': 'inputs', 'placeholder': 'Введите вопрос(необязательно)'}),
            'image_url': forms.URLInput(attrs={'placeholder': 'Или вставьте ссылку на изображение(https://)'}),
        }



class AnswerForm(forms.ModelForm):
    class Meta:
        model = Answer
        fields = ['text', 'image', 'image_url', 'is_correct']
        widgets = {
            'text': forms.TextInput(attrs={'class': 'inputs', 'placeholder': 'Введите ответ(необязательно)'}),
            'image_url': forms.URLInput(attrs={'placeholder': 'Или вставьте ссылку на изображение(https://)'}),
            'is_correct': forms.CheckboxInput(attrs={'placeholder': 'Правильный'})
        }