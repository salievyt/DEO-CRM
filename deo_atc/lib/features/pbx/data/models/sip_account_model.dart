import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/pbx_connection.dart';

part 'sip_account_model.freezed.dart';
part 'sip_account_model.g.dart';

@freezed
abstract class SipAccountModel with _$SipAccountModel {
  const factory SipAccountModel({
    required String id,
    String? connection,
    String? extension,
    String? name,
    String? user,
    @JsonKey(name: 'is_active') bool? isActive,
  }) = _SipAccountModel;

  factory SipAccountModel.fromJson(Map<String, dynamic> json) =>
      _$SipAccountModelFromJson(json);

  const SipAccountModel._();

  SipAccount toEntity() => SipAccount(
        id: id,
        connectionId: connection,
        extension: extension ?? '',
        name: name ?? '',
        user: user ?? '',
        isActive: isActive ?? false,
      );
}
