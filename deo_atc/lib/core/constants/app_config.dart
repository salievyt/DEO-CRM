/// Build-time configuration for the ATC app.
///
/// Override at build/run time:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8001/api/v1
///   flutter run --dart-define=WS_BASE_URL=ws://192.168.1.10:8001/ws
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8001/api/v1',
  );

  static const String wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: 'ws://localhost:8001/ws',
  );

  static const String accessTokenKey = 'atc_access_token';
  static const String refreshTokenKey = 'atc_refresh_token';
}
