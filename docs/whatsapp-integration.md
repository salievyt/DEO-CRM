# WhatsApp Business Integration (DEO CRM)

Полноценная интеграция DEO CRM с **WhatsApp Business Cloud API** (официальный
Graph API от Meta). Никакого WhatsApp Web, Selenium, Puppeteer или QR-авторизации.

Менеджер общается с клиентами прямо из раздела **Inbox** (/inbox): входящие
сообщения клиентов появляются автоматически, исходящие доставляются через API.

---

## 1. Что реализовано

| Блок | Описание |
|---|---|
| `apps/messaging` | Отдельный messaging-модуль (модели, сервисы, webhook, API, realtime) |
| `Conversation` | Диалог клиент↔канал, статусы open/pending/closed, unread_count, назначение менеджера |
| `Message` | Универсальная модель сообщений: канал, направление, тип, статус, `external_message_id`, metadata |
| `WhatsAppAccount` | Подключённые WABA-аккаунты, токен зашифрован (`signing` + `SECRET_KEY`), в API не отдаётся |
| `WhatsAppService` | Единственная точка HTTP-взаимодействия с Graph API: timeout, retry, маппинг ошибок, structured logging |
| Webhook | `GET/POST /api/v1/webhooks/whatsapp/` — верификация Meta, обработка входящих, статусов, медиа; идемпотентность по `external_message_id` |
| Realtime | Django Channels `ws/inbox/`: `message.created`, `message.status.updated`, `conversation.created`, `conversation.updated` |
| Inbox UI | Список диалогов, фильтры (Все/Непрочитанные/Мои/WhatsApp/Закрытые), поиск, чат со статусами (✓, ✓✓, ✓✓ прочитано, ⚠), файлы, шаблоны, назначение, realtime |
| Карточка клиента | Вкладка «WhatsApp»: номер, статус, диалоги, история, кнопки «Начать диалог» / «Открыть чат» |
| Conversation window | Эвристика 24-часового окна + подсказка выбора approved-шаблона; при ошибке API `131026` UI сам предлагает шаблон |

## 2. Структура модуля

```
backend/apps/messaging/
├── models/            # enums.py, account.py, conversation.py, message.py
├── serializers/       # account.py, conversation.py, message.py
├── views/             # conversations.py, messages.py, accounts.py, templates.py
├── services/          # base.py (ошибки), whatsapp.py (Graph API), conversations.py, realtime.py, templates.py
├── webhooks/          # whatsapp.py (верификация + обработка)
├── consumers.py       # InboxConsumer (WS)
├── websocket_auth.py  # JWT-аутентификация WebSocket
├── ratelimit.py       # DRF-friendly rate limiting
├── permissions.py     # IsInboxStaff (superadmin, owner, project_manager, marketer)
├── logging.py         # структурированные логи, sanitize секретов
└── tests/             # модели, сервис, webhook, API, интеграция
```

## 3. Изменённые / новые файлы

**Новые (backend):**
- `backend/apps/messaging/` — весь модуль (см. выше)
- `backend/apps/messaging/migrations/0001_initial.py`
- `backend/apps/clients/migrations/0002_client_phone_e164_alter_client_source.py`
- `backend/config/settings/test.py` — SQLite-настройки для тестов без внешней инфраструктуры

**Изменённые (backend):**
- `backend/config/settings/base.py` — `apps.messaging` в INSTALLED_APPS, блок настроек WhatsApp
- `backend/config/urls.py` — `/messaging/`, `/webhooks/`
- `backend/config/asgi.py` — WS-роутинг inbox + JWT-мидлварь
- `backend/apps/clients/models.py` — `phone_e164` (нормализация), источник `whatsapp`
- `backend/pyproject.toml`, `backend/requirements/prod.txt` — `requests`
- `backend/.env.example` — переменные WhatsApp
- `backend/apps/accounts/tests.py` — фикс pre-existing бага `create_user` (username)
- `backend/apps/__init__.py` — новый (правильный импорт в pytest, конвенция Django)

**Новые (frontend):**
- `frontend/src/app/(dashboard)/inbox/page.tsx`
- `frontend/src/views/inbox/InboxPage.tsx`
- `frontend/src/entities/inbox/types.ts`
- `frontend/src/shared/lib/inboxSocket.ts`

**Изменённые (frontend):**
- `frontend/src/shared/api/base.ts` — `messagingApi`
- `frontend/src/shared/constants/index.ts` — ключи Inbox
- `frontend/src/app/(dashboard)/layout.tsx` — пункт «Inbox» + счётчик непрочитанных
- `frontend/src/views/clients/ClientDetailPage.tsx` — вкладка «WhatsApp»

## 4. Database migrations

```
backend/apps/messaging/migrations/0001_initial.py
backend/apps/clients/migrations/0002_client_phone_e164_alter_client_source.py
```

Применение: `python manage.py migrate` (существующие таблицы не затрагиваются —
изменения аддитивные; у `Client` добавлен nullable-индексированный `phone_e164`).

## 5. API endpoints

Базовый путь: `/api/v1`

| Метод | Путь | Описание |
|---|---|---|
| GET | `/messaging/conversations/` | Список (filters: `channel`, `status`, `unread=true`, `assigned=me`, `contact`, `search`) |
| POST | `/messaging/conversations/` | Создать диалог (`contact_id`, `channel`, `whatsapp_account_id?`) |
| GET | `/messaging/conversations/{id}/` | Детали + последнее сообщение |
| GET | `/messaging/conversations/{id}/messages/` | Сообщения (пагинация, `before=<ISO>` — скролл вверх) |
| POST | `/messaging/conversations/{id}/messages/` | Отправить: `{text}` \| `{template:{name,language,parameters}}` \| multipart `media` |
| POST | `/messaging/conversations/{id}/read/` | Сбросить unread |
| POST | `/messaging/conversations/{id}/close/` `/reopen/` | Закрыть/открыть диалог |
| POST | `/messaging/conversations/{id}/assign/` | Назначить менеджера (`user_id`) |
| GET | `/messaging/conversations/{id}/can-send/` | Окно 24ч + список шаблонов |
| GET | `/messaging/messages/{id}/media/` | Прокси входящего медиа (токен не уходит на фронт) |
| GET | `/messaging/unread/` | Счётчик непрочитанных для бейджа |
| GET/POST | `/messaging/whatsapp/accounts/` , `/create/` | Аккаунты (создание — админ, token write-only) |
| GET | `/messaging/whatsapp/templates/` | Шаблоны WABA (кэш 5 мин) |
| GET/POST | `/webhooks/whatsapp/` | Публичный webhook (верификация + события) |

WebSocket: `ws://<host>/ws/inbox/?token=<jwt>`.

## 6. Environment variables (`backend/.env.example`)

```
WHATSAPP_API_VERSION=v21.0
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_WEBHOOK_APP_SECRET=        # опционально: HMAC-подпись webhook
WHATSAPP_API_TIMEOUT=15
WHATSAPP_MAX_MEDIA_SIZE_MB=16
WHATSAPP_TEMPLATES_CACHE_TTL=300
```

Токены можно держать либо в env, либо в модели `WhatsAppAccount` (админка) —
там они шифруются `SECRET_KEY`-ом и никогда не отдаются фронту и в логи.

## 7. Настройка Meta WhatsApp Business

1. Зарегистрируйтесь на https://business.facebook.com и создайте **Business Portfolio**.
2. На https://developers.facebook.com → **My Apps** → создайте приложение (тип **Business**).
3. Добавьте продукт **WhatsApp** → следуйте мастеру (WhatsApp API Setup):
   - **Get started** → подключите номер телефона (подтвердите кодом/звонком);
   - будет создан **WABA ID** и **Phone Number ID**;
4. Сгенерируйте **permanent access token** (System User → Generate token, права `whatsapp_business_messaging`, `whatsapp_business_management`).
5. **Message templates** → создайте и отправьте на одобрение шаблоны (например `welcome` с параметром `{{1}}`). Обычные текстовые сообщения работают только в 24-часовом окне после сообщения клиента.
6. Заполните `.env` или создайте `WhatsAppAccount` в админке DEO CRM.

## 8. Настройка webhook

1. В приложении Meta (WhatsApp → Configuration) введите:
   - **Callback URL**: `https://<ваш-домен>/api/v1/webhooks/whatsapp/`
   - **Verify token**: то же значение, что `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Нажмите **Verify and save** — DEO CRM ответит `hub.challenge`.
2. Подпишитесь на поле **messages**.
3. (Рекомендуется) включите **App secret** в настройках приложения и укажите
   `WHATSAPP_WEBHOOK_APP_SECRET` — DEO CRM проверяет `X-Hub-Signature-256`.
4. HTTPS обязателен (Meta не шлёт webhook на http).

## 9. Запуск локально

```bash
# 1. Инфраструктура (Postgres, Redis, MinIO)
docker compose up -d postgres redis minio

# 2. Backend
cd backend
cp .env.example .env          # добавьте WhatsApp-переменные
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver 8001

# 3. WebSocket (daphne) — для realtime
daphne -p 8002 config.asgi:application   # либо runserver с daphne в INSTALLED_APPS

# 4. Frontend
cd ../frontend
npm install
npm run dev                   # http://localhost:3000/inbox

# 5. Celery (необязательно, только для уведомлений)
celery -A config worker -l info
```

**Тесты** (без Postgres/Redis):

```bash
cd backend
DJANGO_SETTINGS_MODULE=config.settings.test pytest apps -q
```

## 10. Deployment

- **Переменные окружения**: добавить WhatsApp-блок в секреты (Vault/SSM/kubernetes secrets).
- **Docker**: `docker compose up -d --build` — миграции выполняются в entrypoint.
- **HTTPS**: nginx из `docker/nginx` уже проксирует WebSocket; добавьте
  `location /api/v1/webhooks/` без rate-limit на уровне CDN (лимит 300/мин на IP).
- **Аккаунты**: создайте `WhatsAppAccount` через админку или
  `POST /api/v1/messaging/whatsapp/accounts/create/` (superadmin).

## 11. Ограничения WhatsApp API

- **24-часовое окно**: свободный текст только после входящего сообщения клиента; после — только шаблоны (код API `131026`).
- **Шаблоны**: только одобренные (`APPROVED`), параметры строго по компонентам.
- **Медиа**: image ≤ 5 МБ, документы ≤ 100 МБ (рекомендуем ≤ 16 МБ), видео ≤ 16 МБ; до 10 файлов в 10 секунд.
- **Rate limits**: ~80 сообщений/сек на номер (при 100% успеха); 250 тыс. сообщений/24ч.
- **Один бизнес-номер на один диалог**: `conversation` уникален по (клиент, канал, аккаунт).
- **Статусы**: «прочитано» приходит только если у клиента включены чеки; финальные статусы — только через webhook.
- **Ограничения контента**: без спама, промо вне окна, соответствие политикам Commerce/Marketing.

## 12. Результаты тестирования

- `DJANGO_SETTINGS_MODULE=config.settings.test pytest apps -q` → **62 passed**
  (включая 61 тест нового модуля + 1 фикс accounts).
- Покрыты: отправка text/template/media (mocks), webhook verification, входящие
  сообщения, идемпотентность дублей, статусы sent→delivered→read (без
  даунгрейдов), failed с ошибками, неизвестные события, неверная подпись,
  создание/поиск клиента, unread-счётчик, permissions, token-ошибки, интеграционные
  сценарии (webhook→realtime, отправка→статус).
- Frontend: `tsc --noEmit` — 0 ошибок; `next lint` — без ошибок.
- Реальные сообщения в тестах не отправляются (Graph API мокируется).

## 13. Безопасность

- Access token только на backend (зашифрован, в ответах API отсутствует).
- Webhook: верификация токена, опциональная HMAC-подпись, rate limit, идемпотентность.
- Доступ: только роли superadmin/owner/project_manager/marketer; назначение проверяет роль.
- Медиа-прокси исключает прямой доступ к Graph URL с токеном; размер файлов ограничен.
- Логи: `whatsapp.message.sent/received/delivered/read/failed`, `whatsapp.webhook.received`,
  `whatsapp.api.error` — секреты отфильтровываются.

## 14. Известные ограничения / рекомендации

- **Подпись webhook**: если `WHATSAPP_WEBHOOK_APP_SECRET` не задан, POST-запросы
  принимаются без HMAC (только verify token + rate limit). Для production
  обязательно задайте App Secret.
- **WebSocket**: JWT передаётся в query string (`?token=`) — токен может попасть
  в логи прокси. В production рекомендуем короткоживущий токен или
  `Sec-WebSocket-Protocol`.
- **Идемпотентность исходящих**: повторная отправка POST после таймаута создаст
  дубликат сообщения. При необходимости добавьте `client_message_id` (UUID).
- **Исходящие медиа**: `media_url` хранит подписанный S3-URL (истекает через 1 час)
  — для долгого хранения прогоняйте отображение через прокси-эндпоинт.
- **Статусы «прочитано»**: приходят только при включённых чеках у клиента.
- **Один аккаунт на env-токен**: при первом webhook env-аккаунт переносится в БД
  (токен шифруется), далее управление — через админку.
