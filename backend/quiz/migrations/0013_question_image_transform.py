from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0012_question_explanation'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='image_transform',
            field=models.TextField(blank=True, default=''),
        ),
    ]
