import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/pbx_connection.dart';
import '../../domain/repositories/pbx_repository.dart';
import '../datasources/pbx_remote_datasource.dart';

class PbxRepositoryImpl implements PbxRepository {
  PbxRepositoryImpl(this._remote);

  final PbxRemoteDatasource _remote;

  @override
  Future<List<PbxConnection>> getConnections() async {
    final models = await _remote.fetchConnections();
    return models.map((model) => model.toEntity()).toList();
  }

  @override
  Future<List<SipAccount>> getSipAccounts() async {
    final models = await _remote.fetchSipAccounts();
    return models.map((model) => model.toEntity()).toList();
  }

  @override
  Future<void> testConnection(String id) async {
    await _remote.testConnection(id);
  }

  @override
  Future<PbxConnection> setDefault(String id) async {
    await _remote.patchConnection(id, {'is_default': true});
    final connections = await getConnections();
    return connections.firstWhere((connection) => connection.id == id);
  }
}

final pbxRepositoryProvider = Provider<PbxRepository>((ref) {
  return PbxRepositoryImpl(ref.watch(pbxRemoteDatasourceProvider));
});
