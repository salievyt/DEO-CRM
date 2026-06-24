#!/bin/bash
set -e

echo "🔄 Сброс базы данных DEO STUDIO CRM"
echo "===================================="

cd backend

# Activate venv if it exists
if [ -f .venv/bin/activate ]; then
    source .venv/bin/activate
fi

# Drop and recreate database
echo "🗑️  Удаление базы данных..."
python manage.py reset_db --noinput 2>/dev/null || true

echo "📦 Создание миграций..."
python manage.py makemigrations

echo "🗃️  Применение миграций..."
python manage.py migrate

echo "🔧 Создание начальных данных..."
python manage.py create_roles
python manage.py create_default_permissions

echo "✅ База данных сброшена и готова к работе"
echo "   Создайте суперпользователя: python manage.py createsuperuser"
