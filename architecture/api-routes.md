# DEO STUDIO CRM — API Маршрутизация (Backend)

## 📡 Общая структура API

```
Base URL: /api/v1/
Авторизация: JWT Bearer Token (Authorization: Bearer <token>)
Формат: JSON (application/json)
Пагинация: ?page=1&page_size=20
Поиск: ?search=<term>
Сортировка: ?ordering=<field> (префикс - для обратной сортировки)
Фильтрация: ?field__lookup=<value>
```

---

## 🔐 1. Аутентификация (Accounts)

### Public Endpoints

| Метод | URL | Описание | Тело запроса |
|-------|-----|----------|-------------|
| POST | `/api/v1/auth/login/` | Вход в систему | `{ email, password }` |
| POST | `/api/v1/auth/register/` | Регистрация | `{ email, password, first_name, last_name }` |
| POST | `/api/v1/auth/refresh/` | Обновление токена | `{ refresh }` |
| POST | `/api/v1/auth/verify-email/` | Подтверждение email | `{ token }` |
| POST | `/api/v1/auth/password-reset/` | Сброс пароля | `{ email }` |
| POST | `/api/v1/auth/password-reset/confirm/` | Подтверждение сброса | `{ token, password }` |

### Protected Endpoints (Authenticated)

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/auth/me/` | Профиль текущего пользователя | All |
| PATCH | `/api/v1/auth/me/` | Обновление своего профиля | All |
| POST | `/api/v1/auth/change-password/` | Смена пароля | All |
| POST | `/api/v1/auth/logout/` | Выход (blacklist токена) | All |
| POST | `/api/v1/auth/2fa/enable/` | Включение 2FA | All |
| POST | `/api/v1/auth/2fa/verify/` | Подтверждение 2FA | All |
| POST | `/api/v1/auth/2fa/disable/` | Отключение 2FA | All |

### Users Management (Admin/Manager)

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/users/` | Список пользователей | admin, owner, pm |
| POST | `/api/v1/users/` | Создать пользователя | admin |
| GET | `/api/v1/users/{id}/` | Детали пользователя | admin, owner |
| PATCH | `/api/v1/users/{id}/` | Обновить пользователя | admin |
| DELETE | `/api/v1/users/{id}/` | Удалить пользователя | admin |
| POST | `/api/v1/users/{id}/activate/` | Активировать | admin |
| POST | `/api/v1/users/{id}/deactivate/` | Деактивировать | admin |

### Roles & Permissions (Admin)

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/roles/` | Список ролей | admin |
| POST | `/api/v1/roles/` | Создать роль | admin |
| PATCH | `/api/v1/roles/{id}/` | Обновить роль | admin |
| DELETE | `/api/v1/roles/{id}/` | Удалить роль | admin |
| GET | `/api/v1/permissions/` | Список разрешений | admin |
| POST | `/api/v1/users/{id}/assign-role/` | Назначить роль | admin |
| POST | `/api/v1/users/{id}/remove-role/` | Удалить роль | admin |

---

## 👥 2. CRM — Клиенты (Clients)

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/clients/` | Список клиентов | admin, owner, pm |
| POST | `/api/v1/clients/` | Создать клиента | admin, pm |
| GET | `/api/v1/clients/{id}/` | Детали клиента | admin, owner, pm |
| PATCH | `/api/v1/clients/{id}/` | Обновить клиента | admin, pm |
| DELETE | `/api/v1/clients/{id}/` | Удалить клиента | admin |
| GET | `/api/v1/clients/search/` | Поиск клиентов | admin, pm, owner |
| GET | `/api/v1/clients/stats/` | Статистика по клиентам | admin, owner |

### Теги клиентов

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/client-tags/` | Список тегов | All |
| POST | `/api/v1/client-tags/` | Создать тег | admin, pm |
| DELETE | `/api/v1/client-tags/{id}/` | Удалить тег | admin |
| POST | `/api/v1/clients/{id}/tags/` | Добавить тег клиенту | admin, pm |
| DELETE | `/api/v1/clients/{id}/tags/{tag_id}/` | Удалить тег у клиента | admin, pm |

### Взаимодействия с клиентом

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/clients/{id}/interactions/` | История взаимодействий | admin, pm |
| POST | `/api/v1/clients/{id}/interactions/` | Добавить взаимодействие | admin, pm |

### Параметры фильтрации списка клиентов

```
GET /api/v1/clients/?search=John&ordering=-created_at&tag=design&source=website
GET /api/v1/clients/?created_after=2024-01-01&created_before=2024-12-31
GET /api/v1/clients/?min_revenue=10000&max_revenue=500000
```

---

## 📈 3. Лиды и продажи (Leads)

### Этапы воронки

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/lead-stages/` | Список этапов | All |
| POST | `/api/v1/lead-stages/` | Создать этап | admin |
| PATCH | `/api/v1/lead-stages/{id}/` | Обновить этап | admin |
| DELETE | `/api/v1/lead-stages/{id}/` | Удалить этап | admin |
| POST | `/api/v1/lead-stages/reorder/` | Изменить порядок | admin |

### Лиды

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/leads/` | Список лидов | admin, owner, pm |
| POST | `/api/v1/leads/` | Создать лид | admin, pm |
| GET | `/api/v1/leads/{id}/` | Детали лида | admin, pm |
| PATCH | `/api/v1/leads/{id}/` | Обновить лид | admin, pm |
| DELETE | `/api/v1/leads/{id}/` | Удалить лид | admin |
| GET | `/api/v1/leads/kanban/` | Kanban-доска со всеми этапами | admin, pm |
| POST | `/api/v1/leads/{id}/move/` | Переместить на этап | admin, pm |
| POST | `/api/v1/leads/{id}/convert/` | Конвертировать в клиента | admin, pm |
| GET | `/api/v1/leads/stats/` | Статистика воронки | admin, owner |

### Фильтры для лидов

```
GET /api/v1/leads/?stage=new_lead&assigned_to={user_id}&source=website
GET /api/v1/leads/?min_budget=50000&max_budget=500000
GET /api/v1/leads/?created_after=2024-01-01&search=company_name
```

---

## 📋 4. Проекты (Projects)

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/projects/` | Список проектов | admin, owner, pm |
| POST | `/api/v1/projects/` | Создать проект | admin, pm |
| GET | `/api/v1/projects/{id}/` | Детали проекта | admin, pm, team, client* |
| PATCH | `/api/v1/projects/{id}/` | Обновить проект | admin, pm |
| DELETE | `/api/v1/projects/{id}/` | Удалить проект | admin |
| GET | `/api/v1/projects/{id}/timeline/` | Таймлайн/Gantt проекта | admin, pm |

### Команда проекта

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/projects/{id}/team/` | Список участников | admin, pm, team |
| POST | `/api/v1/projects/{id}/team/` | Добавить участника | admin, pm |
| DELETE | `/api/v1/projects/{id}/team/{user_id}/` | Удалить участника | admin, pm |
| PATCH | `/api/v1/projects/{id}/team/{user_id}/` | Изменить роль в проекте | admin, pm |

### Типы услуг

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/service-types/` | Список услуг | All |
| POST | `/api/v1/service-types/` | Создать услугу | admin |

### Статусы проектов

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/project-statuses/` | Список статусов | All |

### Фильтры проектов

```
GET /api/v1/projects/?status=development&client={client_id}&service_type=web_dev
GET /api/v1/projects/?team_member={user_id}&budget_min=100000
GET /api/v1/projects/?deadline_before=2024-12-31&deadline_after=2024-01-01
```

---

## ✅ 5. Задачи (Tasks)

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/tasks/` | Список задач | All (свои + по проекту) |
| POST | `/api/v1/tasks/` | Создать задачу | admin, pm |
| GET | `/api/v1/tasks/{id}/` | Детали задачи | All (участники) |
| PATCH | `/api/v1/tasks/{id}/` | Обновить задачу | admin, pm, assignee |
| DELETE | `/api/v1/tasks/{id}/` | Удалить задачу | admin, pm |
| POST | `/api/v1/tasks/{id}/change-status/` | Сменить статус | All (участники) |
| POST | `/api/v1/tasks/{id}/assign/` | Назначить исполнителя | admin, pm |
| GET | `/api/v1/tasks/kanban/` | Kanban-доска задач | All |
| GET | `/api/v1/tasks/my/` | Мои задачи | All |
| GET | `/api/v1/tasks/upcoming/` | Предстоящие задачи (дедлайн < 3 дней) | All |

### Комментарии к задачам

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/tasks/{id}/comments/` | Список комментариев | All (участники) |
| POST | `/api/v1/tasks/{id}/comments/` | Добавить комментарий | All (участники) |
| DELETE | `/api/v1/tasks/{id}/comments/{comment_id}/` | Удалить комментарий | admin, автор |

### Таймер задач

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| POST | `/api/v1/tasks/{id}/timer/start/` | Запустить таймер | assignee |
| POST | `/api/v1/tasks/{id}/timer/stop/` | Остановить таймер | assignee |
| POST | `/api/v1/tasks/{id}/timer/pause/` | Пауза | assignee |
| GET | `/api/v1/tasks/{id}/timer/logs/` | История таймера | admin, pm, assignee |

### Фильтры задач

```
GET /api/v1/tasks/?project={project_id}&assignee={user_id}&status=in_progress
GET /api/v1/tasks/?priority=high&deadline_before=2024-12-31
GET /api/v1/tasks/?created_after=2024-01-01&search=keyword
```

---

## 💰 6. Финансы (Finance)

### Счета

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/invoices/` | Список счетов | admin, owner, pm |
| POST | `/api/v1/invoices/` | Создать счет | admin, pm |
| GET | `/api/v1/invoices/{id}/` | Детали счета | admin, owner, pm, client* |
| PATCH | `/api/v1/invoices/{id}/` | Обновить счет | admin, pm |
| DELETE | `/api/v1/invoices/{id}/` | Удалить счет | admin |
| GET | `/api/v1/invoices/{id}/pdf/` | Скачать PDF счета | admin, pm, client* |
| POST | `/api/v1/invoices/{id}/send/` | Отправить клиенту | admin, pm |
| POST | `/api/v1/invoices/{id}/mark-paid/` | Отметить оплаченным | admin, owner |

### Платежи

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/payments/` | Список платежей | admin, owner |
| POST | `/api/v1/payments/` | Зарегистрировать платеж | admin, owner |
| GET | `/api/v1/invoices/{id}/payments/` | Платежи по счету | admin, owner, pm |

### Расходы

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/expenses/` | Список расходов | admin, owner |
| POST | `/api/v1/expenses/` | Создать расход | admin, owner |
| PATCH | `/api/v1/expenses/{id}/` | Обновить расход | admin |
| DELETE | `/api/v1/expenses/{id}/` | Удалить расход | admin |
| GET | `/api/v1/expense-categories/` | Категории расходов | All |

### Зарплаты

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/salaries/` | Список зарплат | admin, owner |
| POST | `/api/v1/salaries/` | Начислить зарплату | admin, owner |
| GET | `/api/v1/salaries/{user_id}/history/` | История по сотруднику | admin, owner |

### Финансовые отчеты

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/finance/reports/` | Финансовые отчеты | admin, owner |
| GET | `/api/v1/finance/reports/profit-by-project/` | Прибыль по проектам | admin, owner |
| GET | `/api/v1/finance/reports/profit-by-period/` | Прибыль за период | admin, owner |
| GET | `/api/v1/finance/reports/summary/` | Сводка (доходы/расходы/прибыль) | admin, owner |

### Фильтры финансов

```
GET /api/v1/invoices/?project={project_id}&client={client_id}&status=paid
GET /api/v1/invoices/?issued_after=2024-01-01&issued_before=2024-12-31
GET /api/v1/expenses/?category=software&project={project_id}&date_after=2024-01-01
GET /api/v1/salaries/?month=12&year=2024&user={user_id}
```

---

## 📄 7. Документы (Documents)

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/documents/` | Список документов | All (по доступу) |
| POST | `/api/v1/documents/` | Загрузить документ | admin, pm |
| GET | `/api/v1/documents/{id}/` | Детали документа | All (по доступу) |
| PATCH | `/api/v1/documents/{id}/` | Обновить документ | admin, pm |
| DELETE | `/api/v1/documents/{id}/` | Удалить документ | admin |
| GET | `/api/v1/documents/{id}/download/` | Скачать файл | All (по доступу) |
| GET | `/api/v1/document-types/` | Типы документов | All |
| GET | `/api/v1/document-templates/` | Шаблоны документов | admin, pm |
| POST | `/api/v1/documents/generate/` | Сгенерировать из шаблона | admin, pm |

### Фильтры

```
GET /api/v1/documents/?project={project_id}&client={client_id}&type=contract
GET /api/v1/documents/?status=draft&created_by={user_id}
```

---

## 💬 8. Мессенджер (Messenger)

### Чаты

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/chats/` | Список чатов | All (свои) |
| POST | `/api/v1/chats/` | Создать чат | All |
| GET | `/api/v1/chats/{id}/` | Детали чата | All (участники) |
| PATCH | `/api/v1/chats/{id}/` | Обновить чат | admin, создатель |
| DELETE | `/api/v1/chats/{id}/` | Удалить чат | admin, создатель |
| POST | `/api/v1/chats/{id}/add-participant/` | Добавить участника | admin, создатель |
| POST | `/api/v1/chats/{id}/remove-participant/` | Удалить участника | admin, создатель |
| GET | `/api/v1/chats/{id}/unread-count/` | Непрочитанные сообщения | All (участники) |

### Сообщения

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/chats/{id}/messages/` | История сообщений | All (участники) |
| POST | `/api/v1/chats/{id}/messages/` | Отправить сообщение | All (участники) |
| PATCH | `/api/v1/messages/{id}/` | Редактировать | автор |
| DELETE | `/api/v1/messages/{id}/` | Удалить сообщение | admin, автор |
| POST | `/api/v1/messages/{id}/read/` | Отметить прочитанным | All |
| POST | `/api/v1/messages/{id}/react/` | Добавить реакцию | All |

### WebSocket Events

```
ws://host/ws/chat/{chat_id}/        — Подключение к чату
ws://host/ws/notifications/         — Уведомления пользователя

Events:
- New message:    {"type": "message", "data": {...}}
- Typing:         {"type": "typing", "user": {id, name}}
- Read receipt:   {"type": "read", "message_id": "..."}
- Notification:   {"type": "notification", "data": {...}}
```

---

## 📊 9. Аналитика (Analytics)

### Дашборды

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/analytics/dashboard/` | Главный дашборд | admin, owner |
| GET | `/api/v1/analytics/dashboard/{id}/` | Кастомный дашборд | owner, admin |
| POST | `/api/v1/analytics/dashboard/` | Создать дашборд | admin, owner |
| PATCH | `/api/v1/analytics/dashboard/{id}/` | Настроить дашборд | admin, owner |

### Метрики

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/analytics/metrics/` | Все метрики | admin, owner |
| GET | `/api/v1/analytics/metrics/summary/` | Ключевые показатели | admin, owner |
| GET | `/api/v1/analytics/metrics/sales/` | Метрики продаж | admin, owner, pm |
| GET | `/api/v1/analytics/metrics/finance/` | Финансовые метрики | admin, owner |
| GET | `/api/v1/analytics/metrics/projects/` | Метрики проектов | admin, owner, pm |
| GET | `/api/v1/analytics/metrics/tasks/` | Метрики задач | admin, pm |

### Отчеты

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/analytics/reports/` | Список отчетов | admin, owner |
| POST | `/api/v1/analytics/reports/generate/` | Сгенерировать отчет | admin, owner |
| GET | `/api/v1/analytics/reports/{id}/download/` | Скачать отчет | admin, owner |

### Параметры метрик

```
GET /api/v1/analytics/metrics/summary/?period=month    # За месяц
GET /api/v1/analytics/metrics/sales/?from=2024-01-01&to=2024-12-31
```

---

## 🏠 10. Клиентский кабинет (Cabinet)

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| GET | `/api/v1/cabinet/dashboard/` | Главная клиентского кабинета | client |
| GET | `/api/v1/cabinet/projects/` | Мои проекты | client |
| GET | `/api/v1/cabinet/projects/{id}/` | Детали проекта | client |
| GET | `/api/v1/cabinet/tasks/` | Мои задачи по проектам | client |
| GET | `/api/v1/cabinet/documents/` | Мои документы | client |
| GET | `/api/v1/cabinet/documents/{id}/download/` | Скачать документ | client |
| GET | `/api/v1/cabinet/invoices/` | Мои счета | client |
| GET | `/api/v1/cabinet/invoices/{id}/` | Детали счета | client |
| GET | `/api/v1/cabinet/invoices/{id}/pdf/` | Скачать PDF счета | client |
| GET | `/api/v1/cabinet/payments/` | История платежей | client |
| GET | `/api/v1/cabinet/messages/` | Переписка с менеджером | client |
| POST | `/api/v1/cabinet/messages/` | Отправить сообщение менеджеру | client |
| POST | `/api/v1/cabinet/projects/{id}/comment/` | Оставить комментарий по проекту | client |
| POST | `/api/v1/cabinet/projects/{id}/approve/` | Согласовать этап | client |

---

## 🤖 11. DEO AI

| Метод | URL | Описание | Роль |
|-------|-----|----------|------|
| POST | `/api/v1/ai/generate/tz/` | Сгенерировать ТЗ | admin, pm |
| POST | `/api/v1/ai/generate/proposal/` | Сгенерировать КП | admin, pm |
| POST | `/api/v1/ai/generate/contract/` | Сгенерировать договор | admin, pm |
| POST | `/api/v1/ai/generate/report/` | Сгенерировать отчет | admin, owner, pm |
| POST | `/api/v1/ai/generate/summary/` | Суммаризировать переписку | admin, pm |
| POST | `/api/v1/ai/generate/estimate/` | Оценить стоимость проекта | admin, pm |
| POST | `/api/v1/ai/generate/respond/` | Подготовить ответ клиенту | pm |
| GET | `/api/v1/ai/history/` | История AI запросов | admin, pm |
| GET | `/api/v1/ai/templates/` | Шаблоны промптов | admin |
| PATCH | `/api/v1/ai/templates/{id}/` | Обновить шаблон | admin |

### Тело AI запроса

```json
{
  "project_id": "uuid",
  "client_id": "uuid (optional)",
  "template_id": "uuid (optional)",
  "variables": {
    "project_name": "DEO CRM",
    "client_name": "Иван Иванов",
    "budget": "500000",
    "deadline": "3 месяца",
    "tech_stack": "React, Django, PostgreSQL",
    "description": "Разработка CRM-системы..."
  }
}
```

---

## 📋 Сводка API

| Модуль | Endpoints | Public | Protected | Admin Only |
|--------|-----------|--------|-----------|------------|
| Auth | 12 | 6 | 6 | 0 |
| Users | 10 | 0 | 0 | 10 |
| Roles | 7 | 0 | 0 | 7 |
| Clients | 12 | 0 | 10 | 2 |
| Leads | 11 | 0 | 9 | 2 |
| Projects | 10 | 0 | 9 | 1 |
| Tasks | 17 | 0 | 16 | 1 |
| Finance | 18 | 0 | 14 | 4 |
| Documents | 9 | 0 | 7 | 2 |
| Messenger | 15 | 0 | 15 | 0 |
| Analytics | 12 | 0 | 8 | 4 |
| Cabinet | 14 | 0 | 14 | 0 |
| AI | 8 | 0 | 7 | 1 |
| **Total** | **155** | **6** | **107** | **42** |
