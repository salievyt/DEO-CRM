import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/pbx_connection.dart';

part 'pbx_connection_model.freezed.dart';
part 'pbx_connection_model.g.dart';

@freezed
abstract class PbxConnectionModel with _$PbxConnectionModel {
  const factory PbxConnectionModel({
    required String id,
    required String name,
    String? provider,
    @JsonKey(name: 'api_url') String? apiUrl,
    @JsonKey(name: 'ws_url') String? wsUrl,
    @JsonKey(name: 'sip_domain') String? sipDomain,
    String? status,
    @JsonKey(name: 'is_default') bool? isDefault,
    @JsonKey(name: 'created_at') DateTime? createdAt,
  }) = _PbxConnectionModel;

  factory PbxConnectionModel.fromJson(Map<String, dynamic> json) =>
      _$PbxConnectionModelFromJson(json);

  const PbxConnectionModel._();

  PbxConnection toEntity() => PbxConnection(
        id: id,
        name: name,
        provider: PbxProvider.fromApi(provider),
        status: PbxStatus.fromApi(status),
        isDefault: isDefault ?? false,
        apiUrl: apiUrl ?? '',
        wsUrl: wsUrl ?? '',
        sipDomain: sipDomain ?? '',
        createdAt: createdAt,
      );
}
