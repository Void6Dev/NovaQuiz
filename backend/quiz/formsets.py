from django.forms import modelformset_factory
from .models import Answer
from .forms import AnswerForm

AnswerFormSet = modelformset_factory(Answer, form=AnswerForm, extra=1, can_delete=True)