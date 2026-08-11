/// Direction of a call record (backend `CallDirection`).
enum CallDirection {
  incoming,
  outgoing,
  unknown;

  static CallDirection fromApi(String? value) {
    switch (value) {
      case 'incoming':
        return CallDirection.incoming;
      case 'outgoing':
        return CallDirection.outgoing;
      default:
        return CallDirection.unknown;
    }
  }

  bool get isIncoming => this == CallDirection.incoming;
  bool get isOutgoing => this == CallDirection.outgoing;
}

/// Terminal status of a call record (backend `CallRecordStatus`).
enum CallStatus {
  answered,
  missed,
  busy,
  failed,
  canceled,
  voicemail,
  unknown;

  static CallStatus fromApi(String? value) {
    switch (value) {
      case 'answered':
        return CallStatus.answered;
      case 'missed':
        return CallStatus.missed;
      case 'busy':
        return CallStatus.busy;
      case 'failed':
        return CallStatus.failed;
      case 'canceled':
        return CallStatus.canceled;
      case 'voicemail':
        return CallStatus.voicemail;
      default:
        return CallStatus.unknown;
    }
  }

  bool get isMissed => this == CallStatus.missed || this == CallStatus.busy;
}

/// Call scope (backend `CallRecordType`).
enum CallScope {
  internal,
  external,
  unknown;

  static CallScope fromApi(String? value) {
    switch (value) {
      case 'internal':
        return CallScope.internal;
      case 'external':
        return CallScope.external;
      default:
        return CallScope.unknown;
    }
  }
}
