from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0007_practicerecord'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='time_limit',
            field=models.PositiveSmallIntegerField(default=30),
        ),
        migrations.AddField(
            model_name='question',
            name='points',
            field=models.PositiveSmallIntegerField(default=100),
        ),
        migrations.AddField(
            model_name='question',
            name='order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='question',
            name='shuffle_options',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterModelOptions(
            name='question',
            options={'ordering': ['order', 'id']},
        ),
    ]
