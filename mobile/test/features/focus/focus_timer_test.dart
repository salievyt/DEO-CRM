import 'package:flutter_test/flutter_test.dart';
import 'package:deo_crm_mobile/features/focus/focus_screen.dart';

void main() {
  final now = DateTime.utc(2026, 10, 3, 10);
  test('countdown is restored from server deadline after reopening', () {
    expect(focusRemaining({'status':'running','ends_at':now.add(const Duration(seconds:90)).toIso8601String(),'planned_seconds':1500,'elapsed_seconds':0},now),90);
  });
  test('paused sessions do not count wall time as work', () {
    expect(focusRemaining({'status':'paused','ends_at':null,'planned_seconds':1500,'elapsed_seconds':120},now),1380);
  });
  test('expired countdown never becomes negative', () {
    expect(focusRemaining({'status':'running','ends_at':now.subtract(const Duration(hours:1)).toIso8601String(),'planned_seconds':60,'elapsed_seconds':0},now),0);
  });
  test('timer supports sessions longer than an hour', () {
    expect(focusTime(5401),'90:01');
  });
}
