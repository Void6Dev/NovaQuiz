@echo off
cd /d "%~dp0"

echo [Nova Quiz] checking dependencies...
python -m pip install -r requirements.txt --quiet

echo [Nova Quiz] Applying migrations...
python manage.py migrate --run-syncdb

echo [Nova Quiz]
python manage.py runserver

echo [Nova Quiz] Initialisation on http://127.0.0.1:8000