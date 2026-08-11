import 'package:intl/intl.dart';

/// Presentation-safe formatters (Russian locale by default).
class Fmt {
  Fmt._();

  static String time(DateTime? dateTime) {
    if (dateTime == null) return '—';
    return DateFormat('HH:mm', 'ru').format(dateTime.toLocal());
  }

  static String date(DateTime? dateTime) {
    if (dateTime == null) return '—';
    return DateFormat('d MMMM', 'ru').format(dateTime.toLocal());
  }

  static String dateTime(DateTime? dateTime) {
    if (dateTime == null) return '—';
    return DateFormat('d MMM, HH:mm', 'ru').format(dateTime.toLocal());
  }

  static String duration(int seconds) {
    if (seconds <= 0) return '—';
    final minutes = seconds ~/ 60;
    final rest = seconds % 60;
    if (minutes <= 0) return '$rest с';
    if (minutes < 60) return '$minutes:${rest.toString().padLeft(2, '0')}';
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    return '$hours:${mins.toString().padLeft(2, '0')} ч';
  }

  static String phone(String? phone) {
    final value = (phone ?? '').trim();
    if (value.isEmpty) return 'Без номера';
    return value;
  }

  static String plural(int count, String one, String few, String many) {
    final n = count % 100;
    final n10 = n % 10;
    if (n10 == 1 && n != 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n < 12 || n > 14)) return few;
    return many;
  }
}
