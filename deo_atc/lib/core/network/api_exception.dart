import 'package:dio/dio.dart';

/// Typed failure for all API interactions.
class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.fieldErrors,
  });

  final String message;
  final int? statusCode;
  final Map<String, String>? fieldErrors;

  bool get isUnauthorized => statusCode == 401 || statusCode == 403;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Maps Dio failures and unexpected errors to [ApiException].
ApiException mapError(Object error) {
  if (error is ApiException) {
    return error;
  }
  if (error is DioException) {
    return _fromDio(error);
  }
  return ApiException(
    message: 'Не удалось выполнить запрос. Проверьте подключение.',
  );
}

ApiException _fromDio(DioException error) {
  final data = error.response?.data;
  final status = error.response?.statusCode;

  String message;
  Map<String, String>? fieldErrors;

  if (data is Map) {
    final detail = data['detail'];
    if (detail is String && detail.isNotEmpty) {
      message = detail;
    } else {
      final errors = <String, String>{};
      data.forEach((key, value) {
        if (value is List && value.isNotEmpty) {
          errors[key.toString()] = value.first.toString();
        }
      });
      if (errors.isNotEmpty) {
        message = 'Проверьте правильность заполнения полей';
        fieldErrors = errors;
      } else {
        message = 'Произошла ошибка на сервере';
      }
    }
  } else if (error.message != null && error.message!.isNotEmpty) {
    message = error.message!;
  } else {
    message = 'Произошла ошибка на сервере';
  }

  return ApiException(
    message: message,
    statusCode: status,
    fieldErrors: fieldErrors,
  );
}
