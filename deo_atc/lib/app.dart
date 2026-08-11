import 'package:flutter/material.dart';

import 'app_router.dart';
import 'core/theme/atc_theme.dart';

class DeoAtcApp extends StatelessWidget {
  const DeoAtcApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'DEO ATC',
      debugShowCheckedModeBanner: false,
      theme: AtcTheme.light,
      routerConfig: appRouter,
    );
  }
}
