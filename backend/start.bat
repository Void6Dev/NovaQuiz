@echo off
cd /d "%~dp0"

echo [Nova Quiz] checking dependencies...
python -m pip install -r requirements.txt --quiet

echo [Nova Quiz] Applying migrations...
python manage.py migrate --run-syncdb

python manage.py runserver