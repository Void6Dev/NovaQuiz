from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0008_question_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='question_type',
            field=models.CharField(max_length=10, default='single'),
        ),
        migrations.AddField(
            model_name='question',
            name='correct_answer',
            field=models.TextField(blank=True, default=''),
        ),
    ]
