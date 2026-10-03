import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/api_config.dart';
import 'crm_api.dart';
import 'crm_form.dart';
import 'crm_labels.dart';
import 'crm_resources.dart';
import 'crm_planning.dart';
import '../focus/focus_screen.dart';

class CrmWorkspaceMenu extends StatelessWidget {
  const CrmWorkspaceMenu({super.key, this.group});
  final String? group;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        group == 'finance'
            ? 'Финансы'
            : group == 'analytics'
            ? 'Аналитика'
            : group == 'cabinet'
            ? 'Кабинет клиента'
            : 'Разделы CRM',
      ),
    ),
    body: ListView(
      children: [
        if (group == null)
          ListTile(
            leading: const Icon(Icons.timer_outlined),
            title: const Text('DEO Focus'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const FocusScreen()),
            ),
          ),
        if (group == null)
          ListTile(
            leading: const Icon(Icons.calendar_month),
            title: const Text('Календарь'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CrmCalendarScreen()),
            ),
          ),
        if (group == null || group == 'analytics')
          ListTile(
            leading: const Icon(Icons.grid_on),
            title: const Text('Тепловая карта загрузки'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CrmHeatmapScreen()),
            ),
          ),
        ...crmResources
            .where(
              (r) =>
                  group == null ||
                  (group == 'finance' && r.path.startsWith('/finance/')) ||
                  (group == 'analytics' && r.path.startsWith('/analytics/')) ||
                  (group == 'cabinet' && r.path.startsWith('/cabinet/')),
            )
            .map(
              (r) => ListTile(
                leading: Icon(r.icon),
                title: Text(r.title),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CrmResourceScreen(resource: r),
                  ),
                ),
              ),
            ),
      ],
    ),
  );
}

class CrmResourceScreen extends ConsumerStatefulWidget {
  const CrmResourceScreen({
    super.key,
    required this.resource,
    this.params = const {},
  });
  final CrmResource resource;
  final Map<String, dynamic> params;
  @override
  ConsumerState<CrmResourceScreen> createState() => _CrmResourceScreenState();
}

class _CrmResourceScreenState extends ConsumerState<CrmResourceScreen> {
  dynamic _data;
  String? _error;
  String? _next;
  Map<String, dynamic>? _metadata;
  bool _loading = true;
  bool _moreLoading = false;
  var _query = '';
  DateTimeRange? _period;
  Map<String, dynamic> get _params => {
    ...widget.params,
    if (_period != null) 'period': 'custom',
    if (_period != null)
      'start_date': _period!.start.toIso8601String().split('T').first,
    if (_period != null)
      'end_date': _period!.end.toIso8601String().split('T').first,
  };
  var _page = 1;
  bool _board = false;
  String _taskView = '';
  String get _listPath => _board
      ? '${widget.resource.path}kanban/'
      : _taskView.isNotEmpty
      ? '/tasks/$_taskView/'
      : widget.resource.path;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _page = 1;
    });
    try {
      final api = ref.read(crmApiProvider);
      final data = await api.get(
        widget.resource.dataPath ?? _listPath,
        params: {..._params, 'search': _query, 'page_size': 50},
      );
      Map<String, dynamic>? metadata;
      try {
        metadata = await api.metadata(
          widget.resource.createPath ?? widget.resource.path,
        );
      } catch (_) {}
      if (mounted) {
        setState(() {
          _data = widget.resource.dataKey == null
              ? data
              : (data as Map)[widget.resource.dataKey];
          _metadata = metadata;
          _next = widget.resource.dataKey == null && data is Map
              ? data['next'] as String?
              : null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _more() async {
    if (_moreLoading || _next == null) return;
    setState(() => _moreLoading = true);
    try {
      final data = await ref
          .read(crmApiProvider)
          .get(
            _listPath,
            params: {
              ..._params,
              'search': _query,
              'page_size': 50,
              'page': _page + 1,
            },
          );
      if (mounted) {
        setState(() {
          final old = _data as Map;
          _data = {
            ...old,
            'results': [
              ...old['results'] as List,
              ...(data as Map)['results'] as List,
            ],
            'next': data['next'],
          };
          _next = data['next'] as String?;
          _page++;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    } finally {
      if (mounted) setState(() => _moreLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.resource;
    final methods = _metadata?['_methods'] as List? ?? [];
    final canCreate =
        (_metadata?['actions'] as Map?)?.containsKey('POST') == true ||
        (r.fields != null && methods.contains('POST'));
    return Scaffold(
      appBar: AppBar(
        title: Text(r.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Обновить',
            onPressed: _loading ? null : _load,
          ),
          if (['leads', 'tasks'].contains(r.key))
            IconButton(
              icon: Icon(_board ? Icons.view_list : Icons.view_kanban_outlined),
              tooltip: _board ? 'Список' : 'Доска',
              onPressed: () {
                _board = !_board;
                _load();
              },
            ),
          if (r.key == 'tasks')
            PopupMenuButton<String>(
              icon: const Icon(Icons.filter_list),
              onSelected: (value) {
                _taskView = value;
                _board = false;
                _load();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: '', child: Text('Все задачи')),
                PopupMenuItem(value: 'my', child: Text('Мои задачи')),
                PopupMenuItem(
                  value: 'upcoming',
                  child: Text('Ближайшие сроки'),
                ),
              ],
            ),
          if (r.key == 'catalog')
            PopupMenuButton<String>(
              onSelected: (value) async {
                if (value == 'import') {
                  if (await editCrmRecord(
                        context,
                        title: 'Импорт каталога',
                        path: '/catalog/import/',
                        fields: const {
                          'file': {'type': 'file', 'required': true},
                        },
                      ) &&
                      mounted) {
                    _load();
                  }
                } else if (value == 'bulk') {
                  if (await editCrmRecord(
                        context,
                        title: 'Массовое изменение каталога',
                        path: '/catalog/bulk/',
                        fields: const {
                          'action': {
                            'type': 'choice',
                            'required': true,
                            'choices': [
                              {
                                'value': 'change_status',
                                'display_name': 'Сменить статус',
                              },
                              {
                                'value': 'change_category',
                                'display_name': 'Сменить категорию',
                              },
                              {
                                'value': 'adjust_price',
                                'display_name': 'Изменить цены на %',
                              },
                              {'value': 'delete', 'display_name': 'Удалить'},
                            ],
                          },
                          'ids': {'type': 'list', 'required': true},
                          'status': {
                            'type': 'choice',
                            'choices': [
                              {'value': 'active', 'display_name': 'Активный'},
                              {
                                'value': 'inactive',
                                'display_name': 'Неактивный',
                              },
                              {'value': 'archived', 'display_name': 'Архив'},
                            ],
                          },
                          'category': {'type': 'field'},
                          'percent': {'type': 'decimal'},
                        },
                      ) &&
                      mounted) {
                    _load();
                  }
                } else {
                  await _export('/catalog/export/', 'catalog.csv');
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'import', child: Text('Импорт CSV')),
                PopupMenuItem(value: 'export', child: Text('Экспорт CSV')),
                PopupMenuItem(value: 'bulk', child: Text('Массовое изменение')),
              ],
            ),
          if (r.path.startsWith('/analytics/business/'))
            IconButton(
              icon: const Icon(Icons.date_range),
              tooltip: 'Период',
              onPressed: () async {
                final period = await showDateRangePicker(
                  context: context,
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2100),
                  initialDateRange: _period,
                );
                if (period != null && mounted) {
                  _period = period;
                  _load();
                }
              },
            ),
          if (r.path.startsWith('/analytics/business/'))
            IconButton(
              icon: const Icon(Icons.download_outlined),
              tooltip: 'Экспорт',
              onPressed: () =>
                  _export('/analytics/business/export/', 'analytics.csv'),
            ),
          if (canCreate && !r.singleton)
            IconButton(
              icon: const Icon(Icons.add),
              tooltip: 'Создать',
              onPressed: () async {
                if (await editCrmRecord(
                      context,
                      title: 'Создать: ${r.title}',
                      path: r.createPath ?? r.path,
                      fields: r.fields,
                    ) &&
                    mounted) {
                  _load();
                }
              },
            ),
          if (r.singleton && methods.contains('PUT'))
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: () async {
                if (await editCrmRecord(
                      context,
                      title: r.title,
                      path: r.path,
                      method: 'PUT',
                      fields: r.fields,
                      initial: _data is Map
                          ? Map<String, dynamic>.from(_data)
                          : {},
                    ) &&
                    mounted) {
                  _load();
                }
              },
            ),
        ],
      ),
      body: Column(
        children: [
          if (!r.singleton)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: TextField(
                decoration: const InputDecoration(
                  hintText: 'Поиск',
                  prefixIcon: Icon(Icons.search),
                ),
                onSubmitted: (v) {
                  _query = v;
                  _load();
                },
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: _load,
                            child: const Text('Повторить'),
                          ),
                        ],
                      ),
                    ),
                  )
                : RefreshIndicator(onRefresh: _load, child: _content()),
          ),
        ],
      ),
    );
  }

  Future<void> _export(String path, String filename) async {
    try {
      final response = await ref
          .read(crmApiProvider)
          .dio
          .get<List<int>>(
            path,
            queryParameters: _params,
            options: Options(responseType: ResponseType.bytes),
          );
      await FilePicker.platform.saveFile(
        dialogTitle: 'Сохранить файл',
        fileName: filename,
        bytes: Uint8List.fromList(response.data!),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(crmError(e))));
      }
    }
  }

  Widget _content() {
    final r = widget.resource;
    final items = _data is Map ? (_data['results'] ?? _data['items']) : _data;
    if (_board && items is List) {
      return ListView(
        scrollDirection: Axis.horizontal,
        children: items.whereType<Map>().map((column) {
          final rows = (column['leads'] ?? column['tasks'] ?? []) as List;
          return SizedBox(
            width: 300,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    '${column['title']} (${rows.length})',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Expanded(
                  child: ListView(
                    children: rows
                        .whereType<Map>()
                        .where(
                          (e) => recordTitle(
                            Map<String, dynamic>.from(e),
                          ).toLowerCase().contains(_query.toLowerCase()),
                        )
                        .map(
                          (item) => Card(
                            child: ListTile(
                              title: Text(
                                recordTitle(Map<String, dynamic>.from(item)),
                              ),
                              subtitle: Text(
                                '${item['budget'] ?? item['assignee_name'] ?? ''}',
                              ),
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => CrmRecordScreen(
                                      resource: r,
                                      row: Map<String, dynamic>.from(item),
                                    ),
                                  ),
                                );
                                if (mounted) _load();
                              },
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      );
    }
    if (items is! List) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CrmDataView(data: _data),
          if (r.singleton)
            ...r.actions.map(
              (action) => OutlinedButton(
                onPressed: () async {
                  try {
                    final result = await ref
                        .read(crmApiProvider)
                        .save('${r.path}${action.suffix}', action.data);
                    if (mounted) {
                      showDialog<void>(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: Text(action.title),
                          content: SingleChildScrollView(
                            child: CrmDataView(data: result),
                          ),
                        ),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(SnackBar(content: Text(crmError(e))));
                    }
                  }
                },
                child: Text(action.title),
              ),
            ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: Text('Записей пока нет')),
          ),
        ...items.whereType<Map>().map((item) {
          final row = Map<String, dynamic>.from(item);
          if (r.singleton) {
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: CrmDataView(data: row),
              ),
            );
          }
          return Card(
            child: ListTile(
              title: Text(recordTitle(row)),
              subtitle: Text(
                [
                  row['status_name'] ?? row['stage_name'] ?? row['status'],
                  row['client_name'] ?? row['email'] ?? row['phone'],
                  row['amount'] ?? row['total'] ?? row['budget'],
                ].where((e) => e != null && '$e'.isNotEmpty).join(' · '),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () async {
                await Navigator.push<void>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CrmRecordScreen(resource: r, row: row),
                  ),
                );
                if (mounted) _load();
              },
            ),
          );
        }),
        if (_next != null)
          TextButton(
            onPressed: _moreLoading ? null : _more,
            child: Text(_moreLoading ? 'Загрузка…' : 'Загрузить ещё'),
          ),
      ],
    );
  }
}

class CrmRecordScreen extends ConsumerStatefulWidget {
  const CrmRecordScreen({super.key, required this.resource, required this.row});
  final CrmResource resource;
  final Map<String, dynamic> row;
  @override
  ConsumerState<CrmRecordScreen> createState() => _CrmRecordScreenState();
}

class _CrmRecordScreenState extends ConsumerState<CrmRecordScreen> {
  late Map<String, dynamic> _record;
  Map<String, dynamic>? _metadata;
  bool _loading = true;
  String? _error;
  String get _path => widget.resource.recordPath(widget.row);
  @override
  void initState() {
    super.initState();
    _record = widget.row;
    _load();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(crmApiProvider);
      if (widget.resource.detail) {
        final data = await api.get(_path);
        if (mounted) {
          setState(() => _record = Map<String, dynamic>.from(data as Map));
        }
      }
      try {
        final meta = await api.metadata(_path);
        if (mounted) _metadata = meta;
      } catch (_) {}
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _action(CrmAction action) async {
    try {
      if (action.fields.isNotEmpty) {
        if (await editCrmRecord(
              context,
              title: action.title,
              path: action.suffix.startsWith('/')
                  ? action.suffix
                  : '$_path${action.suffix}',
              fields: action.fields,
              initial: action.data,
            ) &&
            mounted) {
          _load();
        }
        return;
      }
      final api = ref.read(crmApiProvider);
      final path = action.method == 'READ_ARTICLE'
          ? '/learning/read/${widget.row['slug']}/'
          : action.suffix.startsWith('/')
          ? action.suffix
          : '$_path${action.suffix}';
      final result = action.method == 'GET'
          ? await api.get(path)
          : await api.save(path, action.data);
      if (!mounted) return;
      if (action.method == 'GET' && result is Map && result['url'] is String) {
        final url = Uri.parse(
          ApiConfig.baseUrl,
        ).resolve(result['url'] as String);
        if (!['http', 'https'].contains(url.scheme)) {
          throw StateError('Ссылка на файл недоступна');
        }
        if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
          throw StateError('Не удалось открыть файл');
        }
      } else {
        showDialog<void>(
          context: context,
          builder: (_) => AlertDialog(
            title: Text(action.title),
            content: SingleChildScrollView(child: CrmDataView(data: result)),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Закрыть'),
              ),
            ],
          ),
        );
      }
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(crmError(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.resource;
    final actions = _metadata?['actions'] as Map? ?? {};
    return Scaffold(
      appBar: AppBar(
        title: Text(recordTitle(_record)),
        actions: [
          if (actions.containsKey('PUT') || actions.containsKey('PATCH'))
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: () async {
                if (await editCrmRecord(
                      context,
                      title: 'Редактировать',
                      path: _path,
                      method: 'PATCH',
                      initial: _record,
                    ) &&
                    mounted) {
                  _load();
                }
              },
            ),
          if ((_metadata?['_methods'] as List? ?? []).contains('DELETE'))
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Удалить',
              onPressed: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Удалить запись?'),
                    content: Text(recordTitle(_record)),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Отмена'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Удалить'),
                      ),
                    ],
                  ),
                );
                if (confirmed != true) return;
                try {
                  await ref.read(crmApiProvider).delete(_path);
                  if (context.mounted) Navigator.pop(context);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(SnackBar(content: Text(crmError(e))));
                  }
                }
              },
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null)
                  Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                CrmDataView(data: _record),
                const SizedBox(height: 16),
                ...r.actions.map(
                  (action) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: OutlinedButton(
                      onPressed: () => _action(action),
                      child: Text(action.title),
                    ),
                  ),
                ),
                if (r.key == 'ab_testing') ...[
                  OutlinedButton(
                    onPressed: () => _action(
                      CrmAction(
                        'Создать варианты КП',
                        '/ai/ab-testing/generate/',
                        fields: abGenerationFields,
                        data: {
                          'campaign_id': widget.row['id'],
                          'campaign_name': _record['name'],
                        },
                      ),
                    ),
                    child: const Text('Создать варианты КП'),
                  ),
                  ...((_record['variants'] as List?) ?? []).whereType<Map>().map(
                    (variant) => Card(
                      child: Column(
                        children: [
                          ListTile(
                            title: Text('${variant['focus']}'),
                            subtitle: Text('${variant['content'] ?? ''}'),
                          ),
                          TextButton(
                            onPressed: () => _action(
                              CrmAction(
                                'Событие варианта',
                                '/ai/ab-testing/variants/${variant['id']}/track/',
                                fields: const {
                                  'event_type': {
                                    'type': 'choice',
                                    'required': true,
                                    'choices': [
                                      {
                                        'value': 'sent',
                                        'display_name': 'Отправлено',
                                      },
                                      {
                                        'value': 'viewed',
                                        'display_name': 'Просмотрено',
                                      },
                                      {
                                        'value': 'converted',
                                        'display_name': 'Конверсия',
                                      },
                                    ],
                                  },
                                  'lead_id': {'type': 'field'},
                                  'invoice_id': {'type': 'field'},
                                  'notes': {'type': 'string'},
                                },
                              ),
                            ),
                            child: const Text(
                              'Отправка / просмотр / конверсия',
                            ),
                          ),
                          TextButton(
                            onPressed: () => _action(
                              CrmAction(
                                'Конверсии',
                                '/ai/ab-testing/variants/${variant['id']}/conversions/',
                                method: 'GET',
                              ),
                            ),
                            child: const Text('История конверсий'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                ...r.relations.map(
                  (relation) => ListTile(
                    title: Text(relation.title),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => CrmResourceScreen(
                          resource: CrmResource(
                            '${r.key}_${relation.suffix}',
                            relation.title,
                            '$_path${relation.suffix}',
                            detail: false,
                            idField:
                                relation.suffix == 'team/' ||
                                    relation.suffix == 'participants/'
                                ? 'user'
                                : 'id',
                            dataPath: relation.suffix == 'certificates/'
                                ? '${_path}profile/'
                                : relation.suffix == 'tags/' ||
                                      relation.suffix == 'participants/'
                                ? _path
                                : null,
                            dataKey:
                                [
                                  'certificates/',
                                  'tags/',
                                  'participants/',
                                ].contains(relation.suffix)
                                ? relation.suffix.replaceAll('/', '')
                                : null,
                            fields: relation.suffix == 'tags/'
                                ? const {
                                    'tags': {'type': 'list', 'required': true},
                                  }
                                : relation.suffix == 'participants/'
                                ? const {
                                    'user_ids': {
                                      'type': 'list',
                                      'required': true,
                                    },
                                  }
                                : null,
                            singleton: relation.suffix == 'profile/',
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                if (r.key == 'tasks')
                  ListTile(
                    title: const Text('Создать подзадачу'),
                    leading: const Icon(Icons.add_task),
                    onTap: () async {
                      if (await editCrmRecord(
                            context,
                            title: 'Подзадача',
                            path: '/tasks/',
                            initial: {
                              'parent_task': widget.row['id'],
                              'project': _record['project'],
                            },
                          ) &&
                          mounted) {
                        _load();
                      }
                    },
                  ),
                if (r.key == 'cabinet_projects' &&
                    _record['milestones'] is List)
                  ...(_record['milestones'] as List).whereType<Map>().map(
                    (milestone) => Card(
                      child: Column(
                        children: [
                          CrmDataView(data: milestone),
                          Row(
                            children: [
                              TextButton(
                                onPressed: () => _action(
                                  CrmAction(
                                    'Согласовать этап',
                                    'milestones/${milestone['id']}/approve/',
                                  ),
                                ),
                                child: const Text('Согласовать'),
                              ),
                              TextButton(
                                onPressed: () => _action(
                                  CrmAction(
                                    'Отклонить этап',
                                    'milestones/${milestone['id']}/reject/',
                                    fields: const {
                                      'reason': {
                                        'type': 'string',
                                        'required': true,
                                      },
                                    },
                                  ),
                                ),
                                child: const Text('Отклонить'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

class CrmDataView extends StatelessWidget {
  const CrmDataView({super.key, required this.data, this.depth = 0});
  final dynamic data;
  final int depth;
  @override
  Widget build(BuildContext context) {
    if (data == null) return const Text('Нет данных');
    if (data is List) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: (data as List)
            .map(
              (e) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: CrmDataView(data: e, depth: depth + 1),
                ),
              ),
            )
            .toList(),
      );
    }
    if (data is Map && depth < 6) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: (data as Map).entries
            .where(
              (e) =>
                  ![
                    'id',
                    'created_by',
                    'status_color',
                    'stage_color',
                    'priority_color',
                  ].contains(e.key) &&
                  e.value != null,
            )
            .map((e) {
              final title = crmLabel('${e.key}');
              if (e.value is Map || e.value is List) {
                return ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: Text(title),
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: CrmDataView(data: e.value, depth: depth + 1),
                    ),
                  ],
                );
              }
              final value = e.value is bool
                  ? (e.value ? 'Да' : 'Нет')
                  : '${e.value}';
              final uri = Uri.tryParse(value);
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 3),
                    if (uri != null && ['https', 'http'].contains(uri.scheme))
                      TextButton(
                        onPressed: () => launchUrl(
                          uri,
                          mode: LaunchMode.externalApplication,
                        ),
                        child: Text(value),
                      )
                    else
                      SelectableText(value),
                  ],
                ),
              );
            })
            .toList(),
      );
    }
    return SelectableText('$data');
  }
}
