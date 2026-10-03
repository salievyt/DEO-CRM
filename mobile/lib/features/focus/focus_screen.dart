import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../workspace/crm_api.dart';

const focusPhases = {
  'work': 'Фокус',
  'short_break': 'Короткий перерыв',
  'long_break': 'Длинный перерыв',
};
int focusRemaining(Map<String, dynamic> session, DateTime serverNow) {
  if (session['status'] == 'running' && session['ends_at'] != null) {
    return (DateTime.parse(
              session['ends_at'],
            ).difference(serverNow).inMilliseconds /
            1000)
        .ceil()
        .clamp(0, session['planned_seconds'] as int);
  }
  return ((session['planned_seconds'] as int) -
          (session['elapsed_seconds'] as int))
      .clamp(0, session['planned_seconds'] as int);
}

String focusTime(int value) =>
    '${(value ~/ 60).toString().padLeft(2, '0')}:${(value % 60).toString().padLeft(2, '0')}';

class FocusScreen extends ConsumerStatefulWidget {
  const FocusScreen({super.key});
  @override
  ConsumerState<FocusScreen> createState() => _FocusScreenState();
}

class _FocusScreenState extends ConsumerState<FocusScreen>
    with WidgetsBindingObserver {
  final _goal = TextEditingController();
  final _note = TextEditingController();
  final _audio = AudioPlayer();
  Timer? _tick;
  Map<String, dynamic>? _active, _profile, _stats;
  List<Map<String, dynamic>> _tasks = [], _notes = [], _history = [];
  Duration _offset = Duration.zero;
  String _phase = 'work', _tab = 'tasks';
  String? _task, _error;
  bool _loading = true,
      _busy = false,
      _syncing = false,
      _sound = false,
      _zen = false;
  int _seconds = 0, _page = 1;
  bool _hasNext = false;
  CrmApi get _api => ref.read(crmApiProvider);
  Color get _accent => switch (_profile?['theme']) {
    'lavender' => const Color(0xffa89afa),
    'ocean' => const Color(0xff72d7e5),
    'forest' => const Color(0xff9ed4a4),
    'sunset' => const Color(0xffffc097),
    _ => const Color(0xfff8c51c),
  };
  Color get _background => switch (_profile?['theme']) {
    'lavender' => const Color(0xff171324),
    'ocean' => const Color(0xff0c1c26),
    'forest' => const Color(0xff132017),
    'sunset' => const Color(0xff281719),
    _ => const Color(0xff09090d),
  };
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _seconds++);
      if (_seconds % 5 == 0) _sync();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _sync();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tick?.cancel();
    _goal.dispose();
    _note.dispose();
    _audio.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _rows(dynamic data) =>
      ((data is List ? data : data['results']) as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
  Future<void> _load() async {
    try {
      final data = await Future.wait([
        _api.get('/focus/settings/'),
        _api.get('/focus/stats/'),
        _api.get('/focus/notes/', params: {'page_size': 100}),
        _api.get('/focus/sessions/', params: {'page': _page}),
        _api.choices('/tasks/my/'),
      ]);
      if (!mounted) return;
      setState(() {
        _profile = Map<String, dynamic>.from(data[0]);
        _stats = Map<String, dynamic>.from(data[1]);
        _notes = _rows(data[2]);
        _history = _rows(data[3]);
        _hasNext = data[3]['next'] != null;
        _tasks = _rows(data[4]);
        _error = null;
      });
      await _sync();
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sync() async {
    if (_syncing || !mounted) return;
    _syncing = true;
    try {
      final data = await _api.get('/focus/state/');
      if (!mounted) return;
      final old = _active;
      final next = data['active'] == null
          ? null
          : Map<String, dynamic>.from(data['active']);
      setState(() {
        _offset = DateTime.parse(
          data['server_time'],
        ).difference(DateTime.now());
        _active = next;
        _error = null;
        if (next != null) {
          _phase = next['phase'];
          _task = next['task'];
          _goal.text = next['goal'] ?? '';
        }
      });
      final last = data['last_session'];
      if (old != null &&
          next == null &&
          last != null &&
          last['id'] == old['id'] &&
          last['status'] == 'completed') {
        await _audio.stop();
        _sound = false;
        SystemSound.play(SystemSoundType.alert);
        final stats = await _api.get('/focus/stats/');
        if (!mounted) return;
        setState(() {
          _stats = Map<String, dynamic>.from(stats);
          _phase = old['phase'] == 'work'
              ? ((stats['today_sessions'] as int) %
                            (_profile?['cycles'] as int? ?? 4) ==
                        0
                    ? 'long_break'
                    : 'short_break')
              : 'work';
        });
        if (_profile?['auto_advance'] == true && !_busy) {
          await _start();
        }
        if (old['phase'] == 'work' && mounted) {
          unawaited(_result(Map<String, dynamic>.from(last)));
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
    } finally {
      _syncing = false;
    }
  }

  Future<bool> _run(Future<void> Function() action) async {
    if (_busy) return false;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      await _load();
      return true;
    } catch (e) {
      if (mounted) setState(() => _error = crmError(e));
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _start() async {
    final response = await _api.save('/focus/start/', {
      'phase': _phase,
      'task': _task,
      'goal': _goal.text,
    });
    if (mounted) setState(() => _active = Map<String, dynamic>.from(response));
  }

  Future<void> _action(String action) async {
    final current = _active!;
    Map<String, dynamic>? finished;
    await _run(() async {
      final response = Map<String, dynamic>.from(
        await _api.save('/focus/sessions/${current['id']}/$action/', {}),
      );
      if (mounted) {
        setState(
          () => _active = ['running', 'paused'].contains(response['status'])
              ? response
              : null,
        );
      }
      if (action == 'finish' && current['phase'] == 'work') finished = response;
    });
    if (finished != null && mounted) await _result(finished!);
  }

  Future<void> _result(Map<String, dynamic> session) async {
    final controller = TextEditingController(text: session['result'] ?? '');
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Что получилось?'),
        content: TextField(
          controller: controller,
          maxLines: 5,
          maxLength: 10000,
          decoration: const InputDecoration(
            hintText: 'Результат и следующий шаг',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Позже'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Сохранить'),
          ),
        ],
      ),
    );
    if (value != null && mounted) {
      await _run(() async {
        await _api.save('/focus/sessions/${session['id']}/result/', {
          'result': value,
        });
      });
    }
    controller.dispose();
  }

  Future<void> _toggleSound() async {
    try {
      if (_sound) {
        await _audio.stop();
      } else {
        final name = _profile?['sound'] == 'none'
            ? 'rain'
            : _profile?['sound'] ?? 'rain';
        await _audio.setReleaseMode(ReleaseMode.loop);
        await _audio.setVolume(.3);
        await _audio.play(AssetSource('focus/$name.wav'));
      }
      if (mounted) setState(() => _sound = !_sound);
    } catch (e) {
      if (mounted) setState(() => _error = 'Не удалось включить звук.');
    }
  }

  Future<void> _settings() async {
    if (_profile == null) return;
    final draft = Map<String, dynamic>.from(_profile!);
    final form = GlobalKey<FormState>();
    final saved = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: const Text('Ваш ритм работы'),
          content: SizedBox(
            width: 420,
            child: SingleChildScrollView(
              child: Form(
                key: form,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final entry in {
                      'work_minutes': 'Фокус, мин',
                      'short_break_minutes': 'Короткий перерыв, мин',
                      'long_break_minutes': 'Длинный перерыв, мин',
                      'cycles': 'Сессий до длинного перерыва',
                      'daily_goal': 'Дневная цель',
                    }.entries)
                      TextFormField(
                        initialValue: '${draft[entry.key]}',
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(labelText: entry.value),
                        validator: (v) {
                          final n = int.tryParse(v ?? '');
                          final max = {
                            'work_minutes': 180,
                            'short_break_minutes': 60,
                            'long_break_minutes': 120,
                            'cycles': 12,
                            'daily_goal': 24,
                          }[entry.key]!;
                          return n == null ||
                                  n < (entry.key == 'cycles' ? 2 : 1) ||
                                  n > max
                              ? 'Введите число до $max'
                              : null;
                        },
                        onSaved: (v) => draft[entry.key] = int.parse(v!),
                      ),
                    for (final entry in <String, Map<String, String>>{
                      'theme': {
                        'midnight': 'Полночь',
                        'lavender': 'Лаванда',
                        'ocean': 'Океан',
                        'forest': 'Лес',
                        'sunset': 'Закат',
                      },
                      'timer_style': {
                        'digital': 'Цифровой',
                        'ring': 'Круговой',
                        'flip': 'Карточки',
                      },
                      'sound': {
                        'none': 'Без звука',
                        'rain': 'Дождь',
                        'ocean': 'Волны',
                        'forest': 'Лес',
                      },
                    }.entries)
                      DropdownButtonFormField<String>(
                        initialValue:
                            draft[entry.key] ?? entry.value.keys.first,
                        decoration: InputDecoration(
                          labelText: {
                            'theme': 'Тема',
                            'timer_style': 'Вид таймера',
                            'sound': 'Звук',
                          }[entry.key],
                        ),
                        items: entry.value.entries
                            .map(
                              (e) => DropdownMenuItem(
                                value: e.key,
                                child: Text(e.value),
                              ),
                            )
                            .toList(),
                        onChanged: (v) => draft[entry.key] = v,
                      ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Автопереход к следующей фазе'),
                      value: draft['auto_advance'] == true,
                      onChanged: (v) => update(() => draft['auto_advance'] = v),
                    ),
                  ],
                ),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отмена'),
            ),
            FilledButton(
              onPressed: () {
                if (form.currentState!.validate()) {
                  form.currentState!.save();
                  Navigator.pop(context, draft);
                }
              },
              child: const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
    if (saved != null && mounted) {
      await _run(() async {
        await _api.save('/focus/settings/', saved, method: 'PATCH');
      });
    }
  }

  Widget _card(Widget child) => Container(
    margin: const EdgeInsets.only(bottom: 16),
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: .045),
      border: Border.all(color: Colors.white12),
      borderRadius: BorderRadius.circular(18),
    ),
    child: child,
  );
  @override
  Widget build(BuildContext context) {
    final duration =
        _profile?[{
              'work': 'work_minutes',
              'short_break': 'short_break_minutes',
              'long_break': 'long_break_minutes',
            }[_phase]]
            as int? ??
        25;
    final remaining = _active == null
        ? duration * 60
        : focusRemaining(_active!, DateTime.now().add(_offset));
    final style = _profile?['timer_style'] ?? 'digital';
    final clock = Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          focusTime(remaining),
          style: TextStyle(
            fontSize: style == 'ring' ? 66 : 82,
            fontWeight: FontWeight.w600,
            letterSpacing: -5,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          _active?['status'] == 'paused'
              ? 'Можно передохнуть'
              : _phase == 'work'
              ? 'Один шаг к важному результату'
              : 'Время восстановить силы',
          style: const TextStyle(color: Colors.white54, fontSize: 11),
        ),
      ],
    );
    return Theme(
      data: ThemeData.dark(useMaterial3: true).copyWith(
        colorScheme: ColorScheme.fromSeed(
          seedColor: _accent,
          brightness: Brightness.dark,
          primary: _accent,
        ),
        scaffoldBackgroundColor: _background,
      ),
      child: Scaffold(
        backgroundColor: _background,
        appBar: AppBar(
          backgroundColor: _background,
          title: Text(
            'DEO Focus',
            style: TextStyle(color: _accent, fontWeight: FontWeight.bold),
          ),
          actions: [
            IconButton(
              tooltip: _sound ? 'Выключить звук' : 'Включить звук',
              icon: Icon(_sound ? Icons.volume_up : Icons.volume_off),
              onPressed: _toggleSound,
            ),
            IconButton(
              tooltip: 'Настройки фокуса',
              icon: const Icon(Icons.tune),
              onPressed: _settings,
            ),
            IconButton(
              tooltip: 'Режим концентрации',
              icon: Icon(_zen ? Icons.fullscreen_exit : Icons.fullscreen),
              onPressed: () => setState(() => _zen = !_zen),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    if (_error != null)
                      _card(
                        Column(
                          children: [
                            Text(
                              _error!,
                              style: const TextStyle(color: Colors.redAccent),
                            ),
                            TextButton(
                              onPressed: _load,
                              child: const Text('Повторить'),
                            ),
                          ],
                        ),
                      ),
                    Text(
                      'ОДНА СЕССИЯ. ОДНА ЦЕЛЬ.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: _accent,
                        fontSize: 10,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 15),
                    TextField(
                      controller: _goal,
                      enabled: _active == null,
                      maxLength: 300,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w600,
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Над чем хотите сфокусироваться?',
                        border: InputBorder.none,
                        counterText: '',
                      ),
                    ),
                    DropdownButton<String>(
                      isExpanded: true,
                      value:
                          _task != null && _tasks.any((t) => t['id'] == _task)
                          ? _task
                          : '',
                      items: [
                        const DropdownMenuItem(
                          value: '',
                          child: Text('Личная сессия без задачи'),
                        ),
                        ..._tasks.map(
                          (t) => DropdownMenuItem(
                            value: t['id'] as String,
                            child: Text(
                              t['title'],
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ],
                      onChanged: _active != null
                          ? null
                          : (v) => setState(() => _task = v == '' ? null : v),
                    ),
                    const SizedBox(height: 15),
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 7,
                      runSpacing: 7,
                      children: focusPhases.entries
                          .map(
                            (e) => ChoiceChip(
                              label: Text(
                                e.value,
                                style: const TextStyle(fontSize: 11),
                              ),
                              selected: _phase == e.key,
                              onSelected: _active != null
                                  ? null
                                  : (_) => setState(() => _phase = e.key),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 15),
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 7,
                      children: List.generate(
                        _profile?['daily_goal'] ?? 4,
                        (i) => Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: i < (_stats?['today_sessions'] ?? 0)
                                ? _accent
                                : Colors.white24,
                          ),
                        ),
                      ),
                    ),
                    Center(
                      child: SizedBox(
                        height: 280,
                        width: 280,
                        child: style == 'ring'
                            ? Stack(
                                alignment: Alignment.center,
                                children: [
                                  SizedBox(
                                    width: 265,
                                    height: 265,
                                    child: CircularProgressIndicator(
                                      value: _active == null
                                          ? 0
                                          : 1 -
                                                remaining /
                                                    (_active!['planned_seconds']
                                                        as num),
                                      strokeWidth: 3,
                                      color: _accent,
                                      backgroundColor: Colors.white12,
                                    ),
                                  ),
                                  clock,
                                ],
                              )
                            : style == 'flip'
                            ? Center(child: _card(clock))
                            : clock,
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        FilledButton.icon(
                          onPressed: _busy || _profile == null || _error != null
                              ? null
                              : () => _active == null
                                    ? _run(_start)
                                    : _action(
                                        _active!['status'] == 'paused'
                                            ? 'resume'
                                            : 'pause',
                                      ),
                          icon: Icon(
                            _active == null || _active!['status'] == 'paused'
                                ? Icons.play_arrow
                                : Icons.pause,
                          ),
                          label: Text(
                            _active == null
                                ? 'Начать фокус'
                                : _active!['status'] == 'paused'
                                ? 'Продолжить'
                                : 'Пауза',
                          ),
                        ),
                        if (_active != null) ...[
                          IconButton(
                            tooltip: 'Завершить сессию',
                            onPressed: _busy ? null : () => _action('finish'),
                            icon: const Icon(Icons.check),
                          ),
                          IconButton(
                            tooltip: 'Остановить сессию',
                            onPressed: _busy
                                ? null
                                : () async {
                                    final yes = await showDialog<bool>(
                                      context: context,
                                      builder: (context) => AlertDialog(
                                        title: const Text('Остановить сессию?'),
                                        content: const Text(
                                          'Отработанное время сохранится.',
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.pop(context, false),
                                            child: const Text('Отмена'),
                                          ),
                                          FilledButton(
                                            onPressed: () =>
                                                Navigator.pop(context, true),
                                            child: const Text('Остановить'),
                                          ),
                                        ],
                                      ),
                                    );
                                    if (yes == true) await _action('cancel');
                                  },
                            icon: const Icon(Icons.stop_outlined),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 25),
                      if (!_zen) ...[
                      Row(
                        children: [
                          _metric(
                            '${((_stats?['today_seconds'] ?? 0) / 60).round()} мин',
                            'Сегодня',
                          ),
                          _metric(
                            '${_stats?['today_sessions'] ?? 0}/${_profile?['daily_goal'] ?? 4}',
                            'Цель',
                          ),
                          _metric('${_stats?['streak'] ?? 0}', 'Дней подряд'),
                        ],
                      ),
                      Wrap(
                        spacing: 8,
                        children:
                            {
                                  'tasks': 'Задачи',
                                  'notes': 'Заметки',
                                  'stats': 'Прогресс',
                                }.entries
                                .map(
                                  (e) => ChoiceChip(
                                    label: Text(e.value),
                                    selected: _tab == e.key,
                                    onSelected: (_) =>
                                        setState(() => _tab = e.key),
                                  ),
                                )
                                .toList(),
                      ),
                      const SizedBox(height: 15),
                      if (_tab == 'tasks')
                        _card(
                          Column(
                            children: [
                              if (_tasks.isEmpty)
                                const Text('Назначенных задач пока нет'),
                              ..._tasks.map(
                                (t) => ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  leading: Icon(
                                    _task == t['id']
                                        ? Icons.check_circle
                                        : Icons.circle_outlined,
                                    color: _task == t['id'] ? _accent : null,
                                  ),
                                  title: Text(t['title']),
                                  subtitle: Text(t['status_name'] ?? ''),
                                  onTap: _active != null
                                      ? null
                                      : () => setState(() => _task = t['id']),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (_tab == 'notes')
                        _card(
                          Column(
                            children: [
                              TextField(
                                controller: _note,
                                maxLines: 3,
                                maxLength: 10000,
                                decoration: const InputDecoration(
                                  hintText:
                                      'Запишите идею, чтобы вернуться к ней позже…',
                                ),
                              ),
                              FilledButton.icon(
                                onPressed: _busy
                                    ? null
                                    : () => _run(() async {
                                        if (_note.text.trim().isEmpty) return;
                                        await _api.save('/focus/notes/', {
                                          'content': _note.text.trim(),
                                          'task': _active?['task'] ?? _task,
                                        });
                                        _note.clear();
                                      }),
                                icon: const Icon(Icons.add),
                                label: const Text('Сохранить заметку'),
                              ),
                              ..._notes.map(
                                (n) => ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  title: Text(n['content']),
                                  onTap: () => _editNote(n),
                                  trailing: IconButton(
                                    tooltip: 'Удалить заметку',
                                    icon: const Icon(Icons.delete_outline),
                                    onPressed: () => _deleteNote(n),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (_tab == 'stats')
                        _card(
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Последние 7 дней'),
                              const SizedBox(height: 15),
                              ...((_stats?['daily'] as List?) ?? []).reversed
                                  .take(7)
                                  .map(
                                    (d) => Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 10,
                                      ),
                                      child: Row(
                                        children: [
                                          Text('${d['date']}'.substring(5)),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: LinearProgressIndicator(
                                              value:
                                                  ((d['seconds'] as num) /
                                                          ((_profile?['daily_goal'] ??
                                                                  4) *
                                                              (_profile?['work_minutes'] ??
                                                                  25) *
                                                              60))
                                                      .clamp(0.0, 1.0),
                                              color: _accent,
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Text(
                                            '${((d['seconds'] as num) / 60).round()} мин',
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                              const SizedBox(height: 15),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children:
                                    ((_stats?['achievements'] as List?) ?? [])
                                        .map(
                                          (a) => Chip(
                                            avatar: Icon(
                                              a['unlocked']
                                                  ? Icons.star
                                                  : Icons.lock_outline,
                                              size: 16,
                                              color: a['unlocked']
                                                  ? _accent
                                                  : Colors.white38,
                                            ),
                                            label: Text(
                                              a['title'],
                                              style: const TextStyle(
                                                fontSize: 11,
                                              ),
                                            ),
                                          ),
                                        )
                                        .toList(),
                              ),
                            ],
                          ),
                        ),
                      const Text(
                        'История сессий',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_history.isEmpty)
                        const Text('Здесь появится ваша первая сессия.'),
                      ..._history.map(
                        (s) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            '${s['task_title'] ?? ''}'.isNotEmpty
                                ? s['task_title']
                                : '${s['goal'] ?? ''}'.isNotEmpty
                                ? s['goal']
                                : focusPhases[s['phase']] ?? '',
                          ),
                          subtitle: Text(
                            '${focusPhases[s['phase']]} · ${focusTime(s['elapsed_seconds'])}\n${s['result'] ?? ''}',
                          ),
                          trailing: const Icon(Icons.edit_note),
                          onTap: () => _result(s),
                        ),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          TextButton(
                            onPressed: _page <= 1
                                ? null
                                : () {
                                    _page--;
                                    _load();
                                  },
                            child: const Text('Назад'),
                          ),
                          Text('$_page'),
                          TextButton(
                            onPressed: _hasNext
                                ? () {
                                    _page++;
                                    _load();
                                  }
                                : null,
                            child: const Text('Далее'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  ],
                ),
              ),
      ),
    );
  }

  Widget _metric(String value, String label) => Expanded(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: _card(
        Column(
          children: [
            Text(
              value,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
      ),
    ),
  );
  Future<void> _editNote(Map<String, dynamic> note) async {
    final controller = TextEditingController(text: note['content']);
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Заметка'),
        content: TextField(
          controller: controller,
          maxLines: 5,
          maxLength: 10000,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Сохранить'),
          ),
        ],
      ),
    );
    if (value != null && mounted) {
      await _run(() async {
        await _api.save('/focus/notes/${note['id']}/', {
          'content': value,
        }, method: 'PATCH');
      });
    }
    controller.dispose();
  }

  Future<void> _deleteNote(Map<String, dynamic> note) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Удалить заметку?'),
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
    if (yes == true && mounted) {
      await _run(() async {
        await _api.delete('/focus/notes/${note['id']}/');
      });
    }
  }
}
