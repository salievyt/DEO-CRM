// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sip_account_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SipAccountModel _$SipAccountModelFromJson(Map<String, dynamic> json) =>
    _SipAccountModel(
      id: json['id'] as String,
      connection: json['connection'] as String?,
      extension: json['extension'] as String?,
      name: json['name'] as String?,
      user: json['user'] as String?,
      isActive: json['is_active'] as bool?,
    );

Map<String, dynamic> _$SipAccountModelToJson(_SipAccountModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'connection': instance.connection,
      'extension': instance.extension,
      'name': instance.name,
      'user': instance.user,
      'is_active': instance.isActive,
    };
