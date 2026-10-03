import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'crm_api.dart';
import 'crm_resources.dart';
import 'crm_workspace.dart';

class CrmCalendarScreen extends ConsumerStatefulWidget {
  const CrmCalendarScreen({super.key});
  @override
  ConsumerState<CrmCalendarScreen> createState() => _CrmCalendarScreenState();
}

class _CrmCalendarScreenState extends ConsumerState<CrmCalendarScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  DateTime _day = DateTime.now();
  List<Map<String, dynamic>>? _events;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(crmApiProvider);
      final data = await Future.wait([
        api.choices('/tasks/upcoming/'),
        api.choices('/projects/'),
      ]);
      if (mounted) {
        setState(
          () => _events = [
            ...data[0]
                .where((e) => e['deadline'] != null)
                .map((e) => {...e, '_module': 'tasks'}),
            ...data[1]
                .where((e) => e['deadline'] != null)
                .map((e) => {...e, '_module': 'projects'}),
          ],
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final start = DateTime(_month.year, _month.month);
    final offset = start.weekday - 1;
    final days = DateTime(_month.year, _month.month + 1, 0).day;
    final selected = DateFormat('yyyy-MM-dd').format(_day);
    final events = (_events ?? []).where(
      (e) => '${e['deadline']}'.startsWith(selected),
    );
    return Scaffold(
      appBar: AppBar(
        title: const Text('Календарь'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _error != null
          ? Center(child: Text(_error!))
          : _events == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      onPressed: () => setState(
                        () => _month = DateTime(_month.year, _month.month - 1),
                      ),
                    ),
                    Text(
                      DateFormat.yMMMM('ru').format(_month),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      onPressed: () => setState(
                        () => _month = DateTime(_month.year, _month.month + 1),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                      .map((day) => Expanded(child: Center(child: Text(day))))
                      .toList(),
                ),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                  ),
                  itemCount: ((offset + days + 6) ~/ 7) * 7,
                  itemBuilder: (context, index) {
                    final day = index - offset + 1;
                    if (day < 1 || day > days) return const SizedBox.shrink();
                    final date = DateTime(_month.year, _month.month, day);
                    final key = DateFormat('yyyy-MM-dd').format(date);
                    final count = _events!
                        .where((e) => '${e['deadline']}'.startsWith(key))
                        .length;
                    return InkWell(
                      onTap: () => setState(() => _day = date),
                      child: Container(
                        margin: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: selected == key
                              ? Theme.of(context).colorScheme.primaryContainer
                              : null,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('$day'),
                            if (count > 0)
                              Text(
                                '$count',
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),
                Text(
                  DateFormat.yMMMMd('ru').format(_day),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (events.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('На этот день событий нет'),
                  ),
                ...events.map(
                  (event) => Card(
                    child: ListTile(
                      title: Text(recordTitle(event)),
                      subtitle: Text(
                        event['_module'] == 'tasks' ? 'Задача' : 'Проект',
                      ),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => CrmRecordScreen(
                            resource: crmResource(event['_module'] as String),
                            row: event,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class CrmHeatmapScreen extends ConsumerStatefulWidget {
  const CrmHeatmapScreen({super.key});
  @override
  ConsumerState<CrmHeatmapScreen> createState() => _CrmHeatmapScreenState();
}

class _CrmHeatmapScreenState extends ConsumerState<CrmHeatmapScreen> {
  int _days = 28;
  bool _hours = false;
  Map<String, dynamic>? _data;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _data = null;
      _error = null;
    });
    try {
      final data = await ref
          .read(crmApiProvider)
          .get('/analytics/metrics/workload/', params: {'days': _days});
      if (mounted) {
        setState(() => _data = Map<String, dynamic>.from(data as Map));
      }
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final users = (_data?['members'] ?? []) as List;
    return Scaffold(
      appBar: AppBar(title: const Text('Тепловая карта загрузки')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                DropdownButton<int>(
                  value: _days,
                  items: [7, 14, 28, 90]
                      .map(
                        (d) =>
                            DropdownMenuItem(value: d, child: Text('$d дней')),
                      )
                      .toList(),
                  onChanged: (d) {
                    if (d != null) {
                      _days = d;
                      _load();
                    }
                  },
                ),
                const Spacer(),
                ChoiceChip(
                  label: const Text('Задачи'),
                  selected: !_hours,
                  onSelected: (_) => setState(() => _hours = false),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Часы'),
                  selected: _hours,
                  onSelected: (_) => setState(() => _hours = true),
                ),
              ],
            ),
          ),
          Expanded(
            child: _error != null
                ? Center(child: Text(_error!))
                : _data == null
                ? const Center(child: CircularProgressIndicator())
                : users.isEmpty
                ? const Center(child: Text('Нет данных о загрузке'))
                : ListView(
                    children: users
                        .whereType<Map>()
                        .map(
                          (user) => Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${user['user_name']}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: 10),
                                  SingleChildScrollView(
                                    scrollDirection: Axis.horizontal,
                                    child: Row(
                                      children: (user['daily'] as List)
                                          .whereType<Map>()
                                          .map((day) {
                                            final value =
                                                (day[_hours
                                                        ? 'hours_tracked'
                                                        : 'tasks_assigned']
                                                    as num?) ??
                                                0;
                                            final color = value == 0
                                                ? Colors.grey
                                                : value <= 2
                                                ? Colors.green
                                                : value <= 5
                                                ? Colors.amber
                                                : value <= 8
                                                ? Colors.orange
                                                : Colors.red;
                                            return Tooltip(
                                              message: '${day['date']}: $value',
                                              child: InkWell(
                                                onTap: () => showDialog<void>(
                                                  context: context,
                                                  builder: (_) => AlertDialog(
                                                    title: Text(
                                                      '${day['date']}',
                                                    ),
                                                    content: CrmDataView(
                                                      data: day,
                                                    ),
                                                  ),
                                                ),
                                                child: Container(
                                                  width: 38,
                                                  margin: const EdgeInsets.all(
                                                    2,
                                                  ),
                                                  padding: const EdgeInsets.all(
                                                    4,
                                                  ),
                                                  decoration: BoxDecoration(
                                                    color: color.withValues(
                                                      alpha: .25,
                                                    ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          4,
                                                        ),
                                                  ),
                                                  child: Column(
                                                    children: [
                                                      Text(
                                                        '${day['date']}'
                                                            .substring(8),
                                                        style: const TextStyle(
                                                          fontSize: 10,
                                                        ),
                                                      ),
                                                      Text('$value'),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                            );
                                          })
                                          .toList(),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
          ),
        ],
      ),
    );
  }
}
