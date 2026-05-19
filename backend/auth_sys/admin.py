from django.contrib import admin
from .models import Account

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'permission', 'birthday_day')
    list_filter = ('permission',)
