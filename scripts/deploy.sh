#!/bin/bash
set -e

echo "🚀 DEO STUDIO CRM — Деплой"
echo "=========================="

# Build and start production services
echo "🐳 Сборка Docker образов..."
docker compose -f docker-compose.yml build

echo "📦 Запуск production стека..."
docker compose -f docker-compose.yml --profile full up -d

# Wait for services
echo "⏳ Ожидание готовности сервисов..."
sleep 10

# Apply migrations
echo "🗃️  Применение миграций..."
docker compose exec backend python manage.py migrate --settings=config.settings.production

# Collect static files
echo "📁 Сборка статики..."
docker compose exec backend python manage.py collectstatic --noinput --settings=config.settings.production

echo "✅ Деплой завершен!"
echo "   Frontend: https://your-domain.com"
echo "   API:      https://your-domain.com/api/"
echo "   Admin:    https://your-domain.com/admin/"
