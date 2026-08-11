import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../models/pbx_connection_model.dart';
import '../models/sip_account_model.dart';

/// Remote source of PBX connections and SIP accounts.
class PbxRemoteDatasource {
  PbxRemoteDatasource(this._api);

  final ApiClient _api;

  Future<List<PbxConnectionModel>> fetchConnections() async {
    final data = await _api.getList('/calls/pbx/');
    return data
        .map((item) => PbxConnectionModel.fromJson(_asMap(item)))
        .toList();
  }

  Future<List<SipAccountModel>> fetchSipAccounts() async {
    final data = await _api.getList('/calls/sip/');
    return data
        .map((item) => SipAccountModel.fromJson(_asMap(item)))
        .toList();
  }

  Future<Map<String, dynamic>> testConnection(String id) async {
    return _api.post('/calls/pbx/$id/test/');
  }

  Future<Map<String, dynamic>> patchConnection(
    String id,
    Map<String, dynamic> data,
  ) async {
    return _api.patch('/calls/pbx/$id/', data: data);
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    return const <String, dynamic>{};
  }
}

final pbxRemoteDatasourceProvider = Provider<PbxRemoteDatasource>((ref) {
  return PbxRemoteDatasource(ref.watch(apiClientProvider));
});
