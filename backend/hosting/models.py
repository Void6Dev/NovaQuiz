import string, random
from django.db import models
from django.contrib.auth.models import User
from quiz.models import Quiz, Question, Answer


def generate_session_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class Session(models.Model):
    host = models.ForeignKey(User, on_delete=models.CASCADE)
    session = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='sessions')
    created_at = models.DateTimeField(auto_now_add=True)
    time_per_question = models.PositiveSmallIntegerField(default=30)
    max_players = models.PositiveSmallIntegerField(default=10)
    has_started = models.BooleanField(default=False)
    has_ended = models.BooleanField(default=False)
    code = models.CharField(max_length=10, unique=True, default=generate_session_code)
    teams_enabled = models.BooleanField(default=False)

    @property
    def is_active(self):
        return not self.has_ended


class SessionTeam(models.Model):
    session = models.ForeignKey(Session, related_name='teams', on_delete=models.CASCADE)
    name    = models.CharField(max_length=30)
    color   = models.CharField(max_length=20, default='')
    order   = models.PositiveSmallIntegerField(default=0)


class SessionPlayer(models.Model):
    session   = models.ForeignKey(Session, related_name='players', on_delete=models.CASCADE)
    user      = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_kicked = models.BooleanField(default=False)
    score     = models.IntegerField(default=0)
    team      = models.ForeignKey(SessionTeam, null=True, blank=True, on_delete=models.SET_NULL, related_name='members')

    class Meta:
        unique_together = ('session', 'user')
        
        
class PlayerAnswer(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    player = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer = models.ForeignKey(Answer, on_delete=models.CASCADE)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('session', 'player', 'question')
    
