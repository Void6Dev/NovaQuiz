from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth_sys', '0006_password_reset_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='image_transform',
            field=models.TextField(blank=True, default=''),
        ),
    ]
