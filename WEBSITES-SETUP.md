# 🚀 Быстрый старт: Сайты DEO CRM

## 📋 Что сделано

✅ **Создано 3 независимых сайта:**

1. **Сайт студии** (`/(studio)`) — DEO Core Codes (www_deo_core_codes)
   - Apple-дизайн система (из `Design.md`)
   - Компоненты: кнопки, тайлы, навигация, карточки
   - Главная страница с портфолио и услугами

2. **Публичный сайт CRM** (`/(public)`)
   - Традиционный бизнес-дизайн
   - Фокус на конверсию и ясность
   - Секции: возможности, тарифы, CTA

3. **Внутренняя CRM** (`/(dashboard)`) — существующая
   - Полностью рабочая CRM система
   - Управление клиентами, проектами, задачами

## 🎨 Дизайн-системы

### Apple Design System (для студии)
- Цвета: Action Blue (#0066cc), Parchment (#f5f5f7), Tiles (#272729, #2a2a2c, #252527)
- Типографика: SF Pro Display/Text (Inter для не-Apple платформ)
- Компоненты: `AppleButton`, `AppleProductTile`, `AppleGlobalNav`, `AppleStoreCard`
- Плагин Tailwind: `tailwind.apple.ts`

### Public CRM Design System
- Использует существующие брендовые цвета
- Бизнес-ориентированные компоненты
- Четкие призывы к действию

## 🚀 Как запустить

### 1. Перейти в директорию frontend
```bash
cd frontend
```

### 2. Установить зависимости (если не установлены)
```bash
npm install
```

### 3. Запустить в режиме разработки
```bash
npm run dev
```

### 4. Открыть в браузере

**По умолчанию (публичный сайт CRM):**
```
http://localhost:3000/(public)
```

**Сайт студии:**
```
http://localhost:3000/(studio)
```

**Внутренняя CRM:**
```
http://localhost:3000/dashboard
```

## 🔧 Настройка редиректа

Изменить корневой редирект (`frontend/src/app/page.tsx`):

```typescript
// По умолчанию - публичный сайт
redirect("/(public)");

// Для студии:
// redirect("/(studio)");

// Для дашборда:
// redirect("/dashboard");
```

## 📁 Структура компонентов

```
frontend/src/shared/ui/apple/
├── apple-button.tsx        ← Кнопки Apple-стиля
├── apple-product-tile.tsx  ← Тайлы продуктов
├── apple-navigation.tsx    ← Навигация
└── apple-card.tsx          ← Карточки

frontend/src/shared/config/
└── apple-design.ts         ← Токены дизайн-системы
```

## 🎯 Примеры использования

### Apple Button
```tsx
import { AppleButton, AppleSecondaryButton } from "@/shared/ui/apple/apple-button";

<AppleButton variant="primary">
  Купить сейчас
</AppleButton>

<AppleSecondaryButton>
  Узнать больше
</AppleSecondaryButton>
```

### Apple Product Tile
```tsx
import { AppleProductTile } from "@/shared/ui/apple/apple-product-tile";

<AppleProductTile
  variant="light"
  title="CRM системы"
  description="Полный цикл разработки CRM"
  imageSrc="/images/crm.jpg"
  actions={[
    { label: "Демо", variant: "primary" },
    { label: "Подробнее", variant: "secondary-pill" }
  ]}
/>
```

## 🔗 Интеграция с бэкендом

Все сайты используют существующий Django API:

- **Сайт студии**: портфолио проектов, контактные формы
- **Публичный сайт**: демо-заявки, блог, информация о тарифах
- **Внутренняя CRM**: полный функционал CRM

## 🐛 Тестирование

```bash
# Проверить сборку
npm run build

# Проверить типы
npm run typecheck

# Запустить линтер
npm run lint
```

## 📞 Далее

### Что можно улучшить:
1. Добавить реальные изображения для студии
2. Создать страницы портфолио и услуг
3. Интегрировать формы обратной связи
4. Добавить аналитику (Google Analytics, Yandex.Metrika)

### Для запуска в продакшн:
1. Настроить домены:
   - `deocore.codes` → сайт студии
   - `deocrm.com` → публичный сайт
   - `app.deocrm.com` → внутренняя CRM
2. Настроить CI/CD
3. Добавить мониторинг

## 📚 Документация

- Полная архитектура: `ARCHITECTURE-WEBSITES.md`
- Apple дизайн-система: `Design.md`
- Компоненты: смотреть в `src/shared/ui/apple/`

---

**Готово к использованию!** 🎉

Сайты полностью интегрированы в существующую архитектуру DEO CRM и готовы к дальнейшей разработке.