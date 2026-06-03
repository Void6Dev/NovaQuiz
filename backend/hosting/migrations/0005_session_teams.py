from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hosting', '0004_remove_session_is_active_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='teams_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='SessionTeam',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=30)),
                ('color', models.CharField(default='', max_length=20)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='teams', to='hosting.session')),
            ],
        ),
        migrations.AddField(
            model_name='sessionplayer',
            name='team',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='members', to='hosting.sessionteam'),
        ),
    ]