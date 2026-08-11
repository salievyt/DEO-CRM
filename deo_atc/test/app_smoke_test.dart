import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:deo_atc/app.dart';
import 'package:deo_atc/core/network/api_client.dart';
import 'package:deo_atc/core/network/token_storage.dart';

void main() {
  testWidgets('shell renders the four top-level tabs', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final tokenStorage = await TokenStorage.create();
    final apiClient = ApiClient.build(tokenStorage: tokenStorage);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tokenStorageProvider.overrideWithValue(tokenStorage),
          apiClientProvider.overrideWithValue(apiClient),
        ],
        child: const DeoAtcApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Звонки'), findsWidgets);
    expect(find.text('Статистика'), findsOneWidget);
    expect(find.text('Живой'), findsWidgets);
    expect(find.text('Настройки'), findsOneWidget);
  });
}
