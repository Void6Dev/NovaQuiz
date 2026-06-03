from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0013_question_image_transform'),
    ]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='image_transform',
            field=models.TextField(blank=True, default=''),
        ),
    ]
