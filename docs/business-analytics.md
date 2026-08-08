# Business Analytics — DEO CRM

Полноценный модуль бизнес-аналитики. Все показатели рассчитываются на
бэкенде по **реальным данным** проекта (лиды, этапы воронки, клиенты, счета,
платежи, расходы, зарплаты, проекты). Никаких fake/mock-метрик.

---

## 1. Архитектура

```
apps/analytics/
├── constants.py      # пороги воронки, пресеты периодов, классификация этапов
├── funnel.py         # классификация этапов (won/lost/deal/lead) + таймстампы исходов
├── caching.py        # версионные ключи кэша + инвалидация одним инкрементом
├── services.py       # вычисление всех метрик (aggregation queries)
├── snapshots.py      # материализация дневных BusinessMetricsSnapshot
├── tasks.py          # Celery: ночной снапшот + прогрев кэша
├── signals.py        # инвалидация кэша при изменении данных
├── business.py       # API-views (summary, revenue, funnel, managers, sources, ltv, churn, retention, export)
├── export.py         # CSV (stdlib) и PDF (ReportLab)
└── management/commands/refresh_analytics.py  # ручной пересчёт
```

**Смысловая модель сделок.** В DEO CRM сделка — это лид, движущийся по этапам
воронки (`LeadStage`). Исход сделки определяется этапом:

- `probability >= 100` → **Won**
- `probability <= 0`   → **Lost**
- `probability >= 50`  → **Deal** (в работе)
- иначе               → **Lead**

Если у этапов не настроены вероятности (все `0`), классификация определяется
по имени этапа (ключевые слова «побед»/«проигр» и т.п.). Текущая карта этапов
всегда доступна через `GET /api/v1/analytics/business/config/`.

**Выручка.** Сумма оплаченных счетов (`Invoice.status = "paid"`) по дате оплаты
(`paid_at`; если не задана — `updated_at`, затем `created_at`). Отменённые счета
(`cancelled`) в выручку не входят; ранее оплаченные и отменённые учитываются как
`refunds` (информационно, без двойного вычитания).

**Прибыль.** `Gross = Revenue − COGS`, где COGS — себестоимость
(`Project.cost`) проектов, принёсших выручку в периоде.
`Net = Gross − Расходы(Expense) − Зарплаты(Salary)` за период.

---

## 2. Метрики и формулы

| Метрика | Формула |
| --- | --- |
| Revenue | `Σ amount` оплаченных счетов в периоде (минус refunds не вычитаются повторно) |
| Refunds | `Σ paid_amount` счетов со статусом `cancelled` в периоде (информационно) |
| COGS | `Σ Project.cost` проектов с оплаченными счетами в периоде |
| Gross / Net profit | `Revenue − COGS`; `Gross − Expenses − Salaries` |
| Conversion Rate | `Won / Leads` (а также шаги `Lead→Qualified`, `Qualified→Deal`, `Deal→Won`) |
| Qualified | лид, по которому есть история перемещений (`LeadHistory`) ИЛИ текущий этап `>= 50%` |
| Deal | лид в этапе `probability >= 50` |
| Won / Lost | лиды, попавшие в won/lost этап в периоде (первый вход по `LeadHistory`) |
| Average Deal Size | `Σ budget` выигранных сделок / `count` выигранных (budget = NULL не учитывается) |
| Sales Cycle | `AVG(won_at − lead.created_at)` в днях по сделкам, выигранным в периоде |
| LTV | `Σ paid invoices` по клиенту за всю историю / число покупающих клиентов (+ когорты по месяцу первой покупки, повторные покупки) |
| CAC | `Σ SourceAcquisitionCost` за период / новые клиенты за период (0, если нет клиентов или затрат) |
| Churn | клиенты, активные до начала периода (≥1 оплаченного счёта), без активности (счёт/взаимодействие) в периоде: `churned / active_base` |
| Retention | когортная таблица: % клиентов когорты (месяц первой покупки) активных в каждом последующем месяце |
| Revenue by manager | выручка по счетам, атрибутированная менеджеру последней выигранной сделки клиента |
| Revenue by product | оплаченные счета, сгруппированные по `project.service_type` |
| Revenue by source | оплаченные счета, сгруппированные по `client.source` |
| ROI источника | `(revenue − cost) / cost × 100` (0 при отсутствии затрат) |
| Profit margin | `Net profit / Revenue × 100` |
| Δ revenue | `(Revenue − Revenue_prev) / Revenue_prev × 100` к равному предыдущему периоду |

**Edge cases (покрыты тестами):** нет сделок; нет клиентов; отменённые сделки
(lost); refunds (оплачен→отменён); нулевой/пустой budget; отсутствие source
(группируется в `other`); несколько покупок одного клиента (LTV, repeat rate).

---

## 3. API

Все эндпоинты под `/api/v1/analytics/business/`:

| Endpoint | Описание | Параметры |
| --- | --- | --- |
| `GET summary/` | Все KPI: revenue, profit, conversion, LTV, CAC, avg deal size, churn, cycle, leads/deals/won/lost | `period`, `start_date`, `end_date`, `scope`, `manager_id` |
| `GET revenue/` | Выручка + динамика (день/неделя/месяц) + by manager/product/source + Δ | то же |
| `GET funnel/` | Lead→Qualified→Deal→Won + конверсии шагов + карта этапов | то же |
| `GET managers/` | Эффективность менеджеров (leads, contacted, deals, won, lost, conversion, revenue, avg deal size, cycle) | то же |
| `GET sources/` | Source \| Leads \| Deals \| Won \| Conversion \| Revenue \| CAC \| ROI | то же |
| `GET ltv/` | LTV, когорты LTV, повторные покупки (all-time) | `scope`, `manager_id` |
| `GET churn/` | Отток за период | `period`, `start_date`, `end_date` |
| `GET retention/` | Когортное удержание (all-time) | — |
| `GET config/` | Текущая классификация этапов (для проверки настройки) | — |
| `GET export/?export=csv\|pdf` | Экспорт отчёта CSV/PDF | то же |
| `GET/POST acquisition-costs/` | Стоимость привлечения по источникам (только админ) | `source`, `year`, `month` |
| `PATCH/DELETE acquisition-costs/<id>/` | Изменение/удаление затрат (только админ) | — |

> `format` зарезервирован DRF для контент-негосиации — экспорт использует `export`.

**Периоды:** `today`, `yesterday`, `7d`, `30d`, `90d`, `year`, `custom`
(`start_date`/`end_date`). `end_date` включительно.

**Permissions:**
- `IsAnalyticsViewer` — любой сотрудник (не client) может открыть аналитику,
  но **видит только свои данные** (`scope=manager`, принудительно).
- `IsAnalyticsAdmin` (superadmin/owner) — `scope=company` (общая аналитика
  компании) либо `scope=manager&manager_id=<id>` для персонального среза.

---

## 4. Database changes

Новые таблицы (`analytics.0002_business_analytics`):

- **BusinessMetricsSnapshot** — материализованные дневные показатели
  (`date` unique, revenue, cogs, gross/net profit, expenses, salaries,
  new_clients, new_leads, qualified, deals, won/lost, won_revenue,
  active/churned clients).
- **SourceAcquisitionCost** — затраты на привлечение по источнику/месяцу
  (`unique(source, year, month)`), вводятся админом, питают CAC/ROI.

Индексы (миграции `leads.0003`, `finance.0002`, `clients.0003`):

- `leads_lead (created_at)`, `(source, created_at)`
- `finance_invoice (status, paid_at)`
- `clients_client (source)`, `(created_at)`

---

## 5. Caching strategy

- Глобальный счётчик `analytics:data_version` в кэше. Сигналы
  (`apps/analytics/signals.py`) инкрементируют его при любых изменениях
  лидов, этапов, счетов, платежей, расходов, зарплат, клиентов,
  взаимодействий и затрат. Все ключи кэша содержат версию → одна операция
  инвалидирует всю аналитику.
- Тяжёлые breakdown'ы (summary, revenue, funnel, managers, sources, ltv,
  churn, retention) кэшируются в Redis (LocMem в dev/test) с TTL
  `ANALYTICS.CACHE_TTL_SECONDS` (900 c). Dashboard не выполняет тяжёлых
  aggregate-запросов при каждом открытии.
- Дневные аддитивные метрики берутся из `BusinessMetricsSnapshot`, а не из
  живых агрегатов.

---

## 6. Background jobs (Celery Beat)

В `CELERY_BEAT_SCHEDULE` (settings/base.py):

| Задача | Расписание | Что делает |
| --- | --- | --- |
| `refresh_business_analytics_snapshot` | ежедневно 02:30 | пересчитывает `BusinessMetricsSnapshot` за последние 400 дней |
| `prewarm_business_analytics_cache` | ежедневно 03:00 | прогревает кэш стандартных периодов (company scope) |

Вручную: `python manage.py refresh_analytics [--days 400] [--from 2024-01-01] [--to 2024-12-31]`.

---

## 7. Тесты

`apps/analytics/tests/` (pytest, 51 тест):

- **test_metrics.py** — формулы и edge cases: пустые данные, revenue/refunds/
  cancelled, COGS/expenses/salaries, динамика, воронка (won/lost/конверсии),
  avg deal size (null budget), sales cycle, LTV (несколько покупок, когорты),
  CAC (0 затрат / 0 клиентов), churn (ушедший/удержанный), retention (когорта),
  источники (ROI, отсутствие source), менеджеры (включая атрибуцию выручки),
  scope (менеджер видит только своё), исходы сделок (history/fallback).
- **test_api.py** — permissions (anon 401, client 403, менеджер видит только
  своё, админ — компанию), периоды, custom range, экспорт CSV/PDF,
  acquisition-costs (admin-only, уникальность, update).

Запуск: `pytest apps/analytics/tests`.

> Примечание: тесты `apps/messaging` на момент реализации не собираются —
> приложение `apps.messaging` не зарегистрировано в `INSTALLED_APPS`
> (это не связано с данным модулем).
