from django.db import models
from django.contrib.auth.models import User

class Permissions(models.TextChoices):
    USER = 'user', 'Пользователь'
    MODER = 'moderator', 'Модератор'

class Account(models.Model):
    image = models.ImageField(upload_to="auth_sys/", null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    birthday_day = models.DateField(null=True, blank=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="account")
    permission = models.CharField(max_length=15,
                                  choices=Permissions.choices,
                                  default=Permissions.USER)
    credits = models.PositiveIntegerField(default=0)
    def __str__(self):
        return self.user.username

class WorkspaceInvitation(models.Model):
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_invitations', null=True, blank=True)
    to_email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=10,
        choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined')],
        default='pending'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True, null=True, blank=True)

    class Meta:
        unique_together = ('from_user', 'to_email')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.from_user.username} → {self.to_email} ({self.status})"
