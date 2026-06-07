from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('hosting', '0005_session_teams'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='last_activity_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
