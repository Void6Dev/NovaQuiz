from django.db import models
from django.contrib.auth.models import User

class Quiz(models.Model):
    class Topic(models.TextChoices):
        GENERAL_KNOWLEDGE = 'GK', 'General Knowledge'
        MOVIES = 'MV', 'Movies & TV Shows'
        GAMES = 'VG', 'Video Games'
        MUSIC = 'MU', 'Music'
        SCIENCE = 'SC', 'Science & Nature'
        HISTORY = 'HS', 'History & Culture'
        INTERNET = 'IN', 'Internet & Pop Culture'
        SPORTS = 'SP', 'Sports'
        LITERATURE = 'LT', 'Literature & Language'
        LOGIC = 'LG', 'Logic & Riddles'
        ANIME = 'AN', 'Anime'
        CARTOON = 'CT', 'Cartoons'

    title = models.CharField(max_length=50)
    topic = models.CharField(
        max_length=10,
        choices=Topic.choices,
        default=Topic.GENERAL_KNOWLEDGE,
    )
    description = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to="quiz_images/", null=True, blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_topic_display()})"

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    image = models.ImageField(upload_to="quiz_questions_images/", null=True, blank=True)
    image_url = models.URLField(blank=True, null=True)
    time_limit = models.PositiveSmallIntegerField(default=30)
    points = models.PositiveSmallIntegerField(default=100)
    order = models.PositiveIntegerField(default=0)
    shuffle_options = models.BooleanField(default=False)
    question_type = models.CharField(max_length=10, default='single')
    correct_answer = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['order', 'id']

class Answer(models.Model):
    question = models.ForeignKey(Question, related_name='answers', on_delete=models.CASCADE)
    text = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to="quiz_answers_images/", null=True, blank=True)
    image_url = models.URLField(blank=True, null=True)
    is_correct = models.BooleanField(default=False)


class PracticeRecord(models.Model):
    user  = models.ForeignKey(User, on_delete=models.CASCADE, related_name='practice_records')
    quiz  = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='practice_records')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'quiz')


# ── Profile / Stats ──────────────────────────────────────────────────────────

class UserStat(models.Model):
    """Aggregate stats for a user — updated after every practice session."""
    user             = models.OneToOneField(User, on_delete=models.CASCADE, related_name='stat')
    xp               = models.PositiveIntegerField(default=0)
    streak_current   = models.PositiveIntegerField(default=0)
    streak_longest   = models.PositiveIntegerField(default=0)
    streak_last_date = models.DateField(null=True, blank=True)
    quizzes_played   = models.PositiveIntegerField(default=0)
    correct_total    = models.PositiveIntegerField(default=0)
    questions_total  = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.user.username}: {self.xp} XP, streak {self.streak_current}"


class ActivityEntry(models.Model):
    """One row per user per day — feeds the heatmap."""
    user      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_entries')
    date      = models.DateField()
    xp        = models.PositiveIntegerField(default=0)
    questions = models.PositiveIntegerField(default=0)
    quizzes   = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['date']

    def __str__(self):
        return f"{self.user.username} {self.date}: {self.xp} XP"


class TopicStat(models.Model):
    """Per-user per-topic accuracy — updated after every practice session."""
    user    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topic_stats')
    topic   = models.CharField(max_length=10)
    correct = models.PositiveIntegerField(default=0)
    total   = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('user', 'topic')

    def __str__(self):
        pct = round(self.correct / self.total * 100) if self.total else 0
        return f"{self.user.username} {self.topic}: {pct}%"
