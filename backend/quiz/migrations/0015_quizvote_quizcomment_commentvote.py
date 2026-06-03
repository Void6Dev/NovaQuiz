from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0014_quiz_image_transform'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='QuizVote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.SmallIntegerField()),
                ('quiz', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='quiz.quiz')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_votes', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('quiz', 'user')}},
        ),
        migrations.CreateModel(
            name='QuizComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('body', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('edited_at', models.DateTimeField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_comments', to=settings.AUTH_USER_MODEL)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='quiz.quizcomment')),
                ('quiz', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='quiz.quiz')),
            ],
            options={'ordering': ['created_at']},
        ),
        migrations.CreateModel(
            name='CommentVote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.SmallIntegerField()),
                ('comment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='quiz.quizcomment')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comment_votes', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('comment', 'user')}},
        ),
    ]