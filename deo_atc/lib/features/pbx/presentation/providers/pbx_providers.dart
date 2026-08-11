import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/pbx_repository_impl.dart';
import '../../domain/entities/pbx_connection.dart';

final pbxConnectionsProvider = FutureProvider<List<PbxConnection>>((ref) {
  return ref.watch(pbxRepositoryProvider).getConnections();
});

final sipAccountsProvider = FutureProvider<List<SipAccount>>((ref) {
  return ref.watch(pbxRepositoryProvider).getSipAccounts();
});
