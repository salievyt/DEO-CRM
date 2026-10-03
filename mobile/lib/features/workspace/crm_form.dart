import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'crm_api.dart';
import 'crm_labels.dart';

Future<bool> editCrmRecord(
  BuildContext context, {
  required String title,
  required String path,
  String method = 'POST',
  Map<String, dynamic>? fields,
  Map<String, dynamic> initial = const {},
  String? metadataPath,
}) async =>
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => CrmFormScreen(
          title: title,
          path: path,
          method: method,
          fields: fields,
          initial: initial,
          metadataPath: metadataPath,
        ),
      ),
    ) ??
    false;

class CrmFormScreen extends ConsumerStatefulWidget {
  const CrmFormScreen({
    super.key,
    required this.title,
    required this.path,
    this.method = 'POST',
    this.fields,
    this.initial = const {},
    this.metadataPath,
  });
  final String title, path, method;
  final Map<String, dynamic>? fields;
  final Map<String, dynamic> initial;
  final String? metadataPath;
  @override
  ConsumerState<CrmFormScreen> createState() => _CrmFormScreenState();
}

class _CrmFormScreenState extends ConsumerState<CrmFormScreen> {
  Map<String, dynamic>? _fields;
  final Map<String, dynamic> _values = {};
  final Map<String, TextEditingController> _controllers = {};
  String? _error;
  bool _saving = false;
  bool _multipart = false;
  final _form = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      var fields = widget.fields;
      if (fields == null) {
        final metadata = await ref
            .read(crmApiProvider)
            .metadata(widget.metadataPath ?? widget.path);
        final parses = metadata['parses'] as List? ?? [];
        _multipart =
            !parses.contains('application/json') &&
            parses.contains('multipart/form-data');
        final actions = metadata['actions'] as Map? ?? {};
        fields = Map<String, dynamic>.from(
          (actions[widget.method] ?? actions['PUT'] ?? actions['POST'] ?? {})
              as Map,
        );
      }
      if (fields.isEmpty) {
        throw StateError(
          'Для этой операции сервер не предоставил форму или у вас нет права на изменение.',
        );
      }
      for (final entry in fields.entries) {
        if ((entry.value as Map)['read_only'] == true) continue;
        if (widget.initial.containsKey(entry.key)) {
          _values[entry.key] = widget.initial[entry.key];
        } else if ((entry.value as Map).containsKey('default')) {
          _values[entry.key] = (entry.value as Map)['default'];
        }
      }
      if (mounted) setState(() => _fields = fields);
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final payload = <String, dynamic>{};
      for (final entry in _fields!.entries) {
        final spec = entry.value as Map;
        if (spec['read_only'] == true || !_values.containsKey(entry.key)) {
          continue;
        }
        final value = _values[entry.key];
        if (value == '' &&
            spec['required'] != true &&
            widget.method == 'POST') {
          continue;
        }
        payload[entry.key] =
            value == '' && spec['type'] != 'string' && spec['type'] != 'email'
            ? null
            : value;
      }
      if (payload['action'] == 'delete') {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Удалить выбранные записи?'),
            content: const Text(
              'Это действие удалит выбранные позиции каталога.',
            ),
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
      }
      dynamic body = payload;
      if (_multipart || payload.values.any((value) => value is PlatformFile)) {
        final multipart = <String, dynamic>{};
        for (final entry in payload.entries) {
          final value = entry.value;
          multipart[entry.key] = value is PlatformFile
              ? (value.bytes != null
                    ? MultipartFile.fromBytes(
                        value.bytes!,
                        filename: value.name,
                      )
                    : await MultipartFile.fromFile(
                        value.path!,
                        filename: value.name,
                      ))
              : value is List || value is Map
              ? jsonEncode(value)
              : value;
        }
        body = FormData.fromMap(multipart);
      }
      final response = await ref
          .read(crmApiProvider)
          .save(widget.path, body, method: widget.method);
      if (mounted &&
          response is Map &&
          (response.containsKey('output') ||
              response.containsKey('recovery_codes') ||
              widget.path.endsWith('/test/') ||
              widget.path.endsWith('/generate/') ||
              widget.path.endsWith('/bulk/'))) {
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Результат'),
            content: SingleChildScrollView(
              child: SelectableText(
                response['output']?.toString() ??
                    response.entries
                        .map((e) => '${crmLabel(e.key.toString())}: ${e.value}')
                        .join('\n'),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Закрыть'),
              ),
            ],
          ),
        );
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.title)),
    body: _fields == null
        ? Center(
            child: _error == null
                ? const CircularProgressIndicator()
                : Padding(
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
        : Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ..._fields!.entries
                    .where((entry) => (entry.value as Map)['read_only'] != true)
                    .map(
                      (entry) => Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _field(
                          entry.key,
                          Map<String, dynamic>.from(entry.value as Map),
                        ),
                      ),
                    ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Сохранить'),
                ),
              ],
            ),
          ),
  );

  Widget _field(String key, Map<String, dynamic> spec) {
    final title = crmLabel(key, spec['label'] as String?);
    final type = spec['type'];
    final value = _values[key];
    if (type == 'boolean') {
      return SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(title),
        value: value == true,
        onChanged: (v) => setState(() => _values[key] = v),
      );
    }
    if (['file', 'image', 'file upload', 'image upload'].contains(type)) {
      return ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(title),
        subtitle: Text(value is PlatformFile ? value.name : 'Выбрать файл'),
        trailing: const Icon(Icons.attach_file),
        onTap: () async {
          final result = await FilePicker.platform.pickFiles(withData: true);
          if (result != null && mounted) {
            setState(() => _values[key] = result.files.single);
          }
        },
      );
    }
    final lookup = _lookup(key);
    final choices = spec['choices'] as List?;
    if (lookup != null || choices != null) {
      return FormField<dynamic>(
        initialValue: value,
        validator: (_) => spec['required'] == true && _values[key] == null
            ? 'Выберите значение'
            : null,
        builder: (field) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(title),
              subtitle: Text(
                _controllers['label:$key']?.text ??
                    (value is List
                        ? 'Выбрано: ${value.length}'
                        : value == null
                        ? 'Выбрать'
                        : '${widget.initial['${key}_name'] ?? (key == 'current_stage' ? widget.initial['stage_name'] : null) ?? 'Выбрано'}'),
              ),
              trailing: const Icon(Icons.expand_more),
              onTap: () async {
                try {
                  final items = choices != null
                      ? choices
                            .map((e) => Map<String, dynamic>.from(e as Map))
                            .toList()
                      : (await ref.read(crmApiProvider).choices(lookup!))
                            .map(
                              (e) => {
                                'value': e['id'],
                                'display_name': recordTitle(e),
                              },
                            )
                            .toList();
                  if (!mounted) return;
                  final selected = await _select(
                    title,
                    items,
                    multiple:
                        type == 'list' ||
                        key == 'participant_ids' ||
                        key == 'user_ids',
                  );
                  if (selected != null && mounted) {
                    setState(() {
                      _values[key] = selected.$1;
                      (_controllers['label:$key'] ??= TextEditingController())
                              .text =
                          selected.$2;
                    });
                    field.didChange(selected.$1);
                  }
                } catch (e) {
                  if (mounted) setState(() => _error = crmError(e));
                }
              },
            ),
            if (field.hasError)
              Text(
                field.errorText!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
          ],
        ),
      );
    }
    if (type == 'list' || key == 'keywords' || key == 'allowed_roles') {
      final child = spec['child'] as Map?;
      final children = child?['children'] as Map?;
      if (children != null ||
          ['items', 'package_items', 'form_fields'].contains(key)) {
        return _rows(
          key,
          title,
          children == null
              ? _nestedFields(key)
              : Map<String, dynamic>.from(children),
        );
      }
      final controller = _controllers.putIfAbsent(
        key,
        () =>
            TextEditingController(text: value is List ? value.join('\n') : ''),
      );
      return TextFormField(
        controller: controller,
        minLines: 2,
        maxLines: 6,
        decoration: InputDecoration(
          labelText: title,
          helperText: 'Каждое значение с новой строки',
        ),
        onChanged: (v) => _values[key] = v
            .split('\n')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList(),
      );
    }
    if (type == 'nested object' ||
        [
          'form_fields',
          'items',
          'package_items',
          'action_config',
          'lead_field_map',
          'variables',
        ].contains(key) ||
        type == 'json object') {
      if (['form_fields', 'items', 'package_items'].contains(key)) {
        return _rows(key, title, _nestedFields(key));
      }
      if (key == 'keywords') return _field(key, {...spec, 'type': 'list'});
      final children = spec['children'] as Map?;
      return ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(title),
        subtitle: const Text('Настроить поля'),
        trailing: const Icon(Icons.edit),
        onTap: () async {
          final result = await _editNested(
            title,
            children == null
                ? _nestedFields(key)
                : Map<String, dynamic>.from(children),
            value is Map ? Map<String, dynamic>.from(value) : {},
          );
          if (result != null && mounted) setState(() => _values[key] = result);
        },
      );
    }
    final controller = _controllers.putIfAbsent(
      key,
      () => TextEditingController(text: value == null ? '' : '$value'),
    );
    final numeric = ['integer', 'decimal', 'float'].contains(type);
    final date = ['date', 'datetime'].contains(type);
    return TextFormField(
      controller: controller,
      obscureText: [
        'password',
        'old_password',
        'new_password',
        'api_key',
        'access_token',
        'bot_token',
      ].contains(key),
      keyboardType: numeric
          ? const TextInputType.numberWithOptions(decimal: true, signed: true)
          : type == 'email'
          ? TextInputType.emailAddress
          : TextInputType.text,
      minLines:
          [
            'description',
            'content',
            'text',
            'notes',
            'reply_text',
            'system_prompt',
          ].contains(key)
          ? 3
          : 1,
      maxLines:
          [
            'description',
            'content',
            'text',
            'notes',
            'reply_text',
            'system_prompt',
          ].contains(key)
          ? 8
          : 1,
      decoration: InputDecoration(
        labelText: '$title${spec['required'] == true ? ' *' : ''}',
        suffixIcon: date
            ? IconButton(
                icon: const Icon(Icons.calendar_today),
                onPressed: () async {
                  final chosen = await showDatePicker(
                    context: context,
                    initialDate:
                        DateTime.tryParse(controller.text) ?? DateTime.now(),
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2100),
                  );
                  if (chosen == null || !mounted) return;
                  var result = chosen;
                  if (type == 'datetime') {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: TimeOfDay.now(),
                    );
                    if (time == null) return;
                    result = DateTime(
                      chosen.year,
                      chosen.month,
                      chosen.day,
                      time.hour,
                      time.minute,
                    );
                  }
                  final text = type == 'date'
                      ? result.toIso8601String().split('T').first
                      : result.toUtc().toIso8601String();
                  controller.text = text;
                  _values[key] = text;
                },
              )
            : null,
      ),
      validator: (v) {
        if (spec['required'] == true && (v == null || v.trim().isEmpty)) {
          return 'Заполните поле';
        }
        if (v != null &&
            v.isNotEmpty &&
            numeric &&
            num.tryParse(v.replaceAll(',', '.')) == null) {
          return 'Введите число';
        }
        if (v != null && v.isNotEmpty && date && DateTime.tryParse(v) == null) {
          return 'Укажите корректную дату';
        }
        return null;
      },
      onChanged: (v) => _values[key] = numeric && v.isNotEmpty
          ? num.tryParse(v.replaceAll(',', '.'))
          : v,
    );
  }

  String? _lookup(String key) {
    if (key == 'tags') return '/clients/tags/';
    if (key == 'ids' && widget.path.startsWith('/catalog/')) {
      return '/catalog/items/';
    }
    if (key == 'status' || key == 'status_id') {
      if (widget.path.startsWith('/tasks/')) return '/tasks/statuses/';
      if (widget.path.startsWith('/projects/')) return '/projects/statuses/';
      if (widget.path.startsWith('/clients/')) return '/clients/statuses/';
    }
    if (key == 'priority' && widget.path.startsWith('/tasks/')) {
      return '/tasks/priorities/';
    }
    if (key == 'current_stage' || key == 'stage_id') return '/leads/stages/';
    if (key == 'category' &&
        (widget.path.startsWith('/catalog/') ||
            widget.path.startsWith('/finance/'))) {
      return widget.path.startsWith('/catalog/')
          ? '/catalog/categories/'
          : '/finance/expense-categories/';
    }
    return crmLookups[key];
  }

  Future<(dynamic, String)?> _select(
    String title,
    List<Map<String, dynamic>> items, {
    bool multiple = false,
  }) async {
    final selected = <dynamic>[];
    var query = '';
    return showModalBottomSheet<(dynamic, String)>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, update) => SafeArea(
          child: SizedBox(
            height: MediaQuery.sizeOf(context).height * .8,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    decoration: InputDecoration(
                      labelText: title,
                      hintText: 'Поиск',
                    ),
                    onChanged: (v) => update(() => query = v.toLowerCase()),
                  ),
                ),
                Expanded(
                  child: ListView(
                    children: items
                        .where(
                          (e) => '${e['display_name']}'.toLowerCase().contains(
                            query,
                          ),
                        )
                        .map(
                          (e) => ListTile(
                            title: Text('${e['display_name']}'),
                            leading: multiple
                                ? Checkbox(
                                    value: selected.contains(e['value']),
                                    onChanged: (_) => update(() {
                                      selected.contains(e['value'])
                                          ? selected.remove(e['value'])
                                          : selected.add(e['value']);
                                    }),
                                  )
                                : null,
                            onTap: () {
                              if (multiple) {
                                update(
                                  () => selected.contains(e['value'])
                                      ? selected.remove(e['value'])
                                      : selected.add(e['value']),
                                );
                              } else {
                                Navigator.pop(context, (
                                  e['value'],
                                  '${e['display_name']}',
                                ));
                              }
                            },
                          ),
                        )
                        .toList(),
                  ),
                ),
                if (multiple)
                  FilledButton(
                    onPressed: () => Navigator.pop(context, (
                      selected,
                      'Выбрано: ${selected.length}',
                    )),
                    child: const Text('Готово'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _rows(String key, String title, Map<String, dynamic> fields) {
    final rows = (_values[key] as List? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            ...rows.asMap().entries.map(
              (entry) => ListTile(
                title: Text(recordTitle(entry.value)),
                subtitle: Text(
                  '${entry.value['quantity'] ?? entry.value['label'] ?? ''}',
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => setState(() {
                    rows.removeAt(entry.key);
                    _values[key] = rows;
                  }),
                ),
                onTap: () async {
                  final row = await _editNested(title, fields, entry.value);
                  if (row != null && mounted) {
                    setState(() {
                      rows[entry.key] = row;
                      _values[key] = rows;
                    });
                  }
                },
              ),
            ),
            TextButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('Добавить позицию'),
              onPressed: () async {
                final row = await _editNested(title, fields, {});
                if (row != null && mounted) {
                  setState(() => _values[key] = [...rows, row]);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<Map<String, dynamic>?> _editNested(
    String title,
    Map<String, dynamic> fields,
    Map<String, dynamic> initial,
  ) async {
    // Nested entries are edited locally; only the outer form submits to the API.
    return Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            NestedCrmForm(title: title, fields: fields, initial: initial),
      ),
    );
  }
}

Map<String, dynamic> _nestedFields(String key) {
  if (key == 'items') {
    return {
      'item': {'type': 'field', 'required': true},
      'quantity': {'type': 'decimal', 'required': true},
      'discount': {'type': 'decimal'},
      'tax': {'type': 'decimal'},
    };
  }
  if (key == 'package_items') {
    return {
      'item': {'type': 'field', 'required': true},
      'quantity': {'type': 'decimal', 'required': true},
    };
  }
  if (key == 'form_fields') {
    return {
      'key': {'type': 'string', 'required': true},
      'label': {'type': 'string', 'required': true},
      'type': {
        'type': 'choice',
        'choices': [
          'text',
          'textarea',
          'email',
          'phone',
          'select',
        ].map((e) => {'value': e, 'display_name': e}).toList(),
      },
      'required': {'type': 'boolean'},
      'options': {'type': 'list'},
    };
  }
  if (key == 'lead_field_map') {
    return {
      for (final name in [
        'contact_name',
        'company_name',
        'telegram',
        'phone',
        'email',
        'notes',
        'budget',
      ])
        name: {'type': 'string'},
    };
  }
  return {
    'title': {'type': 'string'},
    'description': {'type': 'string'},
    'days': {'type': 'integer'},
    'name': {'type': 'string'},
    'deadline': {'type': 'date'},
    'create_milestone': {'type': 'boolean'},
    'milestone_name': {'type': 'string'},
    'project_role': {'type': 'string'},
    'assignee': {
      'type': 'choice',
      'choices': [
        {'value': 'entity_owner', 'display_name': 'Ответственный'},
        {'value': 'owner', 'display_name': 'Владелец'},
      ],
    },
    'priority': {'type': 'string'},
  };
}

class NestedCrmForm extends CrmFormScreen {
  const NestedCrmForm({
    super.key,
    required super.title,
    required super.fields,
    required super.initial,
  }) : super(path: '');
  @override
  ConsumerState<CrmFormScreen> createState() => _NestedCrmFormState();
}

class _NestedCrmFormState extends _CrmFormScreenState {
  @override
  Future<void> _save() async {
    if (_form.currentState!.validate()) {
      Navigator.pop(context, Map<String, dynamic>.from(_values));
    }
  }
}
