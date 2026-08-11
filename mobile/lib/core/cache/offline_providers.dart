import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Stream of network connectivity status (true = online)
final connectivityProvider = StreamProvider<bool>((ref) {
  final connectivity = Connectivity();
  final controller = StreamController<bool>.broadcast();

  connectivity.checkConnectivity().then((result) {
    if (!controller.isClosed) {
      controller.add(!result.contains(ConnectivityResult.none));
    }
  });

  final subscription = connectivity.onConnectivityChanged.listen((result) {
    if (!controller.isClosed) {
      controller.add(!result.contains(ConnectivityResult.none));
    }
  });

  ref.onDispose(() {
    subscription.cancel();
    if (!controller.isClosed) controller.close();
  });

  return controller.stream;
});

/// Simple online check - defaults to true if not yet determined
final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider).valueOrNull ?? true;
});
