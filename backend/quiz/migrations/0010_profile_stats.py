from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0009_question_type_answer'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserStat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('xp', models.PositiveIntegerField(default=0)),
                ('streak_current', models.PositiveIntegerField(default=0)),
                ('streak_longest', models.PositiveIntegerField(default=0)),
                ('streak_last_date', models.DateField(blank=True, null=True)),
                ('quizzes_played', models.PositiveIntegerField(default=0)),
                ('correct_total', models.PositiveIntegerField(default=0)),
                ('questions_total', models.PositiveIntegerField(default=0)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='stat',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name='ActivityEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('xp', models.PositiveIntegerField(default=0)),
                ('questions', models.PositiveIntegerField(default=0)),
                ('quizzes', models.PositiveIntegerField(default=0)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='activity_entries',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['date'],
                'unique_together': {('user', 'date')},
            },
        ),
        migrations.CreateModel(
            name='TopicStat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('topic', models.CharField(max_length=10)),
                ('correct', models.PositiveIntegerField(default=0)),
                ('total', models.PositiveIntegerField(default=0)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='topic_stats',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'unique_together': {('user', 'topic')},
            },
        ),
    ]
