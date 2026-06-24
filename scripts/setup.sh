#!/bin/bash
set -e

echo "🚀 DEO STUDIO CRM — Установка проекта"
echo "======================================"

# Check prerequisites
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 не установлен. Пожалуйста, установите $1"
        exit 1
    fi
    echo "✅ $1 найден"
}

echo -e "\n📋 Проверка зависимостей..."
check_command python3
check_command node
check_command npm
check_command docker
check_command flutter

# Setup backend
echo -e "\n🐍 Настройка Backend..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements/dev.txt
cp -n .env.example .env 2>/dev/null || echo "   .env уже существует"
cd ..

# Setup frontend
echo -e "\n⚛️  Настройка Frontend..."
cd frontend
npm install
cp -n .env.example .env.local 2>/dev/null || echo "   .env.local уже существует"
cd ..

# Setup mobile
echo -e "\n📱 Настройка Mobile..."
cd mobile
flutter pub get
cd ..

# Setup Docker
echo -e "\n🐳 Запуск Docker инфраструктуры..."
docker compose up -d

# Apply migrations
echo -e "\n🗃️  Применение миграций..."
cd backend
source .venv/bin/activate
python manage.py migrate
cd ..

echo -e "\n✅ Установка завершена!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   MinIO:    http://localhost:9001"
echo "   API Docs: http://localhost:8000/api/docs/"
echo ""
echo "   Создайте суперпользователя: cd backend && python manage.py createsuperuser"
