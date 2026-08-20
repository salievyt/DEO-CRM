# Архитектура веб-сайтов DEO CRM

## 🎯 Обзор

В проекте реализована мульти-сайтовая архитектура на Next.js 14 с тремя независимыми сайтами:

1. **Сайт студии** (`/(studio)`) — DEO Core Codes (www_deo_core_codes)
2. **Публичный сайт CRM** (`/(public)`) — маркетинговый сайт DEO CRM
3. **Внутренняя CRM** (`/(dashboard)`) — существующее приложение для сотрудников

## 📁 Структура проекта

```
frontend/src/app/
├── studio/               ← Сайт студии (Apple дизайн)
│   ├── page.tsx          ← Главная страница
│   ├── layout.tsx        ← Лейаут студии
│   ├── projects/         ← Портфолио проектов
│   ├── services/         ← Услуги студии
│   └── about/            ← О студии
│
├── crm/                  ← Публичный сайт CRM
│   ├── page.tsx          ← Лендинг
│   ├── layout.tsx        ← Лейаут CRM
│   ├── features/         ← Возможности CRM
│   ├── pricing/          ← Тарифы
│   ├── blog/             ← Блог
│   └── demo/             ← Демо-версия
│
├── (dashboard)/          ← Внутренняя CRM (существующая)
│   ├── layout.tsx        ← Лейаут дашборда
│   ├── clients/          ← Клиенты
│   ├── projects/         ← Проекты
│   ├── tasks/            ← Задачи
│   └── analytics/        ← Аналитика
│
├── shared/               ← Общие ресурсы
│   ├── ui/apple/         ← Apple дизайн-система
│   ├── ui/public/        ← Публичные компоненты
│   ├── config/           ← Конфигурации
│   └── lib/              ← Общие утилиты
│
├── page.tsx             ← Корневая страница (редирект на /crm)
└── middleware.ts        ← Обработка маршрутов
```

## 🎨 Дизайн-системы

### 1. Apple Design System (для сайта студии)

**Особенности:**
- Вдохновлён дизайном Apple (анализ из `Design.md`)
- Минималистичный, фотографический подход
- Акцент на типографику и белое пространство
- Единственный акцентный цвет: Action Blue (#0066cc)

**Компоненты:**
- `AppleButton` — кнопки в стиле Apple (primary, secondary-pill, dark-utility)
- `AppleProductTile` — полноразмерные тайлы (light/dark/parchment)
- `AppleGlobalNav` / `AppleSubNav` — навигация Apple-стиля
- `AppleStoreCard` — карточки продуктов/услуг
- `AppleConfiguratorChip` — чипы для конфигураторов

**Токены:**
- Цвета: `appleColors` (Action Blue, parchment, tile-1, tile-2, etc.)
- Типографика: `appleTypography` (SF Pro Display/Text)
- Отступы: `appleSpacing` (xxs, xs, sm, md, lg, xl, xxl, section)
- Радиусы: `appleRounded` (none, xs, sm, md, lg, pill, full)

### 2. Public CRM Design System

**Особенности:**
- Более традиционный бизнес-дизайн
- Акцент на конверсию и ясность
- Градиенты и тени для глубины
- Брендовые цвета из существующей CRM

**Компоненты:**
- Использует существующие компоненты Radix UI
- Бизнес-ориентированные карточки и секции
- Четкие призывы к действию

## 🔧 Техническая реализация

### Tailwind Configuration

Проект использует расширяемую конфигурацию Tailwind:

```typescript
// Основной конфиг (tailwind.config.ts)
import appleDesignConfig from "./tailwind.apple";

export default {
  ...appleDesignConfig,  // Apple дизайн-система
  theme: {
    extend: {
      colors: {
        // Существующие брендовые цвета
        brand: { ... },
        // Apple цвета добавляются через плагин
      },
      // ... существующие настройки
    }
  }
}
```

### Маршрутизация

Next.js App Router с группировкой маршрутов:

```typescript
// app/page.tsx - корневой редирект
export default function RootPage() {
  // По умолчанию редирект на публичный сайт
  redirect("/(public)");
  
  // Для студии: redirect("/(studio)")
  // Для дашборда: redirect("/dashboard")
}
```

### Интеграция с бэкендом

Все три сайта используют один Django API:

1. **Сайт студии** → публичные эндпоинты (портфолио, контакты)
2. **Публичный сайт** → публичные эндпоинты (blog, pricing, demo)
3. **Внутренняя CRM** → защищенные эндпоинты (клиенты, проекты, задачи)

## 🚀 Запуск и разработка

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Открыть сайты:
# - Сайт студии: http://localhost:3000/(studio)
# - Публичный сайт: http://localhost:3000/(public)
# - Внутренняя CRM: http://localhost:3000/dashboard
```

### Сборка для продакшена

```bash
# Сборка проекта
npm run build

# Запуск продакшн сервера
npm run start
```

### Переменные окружения

```env
# Основные настройки
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_ENV=development

# Для сайта студии
NEXT_PUBLIC_STUDIO_DOMAIN=deocore.codes
NEXT_PUBLIC_STUDIO_CONTACT_EMAIL=hello@deocore.codes

# Для публичного сайта CRM
NEXT_PUBLIC_CRM_DOMAIN=deocrm.com
NEXT_PUBLIC_DEMO_URL=/demo
```

## 📱 Адаптивность

### Apple Design Breakpoints
- Desktop: ≥ 1440px (контент фиксирован на 1440px)
- Small Desktop: 1024–1440px
- Tablet: 834–1023px
- Large Phone: 641–833px
- Phone: 420–640px
- Small Phone: ≤ 419px

### Public CRM Breakpoints
- Desktop: ≥ 1280px
- Laptop: 1024–1279px
- Tablet: 768–1023px
- Mobile: < 768px

## 🔗 Интеграции

### Сайт студии
- Email формы (hello@deocore.codes)
- Соц. сети (Dribbble, Behance, GitHub)
- Чат поддержки (Telegram/WhatsApp)
- Галерея проектов (интеграция с бэкендом)

### Публичный сайт CRM
- Формы заявок на демо
- Интеграция с платежной системой
- Email рассылка (Mailchimp/SendGrid)
- Чат поддержки (Intercom/Crisp)

### Общие интеграции
- Google Analytics / Яндекс.Метрика
- Hotjar для аналитики поведения
- Sentry для мониторинга ошибок

## 🧪 Тестирование

```bash
# Запуск тестов
npm run test

# Проверка типов
npm run typecheck

# Линтинг
npm run lint

# Форматирование
npm run format
```

## 📊 Аналитика и SEO

### Сайт студии
- Фокус на визуальную эстетику
- Портфолио с метаданными
- Open Graph разметка для соц. сетей
- Минималистичная структура для быстрой загрузки

### Публичный сайт CRM
- SEO-оптимизированный контент
- Структурированные данные (Schema.org)
- Страницы с высоким конверсионным потенциалом
- Блог с полезным контентом

## 🔄 Деплой

### Статический хостинг (Vercel/Netlify)
```bash
# Настройка Vercel
vercel --prod

# Настройка доменов:
# - studio.deocrm.com → (studio) route group
# - deocrm.com → (public) route group
# - app.deocrm.com → (dashboard) route group
```

### Docker развертывание
```bash
# Сборка образа
docker build -t deo-crm-frontend .

# Запуск контейнера
docker run -p 3000:3000 deo-crm-frontend
```

## 🎯 Дальнейшее развитие

### Планируемые фичи:
1. **Сайт студии**
   - Интерактивное портфолио с фильтрами
   - Блог о дизайне и разработке
   - Калькулятор стоимости проектов
   - Система бронирования консультаций

2. **Публичный сайт CRM**
   - Интерактивная демо-версия
   - Система отзывов клиентов
   - Вебинары и обучающие материалы
   - Партнерская программа

3. **Общие улучшения**
   - Многоязычность (i18n)
   - Темная тема
   - PWA для мобильных устройств
   - Оптимизация производительности

## 📞 Поддержка

Для вопросов и поддержки:
- Email: dev@deocrm.com
- Документация: /docs
- GitHub Issues: для багов и запросов функций