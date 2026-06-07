from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0015_quizvote_quizcomment_commentvote'),
    ]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='is_removed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='quiz',
            name='removed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
