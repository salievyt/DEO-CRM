// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pbx_connection_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PbxConnectionModel _$PbxConnectionModelFromJson(Map<String, dynamic> json) =>
    _PbxConnectionModel(
      id: json['id'] as String,
      name: json['name'] as String,
      provider: json['provider'] as String?,
      apiUrl: json['api_url'] as String?,
      wsUrl: json['ws_url'] as String?,
      sipDomain: json['sip_domain'] as String?,
      status: json['status'] as String?,
      isDefault: json['is_default'] as bool?,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
    );

Map<String, dynamic> _$PbxConnectionModelToJson(_PbxConnectionModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'provider': instance.provider,
      'api_url': instance.apiUrl,
      'ws_url': instance.wsUrl,
      'sip_domain': instance.sipDomain,
      'status': instance.status,
      'is_default': instance.isDefault,
      'created_at': instance.createdAt?.toIso8601String(),
    };
