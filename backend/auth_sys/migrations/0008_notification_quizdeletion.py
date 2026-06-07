from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth_sys', '0007_account_image_transform'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('quiz_deleted', 'Quiz deleted by moderator'), ('appeal_received', 'Appeal received'), ('appeal_accepted', 'Appeal accepted'), ('appeal_rejected', 'Appeal rejected')], max_length=20)),
                ('data', models.JSONField(default=dict)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='QuizDeletion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quiz_id', models.IntegerField()),
                ('quiz_title', models.CharField(max_length=255)),
                ('reason', models.TextField()),
                ('deleted_at', models.DateTimeField(auto_now_add=True)),
                ('appeal_text', models.TextField(blank=True, default='')),
                ('appeal_submitted_at', models.DateTimeField(blank=True, null=True)),
                ('appeal_status', models.CharField(choices=[('none', 'No appeal'), ('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')], default='none', max_length=10)),
                ('rejected_at', models.DateTimeField(blank=True, null=True)),
                ('moderator', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='moderated_deletions', to=settings.AUTH_USER_MODEL)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_deletions', to=settings.AUTH_USER_MODEL)),
                ('rejected_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rejected_appeals', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-deleted_at'],
            },
        ),
    ]
