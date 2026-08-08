# Каталог и Сделки (Catalog & Deals)

Полноценный каталог **Products / Services / Packages / Subscriptions** и модуль
**Deal Items** с автоматическим пересчётом сумм и складским учётом.

## Архитектура

```
apps/catalog/                  — каталог
  models.py                    — CatalogCategory, CatalogItem, PackageItem,
                                 PriceHistory, InventoryMovement
  serializers.py               — пакеты (авто-цена), история цен
  views.py                     — CRUD + поиск/фильтры/сортировка/pagination,
                                 bulk-операции, restock, импорт/экспорт CSV
  permissions.py               — view / create / edit / delete /
                                 manage prices / manage inventory
  tests/                       — 27 тестов

apps/deals/                    — сделки (конвертация лида в продажу)
  models.py                    — Deal, DealItem, DealPayment
  services.py                  — convert_lead_to_deal, change_deal_status
                                 (списание/возврат остатков)
  serializers.py, views.py     — API, payments, attach-document
  tests/                       — 15 тестов

apps/documents/models.py       — добавлено поле Document.deal (nullable FK)
```

**Принципы:**

- Существующая воронка лидов **не изменена** — Deal это опциональная связь
  «один-к-одному» с Lead, создаётся только явной конвертацией.
- Суммы сделки **не хранятся как «чёрный ящик»**: subtotal / discount / tax /
  total / total_cost / profit / margin пересчитываются из позиций при каждом
  изменении (сигнал на `DealItem` + `Deal.recalculate()`).
- Остатки товаров уменьшаются **при переводе сделки в Won**; при выходе из
  статуса Won — возвращаются (movement типа refund). Продажа сверх остатка и
  дробное количество товара блокируются с детальным ответом `shortages`.

## Модели каталога

| Поле | Тип | Примечание |
|---|---|---|
| `CatalogItem.name, description` | char/text | |
| `CatalogItem.type` | product / service / package / subscription | |
| `CatalogItem.category` | FK → CatalogCategory | |
| `CatalogItem.sku` | unique, nullable | обязателен для товаров |
| `CatalogItem.price` | Decimal | |
| `CatalogItem.cost_price` | Decimal | себестоимость |
| `CatalogItem.tax` / `discount` | Decimal % | |
| `CatalogItem.stock` / `low_stock_threshold` / `unit` | product | |
| `CatalogItem.duration_minutes` | service | |
| `CatalogItem.billing_period` / `next_billing_date` | subscription | |
| `CatalogItem.status` | active / inactive / archived | |
| `CatalogItem.image` | ImageField | S3/медиа |
| `PackageItem(package, item, quantity)` | | цена пакета = Σ price×qty |
| `PriceHistory(item, old/new price & cost, reason, changed_by)` | | |
| `InventoryMovement(item, type, qty, balance_after, reference)` | | аудит остатков |

## Модели сделок

```
Deal (number, lead 1-1, client, title, status, description, assigned_to)
 ├── DealItem (item snapshot: name, quantity, unit_price, discount, tax, cost_price)
 ├── DealPayment (amount, method, transaction_id, notes)
 └── documents (Document.deal)
```

Статусы: `draft / open / won / lost / cancelled`. Поля `won_at`/`lost_at`,
денормализованные деньги: `subtotal, discount, tax, total, total_cost, profit,
margin, paid_amount`.

**Формулы пересчёта:**

```
line_subtotal = quantity × unit_price
subtotal      = Σ line_subtotal
discount_total = Σ item.discount + deal.discount
tax_total      = Σ item.tax + deal.tax
total          = max(subtotal − discount_total + tax_total, 0)
total_cost     = Σ quantity × cost_price
profit         = total − total_cost
margin         = profit / total × 100   (0 при total = 0)
```

## Permissions

| Право | superadmin / owner | project_manager | marketer | developer/designer | client |
|---|---|---|---|---|---|
| view catalog | ✅ | ✅ | ✅ | ✅ | ❌ |
| create / edit | ✅ | ✅ | ✅ | ❌ | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| manage prices | ✅ | ✅ | ❌ | ❌ | ❌ |
| manage inventory (restock) | ✅ | ✅ | ❌ | ❌ | ❌ |
| deals (view) | ✅ | ✅ | ✅ | ✅ | ❌ |
| deals (create/edit) | ✅ | ✅ | ✅ | ❌ | ❌ |
| deals (delete) | ✅ | ✅ | ❌ | ❌ | ❌ |

Реализация: `apps/catalog/permissions.py`, `apps/deals/permissions.py`.

## API

Префикс: `/api/v1/`

### Каталог

| Метод | URL | Описание |
|---|---|---|
| GET/POST | `/catalog/items/` | список (search/filter/order/pagination) / создание |
| GET/PATCH/DELETE | `/catalog/items/<uuid>/` | детали (вкл. package_items, price_history, inventory_movements) / изменение / удаление |
| POST | `/catalog/items/<uuid>/restock/` | приход/корректировка остатка (`{quantity, note}`) |
| GET/POST | `/catalog/categories/` | категории (с item_count) |
| POST | `/catalog/bulk/` | bulk: `{action, ids, ...}` — change_status, change_category, adjust_price (%), delete |
| GET | `/catalog/export/` | CSV текущей выборки (учитывает фильтры) |
| POST | `/catalog/import/` | multipart CSV → создание/обновление по SKU, отчёт `{created, updated, errors}` |

Параметры списка: `search` (name/sku/description), `type`, `status`,
`category`, `stock_status` (out/low/ok), `ordering`
(name/price/cost_price/stock/created_at), `page`, `page_size`.

### Сделки

| Метод | URL | Описание |
|---|---|---|
| GET | `/deals/` | список (search по number/title/lead, фильтры status/client/assigned_to, ordering, pagination) |
| POST | `/deals/` | конвертация лида: `{lead, items:[{item,quantity,discount,tax}], discount, tax, description}` |
| GET/PATCH/DELETE | `/deals/<uuid>/` | детали / изменение (позиции заменяются, суммы пересчитываются) / удаление |
| POST | `/deals/<uuid>/status/` | смена статуса (`{status}`) — списание/возврат остатков |
| POST | `/deals/<uuid>/payments/` | регистрация платежа (`{amount, method}`) |
| POST | `/deals/<uuid>/attach-document/` | привязка документа (`{document_id}`) |
| GET | `/deals/leads-available/` | лиды без сделки (для конвертации) |

## Изменения БД (migrations)

- `catalog.0001_initial` — все модели каталога (+ индексы: type+status,
  category+type, sku, status+created_at, inventory item+created_at)
- `deals.0001_initial` — Deal, DealItem, DealPayment (+ индексы status,
  client+status, created_at)
- `documents.0002_document_deal` — nullable `Document.deal`

## UI

- **`/catalog`** — `frontend/src/views/catalog/CatalogPage.tsx`
  - вкладки Все / Товары / Услуги / Пакеты / Подписки
  - поиск, фильтры (категория, статус, остаток), сортировка, серверная
    пагинация
  - бейджи остатков (Нет/Мало), баннер «требуют пополнения»
  - bulk-панель (смена статуса/категории, корректировка цен %, удаление)
  - импорт/экспорт CSV, модалка позиции по типу, история цен, пополнение
- **`/deals`** — `frontend/src/views/deals/DealsPage.tsx`
  - список сделок с итогами/прибылью/оплатой/статусом
  - «Создать из лида» → выбор лида → редактор позиций с живым пересчётом
  - карточка сделки: позиции, итоги, платежи (+ приём платежа), документы,
    переходы статусов (Won списывает остатки, ошибки остатков показываются)
- Сущности: `entities/catalog/types.ts`, `entities/deals/types.ts`
- API: `catalogApi`, `dealsApi` в `shared/api/base.ts`; ключи в `QUERY_KEYS`
- Новый UI-компонент: `shared/ui/ConfirmDialog`

## Тесты

`backend/apps/catalog/tests/` (27) и `backend/apps/deals/tests/` (15), итого 42:

- **Каталог:** permissions по ролям; поиск/фильтры/сортировка/pagination;
  история цен (запись, отсутствие записи без изменений, права на цены);
  авто-цена пакета; restock + движения; low/out статусы; bulk операции
  (статус/категория/цена с историей/удаление с правами); экспорт/импорт CSV
  (создание, обновление по SKU, ошибки строк)
- **Сделки:** конвертация лида; «только один раз»; обязательность позиций;
  права; расчёт: quantity, discount, tax, subtotal, total, cost, margin
  (один и несколько товаров); снапшот цен позиций при изменении каталога;
  списание остатков на Won; блокировка при нехватке (shortages) и дробном
  количестве; возврат остатков при отмене; услуги не трогают остатки;
  платежи обновляют paid_amount; API-смена статуса

Запуск: `POSTGRES_PORT=5433 .venv/bin/python -m pytest apps/catalog/tests apps/deals/tests -q`
