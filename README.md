# DEO STUDIO CRM

Полнофункциональная CRM-система для управления студией разработки, дизайна, маркетинга и цифровых продуктов.

## 🏗️ Архитектура

```
├── backend/          # Django REST Framework API
├── frontend/         # Next.js 14 (App Router) Web App
├── mobile/           # Flutter Mobile App
├── docker/           # Docker конфигурации
├── architecture/     # Архитектурная документация
└── scripts/          # Утилиты для разработки
```

## 🚀 Быстрый старт

### Требования

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose
- Flutter 3.x (для мобильной разработки)

### 1. Запуск инфраструктуры

```bash
docker compose up -d
# Запускает: PostgreSQL 16, Redis 7, MinIO (S3)
```

### 2. Backend (Django)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements/dev.txt
cp .env.example .env  # Настройте переменные
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 4. Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

## 🛠️ Основные команды

```bash
make dev          # Запустить всё для разработки
make backend      # Запустить backend сервер
make frontend     # Запустить frontend сервер
make migrate      # Применить миграции БД
make test         # Запустить все тесты
make lint         # Проверить код линтером
make docker-up    # Поднять инфраструктуру
make docker-down  # Остановить инфраструктуру
```

## 🧩 Модули

| Модуль | Описание | Статус |
|--------|----------|--------|
| Auth | Аутентификация, роли, права доступа | 🟡 |
| CRM | Управление клиентами | 🟡 |
| Leads | Воронка продаж и лиды | 🟡 |
| Projects | Управление проектами | 🟡 |
| Tasks | Задачи и подзадачи | 🟡 |
| Finance | Финансовый учет | 🔴 |
| Documents | Хранение документов | 🔴 |
| Messenger | Корпоративный мессенджер | 🔴 |
| Analytics | Аналитика и отчеты | 🔴 |
| Cabinet | Клиентский кабинет | 🔴 |
| DEO AI | AI-ассистент | 🔴 |

🟡 = В разработке  🔴 = Не начато  ✅ = Готово

## 📚 Документация

- [Архитектура](ARCHITECTURE.md) — общая архитектура проекта
- [ERD Диаграмма](architecture/erd.md) — схема базы данных
- [Модули](architecture/modules.md) — модульная архитектура
- [API Routes](architecture/api-routes.md) — API маршрутизация
- [Frontend Routes](architecture/frontend-routes.md) — Frontend роутинг
- [API Docs](http://localhost:8000/api/docs/) — Swagger/OpenAPI (локально)

## 🗺️ Роадмап

- **MVP**: Auth, CRM, Leads, Projects, Tasks, Cabinet
- **Релиз 2**: Finance, Documents, Analytics
- **Релиз 3**: Messenger, DEO AI
- **Релиз 4**: Полный функционал + оптимизация

## 🛡️ Лицензия

© 2026 DEO STUDIO. All rights reserved.
