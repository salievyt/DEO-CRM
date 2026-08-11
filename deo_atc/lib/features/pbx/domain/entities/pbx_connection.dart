/// Status of a PBX connection (backend `PBXConnectionStatus`).
enum PbxStatus {
  connected,
  disabled,
  error,
  unknown;

  static PbxStatus fromApi(String? value) {
    switch (value) {
      case 'connected':
        return PbxStatus.connected;
      case 'disabled':
        return PbxStatus.disabled;
      case 'error':
        return PbxStatus.error;
      default:
        return PbxStatus.unknown;
    }
  }
}

/// PBX provider (backend `PBXProvider`).
enum PbxProvider {
  asterisk,
  mikopbx,
  yeastar,
  grandstream,
  other,
  unknown;

  static PbxProvider fromApi(String? value) {
    switch (value) {
      case 'asterisk':
        return PbxProvider.asterisk;
      case 'mikopbx':
        return PbxProvider.mikopbx;
      case 'yeastar':
        return PbxProvider.yeastar;
      case 'grandstream':
        return PbxProvider.grandstream;
      case 'other':
        return PbxProvider.other;
      default:
        return PbxProvider.unknown;
    }
  }
}

/// A connected PBX (АТС) feeding the CRM with CDR records.
class PbxConnection {
  const PbxConnection({
    required this.id,
    required this.name,
    required this.provider,
    required this.status,
    required this.isDefault,
    required this.apiUrl,
    required this.wsUrl,
    required this.sipDomain,
    required this.createdAt,
  });

  final String id;
  final String name;
  final PbxProvider provider;
  final PbxStatus status;
  final bool isDefault;
  final String apiUrl;
  final String wsUrl;
  final String sipDomain;
  final DateTime? createdAt;
}

/// A SIP extension registered on a PBX connection.
class SipAccount {
  const SipAccount({
    required this.id,
    required this.connectionId,
    required this.extension,
    required this.name,
    required this.user,
    required this.isActive,
  });

  final String id;
  final String? connectionId;
  final String extension;
  final String name;
  final String user;
  final bool isActive;
}
