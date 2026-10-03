import 'package:flutter/material.dart';

class CrmResource {
  const CrmResource(
    this.key,
    this.title,
    this.path, {
    this.icon = Icons.folder_outlined,
    this.detail = true,
    this.detailPrefix,
    this.idField = 'id',
    this.createPath,
    this.actions = const [],
    this.relations = const [],
    this.singleton = false,
    this.fields,
    this.dataPath,
    this.dataKey,
  });
  final String key, title, path, idField;
  final IconData icon;
  final bool detail, singleton;
  final Map<String, dynamic>? fields;
  final String? detailPrefix, createPath, dataPath, dataKey;
  final List<CrmAction> actions;
  final List<CrmRelation> relations;
  String recordPath(Map<String, dynamic> row) =>
      '${detailPrefix ?? path}${row[idField]}/';
}

class CrmAction {
  const CrmAction(
    this.title,
    this.suffix, {
    this.fields = const {},
    this.method = 'POST',
    this.data = const {},
  });
  final String title, suffix, method;
  final Map<String, dynamic> fields, data;
}

class CrmRelation {
  const CrmRelation(this.title, this.suffix, {this.create = true});
  final String title, suffix;
  final bool create;
}

const _string = {'type': 'string', 'required': true};
const _number = {'type': 'decimal', 'required': true};
const _person = {'type': 'field', 'required': true};

final crmResources = <CrmResource>[
  const CrmResource(
    'project_statuses',
    'Статусы проектов',
    '/projects/statuses/',
    detail: false,
  ),
  const CrmResource(
    'service_types',
    'Типы услуг',
    '/projects/service-types/',
    detail: false,
  ),
  const CrmResource('lead_stages', 'Этапы воронки', '/leads/stages/'),
  const CrmResource(
    'client_statuses',
    'Статусы клиентов',
    '/clients/statuses/',
  ),
  const CrmResource(
    'client_tags',
    'Теги клиентов',
    '/clients/tags/',
    detail: false,
  ),
  const CrmResource(
    'catalog_categories',
    'Категории каталога',
    '/catalog/categories/',
    detail: false,
  ),
  const CrmResource(
    'finance_summary',
    'Финансовая сводка',
    '/finance/reports/summary/',
    singleton: true,
  ),
  const CrmResource(
    'finance_profit',
    'Прибыль по проектам',
    '/finance/reports/profit-by-project/',
    singleton: true,
  ),
  const CrmResource(
    'acquisition_costs',
    'Стоимость привлечения',
    '/analytics/business/acquisition-costs/',
  ),
  const CrmResource(
    'learning_progress',
    'Прогресс стажёров',
    '/mentorship/checklist-progress/',
  ),

  const CrmResource(
    'clients',
    'Клиенты',
    '/clients/',
    icon: Icons.people_outline,
    relations: [
      CrmRelation('Обзор клиента', '360/', create: false),
      CrmRelation('История', 'activity/', create: false),
      CrmRelation('Взаимодействия', 'interactions/'),
      CrmRelation('Покупки', 'purchases/'),
      CrmRelation('Теги', 'tags/'),
    ],
  ),
  const CrmResource(
    'projects',
    'Проекты',
    '/projects/',
    icon: Icons.folder_outlined,
    relations: [
      CrmRelation('Команда', 'team/'),
      CrmRelation('Учёт времени', 'timesheet/', create: false),
    ],
  ),
  const CrmResource(
    'tasks',
    'Задачи',
    '/tasks/',
    icon: Icons.checklist,
    actions: [
      CrmAction(
        'Изменить статус',
        'change-status/',
        fields: {'status_id': _person},
      ),
      CrmAction(
        'Назначить исполнителя',
        'assign/',
        fields: {'user_id': _person},
      ),
      CrmAction('Запустить таймер', 'timer/start/'),
      CrmAction('Остановить таймер', 'timer/stop/'),
    ],
    relations: [CrmRelation('Комментарии', 'comments/')],
  ),
  const CrmResource(
    'leads',
    'Лиды',
    '/leads/',
    icon: Icons.trending_up,
    actions: [
      CrmAction(
        'Изменить этап',
        'move/',
        fields: {
          'stage_id': _person,
          'notes': {'type': 'string'},
        },
      ),
    ],
  ),
  const CrmResource(
    'deals',
    'Сделки',
    '/deals/',
    icon: Icons.handshake_outlined,
    actions: [
      CrmAction(
        'Изменить статус',
        'status/',
        fields: {
          'status': {
            'type': 'choice',
            'required': true,
            'choices': [
              {'value': 'draft', 'display_name': 'Черновик'},
              {'value': 'open', 'display_name': 'В работе'},
              {'value': 'won', 'display_name': 'Выиграна'},
              {'value': 'lost', 'display_name': 'Проиграна'},
            ],
          },
        },
      ),
      CrmAction(
        'Добавить оплату',
        'payments/',
        fields: {
          'amount': _number,
          'method': _string,
          'notes': {'type': 'string'},
        },
      ),
      CrmAction(
        'Прикрепить документ',
        'attach-document/',
        fields: {'document_id': _person},
      ),
    ],
  ),
  const CrmResource(
    'catalog',
    'Каталог',
    '/catalog/items/',
    icon: Icons.inventory_2_outlined,
    actions: [
      CrmAction(
        'Пополнить остаток',
        'restock/',
        fields: {
          'quantity': _number,
          'note': {'type': 'string'},
        },
      ),
    ],
  ),
  const CrmResource(
    'invoices',
    'Счета',
    '/finance/invoices/',
    icon: Icons.receipt_long,
    actions: [CrmAction('Отметить оплаченным', 'mark-paid/')],
  ),
  const CrmResource(
    'payments',
    'Платежи',
    '/finance/payments/',
    icon: Icons.payments_outlined,
    detail: false,
  ),
  const CrmResource(
    'incomes',
    'Доходы',
    '/finance/incomes/',
    icon: Icons.add_card,
    detail: false,
  ),
  const CrmResource(
    'expenses',
    'Расходы',
    '/finance/expenses/',
    icon: Icons.money_off,
    detail: false,
  ),
  const CrmResource(
    'salaries',
    'Зарплаты',
    '/finance/salaries/',
    icon: Icons.account_balance_wallet_outlined,
    detail: false,
  ),
  const CrmResource(
    'documents',
    'Документы',
    '/documents/',
    icon: Icons.description_outlined,
    actions: [CrmAction('Скачать', 'download/', method: 'GET')],
    relations: [
      CrmRelation('Версии', 'versions/'),
      CrmRelation('Комментарии', 'comments/'),
      CrmRelation('Журнал действий', 'activity/', create: false),
    ],
  ),
  const CrmResource(
    'inbox',
    'Входящие сообщения',
    '/messaging/conversations/',
    icon: Icons.inbox_outlined,
    actions: [
      CrmAction('Отметить прочитанным', 'read/'),
      CrmAction('Закрыть диалог', 'close/'),
      CrmAction('Открыть диалог', 'reopen/'),
      CrmAction(
        'Назначить ответственного',
        'assign/',
        fields: {'user_id': _person},
      ),
    ],
    relations: [CrmRelation('Сообщения', 'messages/')],
  ),
  const CrmResource(
    'employees',
    'Сотрудники',
    '/auth/users/',
    icon: Icons.badge_outlined,
    createPath: '/auth/users/invite/',
    actions: [
      CrmAction(
        'Назначить роль',
        'assign-role/',
        fields: {
          'role': {
            'type': 'choice',
            'required': true,
            'choices': [
              {'value': 'superadmin', 'display_name': 'Администратор'},
              {'value': 'owner', 'display_name': 'Владелец'},
              {'value': 'project_manager', 'display_name': 'Менеджер'},
              {'value': 'developer', 'display_name': 'Разработчик'},
              {'value': 'designer', 'display_name': 'Дизайнер'},
              {'value': 'marketer', 'display_name': 'Маркетолог'},
              {'value': 'client', 'display_name': 'Клиент'},
            ],
          },
        },
      ),
    ],
    relations: [
      CrmRelation('Профиль', 'profile/'),
      CrmRelation('Статистика', 'stats/', create: false),
      CrmRelation('Сертификаты', 'certificates/'),
    ],
  ),
  const CrmResource(
    'teams',
    'Структура студии',
    '/structure/teams/',
    icon: Icons.account_tree_outlined,
  ),
  const CrmResource(
    'memberships',
    'Участники команд',
    '/structure/memberships/',
    icon: Icons.groups_outlined,
  ),
  const CrmResource(
    'mentorship',
    'Наставничество',
    '/mentorship/pairs/',
    icon: Icons.school_outlined,
  ),
  const CrmResource(
    'mentee_tasks',
    'Задачи стажёров',
    '/mentorship/tasks/',
    icon: Icons.assignment_outlined,
  ),
  const CrmResource(
    'checklists',
    'Чек-листы',
    '/mentorship/checklists/',
    icon: Icons.fact_check_outlined,
  ),
  const CrmResource(
    'evaluations',
    'Оценки стажёров',
    '/mentorship/evaluations/',
    icon: Icons.star_outline,
  ),
  const CrmResource(
    'learning',
    'Обучение',
    '/learning/',
    icon: Icons.menu_book_outlined,
    idField: 'slug',
    actions: [CrmAction('Отметить прочитанным', '', method: 'READ_ARTICLE')],
  ),
  const CrmResource(
    'articles',
    'Управление статьями',
    '/learning/admin/articles/',
    icon: Icons.edit_note,
  ),
  const CrmResource(
    'forms',
    'Формы',
    '/forms/',
    icon: Icons.dynamic_form,
    detailPrefix: '/forms/templates/',
  ),
  const CrmResource(
    'invitations',
    'Приглашения к формам',
    '/forms/invitations/',
    icon: Icons.link,
  ),
  const CrmResource(
    'scenarios',
    'Автоматизация',
    '/scenarios/',
    icon: Icons.auto_awesome_motion,
    actions: [
      CrmAction(
        'Проверить сценарий',
        'test/',
        fields: {
          'text': _string,
          'channel': {'type': 'string'},
        },
      ),
    ],
  ),
  const CrmResource(
    'triggers',
    'История автоматизации',
    '/scenarios/triggers/',
    icon: Icons.history,
    detail: false,
  ),
  const CrmResource(
    'reminders',
    'Напоминания',
    '/reminders/',
    icon: Icons.alarm,
    detail: false,
    actions: [
      CrmAction('Просмотрено', 'view/'),
      CrmAction('Выполнено', 'complete/'),
      CrmAction('Отклонить', 'dismiss/'),
      CrmAction(
        'Отложить',
        'snooze/',
        fields: {
          'period': {
            'type': 'choice',
            'required': true,
            'choices': [
              {'value': '1h', 'display_name': 'Через час'},
              {'value': 'tomorrow', 'display_name': 'Завтра'},
              {'value': 'week', 'display_name': 'Через неделю'},
            ],
          },
        },
      ),
    ],
  ),
  const CrmResource(
    'reminder_rules',
    'Правила напоминаний',
    '/reminders/rules/',
    icon: Icons.rule,
  ),
  const CrmResource(
    'notifications',
    'Уведомления',
    '/notifications/',
    icon: Icons.notifications_outlined,
    detail: false,
    actions: [CrmAction('Архивировать', 'archive/')],
  ),
  const CrmResource(
    'whatsapp',
    'Интеграция WhatsApp',
    '/messaging/whatsapp/accounts/',
    icon: Icons.chat_outlined,
    createPath: '/messaging/whatsapp/accounts/create/',
    actions: [CrmAction('Проверить подключение', 'test/')],
  ),
  const CrmResource(
    'telegram',
    'Интеграция Telegram',
    '/messaging/telegram/accounts/',
    icon: Icons.send_outlined,
    createPath: '/messaging/telegram/accounts/create/',
    actions: [
      CrmAction('Проверить подключение', 'test/'),
      CrmAction('Настроить webhook', 'webhook/'),
    ],
  ),
  const CrmResource(
    'ab_testing',
    'A/B-тестирование',
    '/ai/ab-testing/campaigns/',
    icon: Icons.science_outlined,
  ),
  const CrmResource(
    'ai_settings',
    'Настройки AI',
    '/ai/settings/',
    fields: {
      'api_url': {'type': 'string'},
      'api_key': {'type': 'string'},
      'model': {'type': 'string'},
      'temperature': {'type': 'decimal'},
      'max_tokens': {'type': 'integer'},
      'timeout': {'type': 'integer'},
      'enabled': {'type': 'boolean'},
    },
    icon: Icons.settings_suggest_outlined,
    singleton: true,
    actions: [CrmAction('Проверить подключение', 'test/')],
  ),
  const CrmResource(
    'cabinet_projects',
    'Проекты в кабинете',
    '/cabinet/projects/',
    icon: Icons.folder_shared_outlined,
    actions: [
      CrmAction(
        'Обратная связь',
        'feedback/',
        fields: {
          'rating': {'type': 'integer'},
          'content': _string,
        },
      ),
      CrmAction('Создать ссылку доступа', 'share-link/'),
    ],
  ),
  const CrmResource(
    'cabinet_documents',
    'Документы в кабинете',
    '/cabinet/documents/',
    icon: Icons.description_outlined,
    detail: false,
  ),
  const CrmResource(
    'cabinet_invoices',
    'Счета в кабинете',
    '/cabinet/invoices/',
    icon: Icons.receipt_outlined,
    detail: false,
  ),
  const CrmResource(
    'cabinet_payments',
    'Оплаты в кабинете',
    '/cabinet/payments/',
    icon: Icons.payments_outlined,
    detail: false,
  ),
  const CrmResource(
    'cabinet_messages',
    'Сообщения в кабинете',
    '/cabinet/messages/',
    icon: Icons.chat_outlined,
    detail: false,
  ),
  const CrmResource(
    'business_summary',
    'Бизнес-аналитика',
    '/analytics/business/summary/',
    icon: Icons.analytics_outlined,
    singleton: true,
  ),
  const CrmResource(
    'business_revenue',
    'Выручка',
    '/analytics/business/revenue/',
    icon: Icons.show_chart,
    singleton: true,
  ),
  const CrmResource(
    'business_funnel',
    'Воронка продаж',
    '/analytics/business/funnel/',
    icon: Icons.filter_alt_outlined,
    singleton: true,
  ),
  const CrmResource(
    'business_sources',
    'Источники клиентов',
    '/analytics/business/sources/',
    icon: Icons.hub_outlined,
    singleton: true,
  ),
  const CrmResource(
    'business_managers',
    'Показатели менеджеров',
    '/analytics/business/managers/',
    icon: Icons.people_outline,
    singleton: true,
  ),
  const CrmResource(
    'business_ltv',
    'Ценность клиентов',
    '/analytics/business/ltv/',
    icon: Icons.trending_up,
    singleton: true,
  ),
  const CrmResource(
    'business_retention',
    'Удержание клиентов',
    '/analytics/business/retention/',
    icon: Icons.repeat,
    singleton: true,
  ),
  const CrmResource(
    'business_churn',
    'Отток клиентов',
    '/analytics/business/churn/',
    icon: Icons.person_remove_outlined,
    singleton: true,
  ),
  const CrmResource(
    'workload',
    'Загрузка команды',
    '/analytics/metrics/workload/',
    icon: Icons.groups,
    singleton: true,
  ),
  const CrmResource(
    'capacity',
    'Планирование ресурсов',
    '/analytics/capacity/',
    icon: Icons.calendar_month,
    singleton: true,
  ),
];
CrmResource crmResource(String key) =>
    crmResources.firstWhere((r) => r.key == key);

const abGenerationFields = <String, dynamic>{
  'campaign_name': {'type': 'string', 'required': true},
  'campaign_id': {'type': 'string'},
  'project_name': {'type': 'string', 'required': true},
  'client_name': {'type': 'string', 'required': true},
  'client_id': {'type': 'field'},
  'lead_id': {'type': 'field'},
  'focuses': {
    'type': 'list',
    'required': true,
    'choices': [
      {'value': 'price', 'display_name': 'Цена'},
      {'value': 'timeline', 'display_name': 'Сроки'},
      {'value': 'quality', 'display_name': 'Качество'},
      {'value': 'features', 'display_name': 'Функциональность'},
      {'value': 'support', 'display_name': 'Поддержка'},
      {'value': 'roi', 'display_name': 'Окупаемость'},
      {'value': 'cases', 'display_name': 'Кейсы'},
    ],
  },
};
