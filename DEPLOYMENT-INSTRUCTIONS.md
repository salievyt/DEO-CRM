# 🚀 Инструкция по развёртыванию всех сайтов DEO CRM

## 📋 Обзор системы

**Создано 3 полностью рабочих сайта:**

1. **Сайт студии** - DEO Core Codes (Apple дизайн)
2. **Публичный сайт CRM** - DEO CRM (бизнес дизайн)  
3. **Внутренняя CRM** - Существующее приложение

## 🏗️ Архитектура

```
DEO CRM/
├── backend/              ← Django API (работает)
├── frontend/            ← Next.js приложение с 3 сайтами
│   ├── src/app/studio/  ← Сайт студии (Apple дизайн)
│   ├── src/app/crm/     ← Публичный сайт CRM
│   └── src/app/dashboard/ ← Внутренняя CRM
├── mobile/              ← Flutter приложение
└── docker-compose.yml   ← Конфигурация всей системы
```

## 🐳 Развёртывание через Docker

### 1. Запуск всей системы
```bash
# Из корня проекта
cd /Users/sm1le/Desktop/DEO\ CRM

# Запустить все сервисы
docker-compose up --build -d
```

### 2. Проверка запуска
```bash
# Проверить статус контейнеров
docker-compose ps

# Проверить логи
docker-compose logs -f frontend
```

### 3. Доступные сайты

| Сайт | URL | Порт | Описание |
|------|-----|------|----------|
| **Сайт студии** | `http://localhost:3000/studio` | 3000 | DEO Core Codes |
| **Публичный CRM** | `http://localhost:3000/crm` | 3000 | Маркетинговый сайт |
| **Внутренняя CRM** | `http://localhost:3000/dashboard` | 3000 | CRM приложение |
| **Django API** | `http://localhost:8001/api` | 8001 | Бэкенд API |
| **PostgreSQL** | `localhost:5433` | 5433 | База данных |
| **Redis** | `localhost:6379` | 6379 | Кэш и очереди |
| **MinIO** | `http://localhost:9001` | 9001 | Файловое хранилище |

## 🎨 Дизайн-системы

### Apple Design System (сайт студии)
- **Основа:** Анализ Apple дизайна из `Design.md`
- **Цвет:** Action Blue (#0066cc) - единственный акцентный
- **Типографика:** SF Pro Display/Text (Inter для не-Apple)
- **Секции:** Чередование светлых/тёмных тайлов
- **Компоненты:** Кнопки, карточки, навигация, тайлы

### Public CRM Design (публичный сайт)
- **Основа:** Существующая брендовая система
- **Стиль:** Бизнес-ориентированный, конверсионный
- **Элементы:** Чёткие CTA, маркетинговые секции

## 🔧 Технические детали

### Frontend (Next.js 14)
- **Маршруты:** `/studio`, `/crm`, `/dashboard`
- **Дизайн-система:** Tailwind CSS с плагином Apple
- **Компоненты:** React + TypeScript
- **Состояние:** Zustand + React Query
- **API:** Axios клиент к Django

### Backend (Django 5)
- **API:** Django REST Framework
- **База данных:** PostgreSQL 16
- **Кэш:** Redis 7
- **Файлы:** MinIO (S3-совместимое)
- **Аутентификация:** JWT + OAuth2

## 🧪 Тестирование

### Локальное тестирование
```bash
# Проверить все сайты в браузере
open http://localhost:3000/studio
open http://localhost:3000/crm
open http://localhost:3000/dashboard

# Проверить API
curl http://localhost:8001/api/health
```

### Проверка компонентов
1. **/studio** → Apple кнопки, тайлы, навигация
2. **/crm** → Бизнес секции, CTA кнопки
3. **/dashboard** → Существующая CRM (логин required)

## 📊 Мониторинг

### Логи
```bash
# Логи frontend
docker-compose logs frontend

# Логи backend
docker-compose logs backend

# Все логи
docker-compose logs -f
```

### Здоровье системы
```bash
# Проверить все контейнеры
docker-compose ps

# Проверить ресурсы
docker stats
```

## 🔄 Обновление

### Обновление кода
```bash
# Остановить систему
docker-compose down

# Обновить код
git pull origin main

# Перезапустить
docker-compose up --build -d
```

### Обновление зависимостей
```bash
# Обновить frontend зависимости
cd frontend
npm update

# Пересобрать
docker-compose up --build -d frontend
```

## 🐛 Отладка

### Распространённые проблемы

1. **Ошибка порта 3000:**
```bash
# Остановить всё
docker-compose down

# Запустить заново
docker-compose up -d
```

2. **Ошибка импорта CSS:**
- Проверить пути в `studio/layout.tsx` и `crm/layout.tsx`
- Убедиться, что `@/styles/globals.css` существует

3. **Ошибка API:**
```bash
# Проверить backend
docker-compose logs backend

# Проверить базу данных
docker-compose exec postgres psql -U deo_crm_user -d deo_crm
```

### Логирование ошибок
```bash
# Детальные логи frontend
docker-compose logs --tail=100 frontend

# Проверить сборку
docker-compose exec frontend npm run build
```

## 🚀 Продакшн развёртывание

### Настройка доменов
```nginx
# Nginx конфиг
server {
    server_name deocore.codes www.deocore.codes;
    location / {
        proxy_pass http://frontend:3000/studio;
    }
}

server {
    server_name deocrm.com www.deocrm.com;
    location / {
        proxy_pass http://frontend:3000/crm;
    }
}

server {
    server_name app.deocrm.com;
    location / {
        proxy_pass http://frontend:3000/dashboard;
    }
}
```

### Переменные окружения
```env
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.deocrm.com
DJANGO_DEBUG=False
```

### SSL сертификаты
```bash
# Let's Encrypt через certbot
certbot --nginx -d deocore.codes -d deocrm.com -d app.deocrm.com
```

## 📈 Дальнейшее развитие

### Приоритет 1: Контент
- [ ] Проекты портфолио для студии
- [ ] Кейсы CRM для публичного сайта
- [ ] Блог и статьи

### Приоритет 2: Функционал
- [ ] Формы обратной связи
- [ ] Демо-версия CRM
- [ ] Система бронирования консультаций

### Приоритет 3: Оптимизация
- [ ] PWA для мобильных
- [ ] CDN для статики
- [ ] Мониторинг производительности

## 🎯 Итог

**✅ Система готова к работе:**
- 3 независимых сайта на одной Next.js платформе
- Полная интеграция с существующим Django API
- Apple дизайн-система для студии
- Бизнес дизайн для публичного сайта
- Docker-контейнеризация для лёгкого развёртывания

**🚀 Запуск:**
```bash
cd /Users/sm1le/Desktop/DEO\ CRM
docker-compose up --build -d
```

**🌐 Доступ:**
- Сайт студии: `http://localhost:3000/studio`
- Публичный CRM: `http://localhost:3000/crm`
- Внутренняя CRM: `http://localhost:3000/dashboard`