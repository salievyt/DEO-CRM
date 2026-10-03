class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://crm.backend.deo-core.codes/api/v1',
  );
  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'wss://crm.backend.deo-core.codes',
  );
  static const Duration timeout = Duration(seconds: 30);
  static const Duration connectTimeout = Duration(seconds: 15);
  static const int maxRetries = 3;
}
