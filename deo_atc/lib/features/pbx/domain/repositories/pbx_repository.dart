import '../entities/pbx_connection.dart';

/// Contract for PBX/SIP management.
abstract interface class PbxRepository {
  Future<List<PbxConnection>> getConnections();

  Future<List<SipAccount>> getSipAccounts();

  Future<void> testConnection(String id);

  Future<PbxConnection> setDefault(String id);
}
