// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'call_record_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CallRecordModel {

 String get id; String? get connection; String? get externalCallId;@JsonKey(name: 'direction') String? get directionRaw;@JsonKey(name: 'status') String? get statusRaw;@JsonKey(name: 'call_type') String? get callTypeRaw;@JsonKey(name: 'phone_number') String? get phoneNumber; String? get client;@JsonKey(name: 'client_name') String? get clientName; String? get employee;@JsonKey(name: 'employee_name') String? get employeeName;@JsonKey(name: 'duration_seconds') int? get durationSeconds;@JsonKey(name: 'started_at') DateTime? get startedAt;@JsonKey(name: 'ended_at') DateTime? get endedAt;@JsonKey(name: 'created_at') DateTime? get createdAt;
/// Create a copy of CallRecordModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CallRecordModelCopyWith<CallRecordModel> get copyWith => _$CallRecordModelCopyWithImpl<CallRecordModel>(this as CallRecordModel, _$identity);

  /// Serializes this CallRecordModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CallRecordModel&&(identical(other.id, id) || other.id == id)&&(identical(other.connection, connection) || other.connection == connection)&&(identical(other.externalCallId, externalCallId) || other.externalCallId == externalCallId)&&(identical(other.directionRaw, directionRaw) || other.directionRaw == directionRaw)&&(identical(other.statusRaw, statusRaw) || other.statusRaw == statusRaw)&&(identical(other.callTypeRaw, callTypeRaw) || other.callTypeRaw == callTypeRaw)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.client, client) || other.client == client)&&(identical(other.clientName, clientName) || other.clientName == clientName)&&(identical(other.employee, employee) || other.employee == employee)&&(identical(other.employeeName, employeeName) || other.employeeName == employeeName)&&(identical(other.durationSeconds, durationSeconds) || other.durationSeconds == durationSeconds)&&(identical(other.startedAt, startedAt) || other.startedAt == startedAt)&&(identical(other.endedAt, endedAt) || other.endedAt == endedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,connection,externalCallId,directionRaw,statusRaw,callTypeRaw,phoneNumber,client,clientName,employee,employeeName,durationSeconds,startedAt,endedAt,createdAt);

@override
String toString() {
  return 'CallRecordModel(id: $id, connection: $connection, externalCallId: $externalCallId, directionRaw: $directionRaw, statusRaw: $statusRaw, callTypeRaw: $callTypeRaw, phoneNumber: $phoneNumber, client: $client, clientName: $clientName, employee: $employee, employeeName: $employeeName, durationSeconds: $durationSeconds, startedAt: $startedAt, endedAt: $endedAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $CallRecordModelCopyWith<$Res>  {
  factory $CallRecordModelCopyWith(CallRecordModel value, $Res Function(CallRecordModel) _then) = _$CallRecordModelCopyWithImpl;
@useResult
$Res call({
 String id, String? connection, String? externalCallId,@JsonKey(name: 'direction') String? directionRaw,@JsonKey(name: 'status') String? statusRaw,@JsonKey(name: 'call_type') String? callTypeRaw,@JsonKey(name: 'phone_number') String? phoneNumber, String? client,@JsonKey(name: 'client_name') String? clientName, String? employee,@JsonKey(name: 'employee_name') String? employeeName,@JsonKey(name: 'duration_seconds') int? durationSeconds,@JsonKey(name: 'started_at') DateTime? startedAt,@JsonKey(name: 'ended_at') DateTime? endedAt,@JsonKey(name: 'created_at') DateTime? createdAt
});




}
/// @nodoc
class _$CallRecordModelCopyWithImpl<$Res>
    implements $CallRecordModelCopyWith<$Res> {
  _$CallRecordModelCopyWithImpl(this._self, this._then);

  final CallRecordModel _self;
  final $Res Function(CallRecordModel) _then;

/// Create a copy of CallRecordModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? connection = freezed,Object? externalCallId = freezed,Object? directionRaw = freezed,Object? statusRaw = freezed,Object? callTypeRaw = freezed,Object? phoneNumber = freezed,Object? client = freezed,Object? clientName = freezed,Object? employee = freezed,Object? employeeName = freezed,Object? durationSeconds = freezed,Object? startedAt = freezed,Object? endedAt = freezed,Object? createdAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,connection: freezed == connection ? _self.connection : connection // ignore: cast_nullable_to_non_nullable
as String?,externalCallId: freezed == externalCallId ? _self.externalCallId : externalCallId // ignore: cast_nullable_to_non_nullable
as String?,directionRaw: freezed == directionRaw ? _self.directionRaw : directionRaw // ignore: cast_nullable_to_non_nullable
as String?,statusRaw: freezed == statusRaw ? _self.statusRaw : statusRaw // ignore: cast_nullable_to_non_nullable
as String?,callTypeRaw: freezed == callTypeRaw ? _self.callTypeRaw : callTypeRaw // ignore: cast_nullable_to_non_nullable
as String?,phoneNumber: freezed == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String?,client: freezed == client ? _self.client : client // ignore: cast_nullable_to_non_nullable
as String?,clientName: freezed == clientName ? _self.clientName : clientName // ignore: cast_nullable_to_non_nullable
as String?,employee: freezed == employee ? _self.employee : employee // ignore: cast_nullable_to_non_nullable
as String?,employeeName: freezed == employeeName ? _self.employeeName : employeeName // ignore: cast_nullable_to_non_nullable
as String?,durationSeconds: freezed == durationSeconds ? _self.durationSeconds : durationSeconds // ignore: cast_nullable_to_non_nullable
as int?,startedAt: freezed == startedAt ? _self.startedAt : startedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,endedAt: freezed == endedAt ? _self.endedAt : endedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [CallRecordModel].
extension CallRecordModelPatterns on CallRecordModel {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CallRecordModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CallRecordModel() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CallRecordModel value)  $default,){
final _that = this;
switch (_that) {
case _CallRecordModel():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CallRecordModel value)?  $default,){
final _that = this;
switch (_that) {
case _CallRecordModel() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? connection,  String? externalCallId, @JsonKey(name: 'direction')  String? directionRaw, @JsonKey(name: 'status')  String? statusRaw, @JsonKey(name: 'call_type')  String? callTypeRaw, @JsonKey(name: 'phone_number')  String? phoneNumber,  String? client, @JsonKey(name: 'client_name')  String? clientName,  String? employee, @JsonKey(name: 'employee_name')  String? employeeName, @JsonKey(name: 'duration_seconds')  int? durationSeconds, @JsonKey(name: 'started_at')  DateTime? startedAt, @JsonKey(name: 'ended_at')  DateTime? endedAt, @JsonKey(name: 'created_at')  DateTime? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CallRecordModel() when $default != null:
return $default(_that.id,_that.connection,_that.externalCallId,_that.directionRaw,_that.statusRaw,_that.callTypeRaw,_that.phoneNumber,_that.client,_that.clientName,_that.employee,_that.employeeName,_that.durationSeconds,_that.startedAt,_that.endedAt,_that.createdAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? connection,  String? externalCallId, @JsonKey(name: 'direction')  String? directionRaw, @JsonKey(name: 'status')  String? statusRaw, @JsonKey(name: 'call_type')  String? callTypeRaw, @JsonKey(name: 'phone_number')  String? phoneNumber,  String? client, @JsonKey(name: 'client_name')  String? clientName,  String? employee, @JsonKey(name: 'employee_name')  String? employeeName, @JsonKey(name: 'duration_seconds')  int? durationSeconds, @JsonKey(name: 'started_at')  DateTime? startedAt, @JsonKey(name: 'ended_at')  DateTime? endedAt, @JsonKey(name: 'created_at')  DateTime? createdAt)  $default,) {final _that = this;
switch (_that) {
case _CallRecordModel():
return $default(_that.id,_that.connection,_that.externalCallId,_that.directionRaw,_that.statusRaw,_that.callTypeRaw,_that.phoneNumber,_that.client,_that.clientName,_that.employee,_that.employeeName,_that.durationSeconds,_that.startedAt,_that.endedAt,_that.createdAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? connection,  String? externalCallId, @JsonKey(name: 'direction')  String? directionRaw, @JsonKey(name: 'status')  String? statusRaw, @JsonKey(name: 'call_type')  String? callTypeRaw, @JsonKey(name: 'phone_number')  String? phoneNumber,  String? client, @JsonKey(name: 'client_name')  String? clientName,  String? employee, @JsonKey(name: 'employee_name')  String? employeeName, @JsonKey(name: 'duration_seconds')  int? durationSeconds, @JsonKey(name: 'started_at')  DateTime? startedAt, @JsonKey(name: 'ended_at')  DateTime? endedAt, @JsonKey(name: 'created_at')  DateTime? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _CallRecordModel() when $default != null:
return $default(_that.id,_that.connection,_that.externalCallId,_that.directionRaw,_that.statusRaw,_that.callTypeRaw,_that.phoneNumber,_that.client,_that.clientName,_that.employee,_that.employeeName,_that.durationSeconds,_that.startedAt,_that.endedAt,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CallRecordModel extends CallRecordModel {
  const _CallRecordModel({required this.id, this.connection, this.externalCallId, @JsonKey(name: 'direction') this.directionRaw, @JsonKey(name: 'status') this.statusRaw, @JsonKey(name: 'call_type') this.callTypeRaw, @JsonKey(name: 'phone_number') this.phoneNumber, this.client, @JsonKey(name: 'client_name') this.clientName, this.employee, @JsonKey(name: 'employee_name') this.employeeName, @JsonKey(name: 'duration_seconds') this.durationSeconds, @JsonKey(name: 'started_at') this.startedAt, @JsonKey(name: 'ended_at') this.endedAt, @JsonKey(name: 'created_at') this.createdAt}): super._();
  factory _CallRecordModel.fromJson(Map<String, dynamic> json) => _$CallRecordModelFromJson(json);

@override final  String id;
@override final  String? connection;
@override final  String? externalCallId;
@override@JsonKey(name: 'direction') final  String? directionRaw;
@override@JsonKey(name: 'status') final  String? statusRaw;
@override@JsonKey(name: 'call_type') final  String? callTypeRaw;
@override@JsonKey(name: 'phone_number') final  String? phoneNumber;
@override final  String? client;
@override@JsonKey(name: 'client_name') final  String? clientName;
@override final  String? employee;
@override@JsonKey(name: 'employee_name') final  String? employeeName;
@override@JsonKey(name: 'duration_seconds') final  int? durationSeconds;
@override@JsonKey(name: 'started_at') final  DateTime? startedAt;
@override@JsonKey(name: 'ended_at') final  DateTime? endedAt;
@override@JsonKey(name: 'created_at') final  DateTime? createdAt;

/// Create a copy of CallRecordModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CallRecordModelCopyWith<_CallRecordModel> get copyWith => __$CallRecordModelCopyWithImpl<_CallRecordModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CallRecordModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CallRecordModel&&(identical(other.id, id) || other.id == id)&&(identical(other.connection, connection) || other.connection == connection)&&(identical(other.externalCallId, externalCallId) || other.externalCallId == externalCallId)&&(identical(other.directionRaw, directionRaw) || other.directionRaw == directionRaw)&&(identical(other.statusRaw, statusRaw) || other.statusRaw == statusRaw)&&(identical(other.callTypeRaw, callTypeRaw) || other.callTypeRaw == callTypeRaw)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.client, client) || other.client == client)&&(identical(other.clientName, clientName) || other.clientName == clientName)&&(identical(other.employee, employee) || other.employee == employee)&&(identical(other.employeeName, employeeName) || other.employeeName == employeeName)&&(identical(other.durationSeconds, durationSeconds) || other.durationSeconds == durationSeconds)&&(identical(other.startedAt, startedAt) || other.startedAt == startedAt)&&(identical(other.endedAt, endedAt) || other.endedAt == endedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,connection,externalCallId,directionRaw,statusRaw,callTypeRaw,phoneNumber,client,clientName,employee,employeeName,durationSeconds,startedAt,endedAt,createdAt);

@override
String toString() {
  return 'CallRecordModel(id: $id, connection: $connection, externalCallId: $externalCallId, directionRaw: $directionRaw, statusRaw: $statusRaw, callTypeRaw: $callTypeRaw, phoneNumber: $phoneNumber, client: $client, clientName: $clientName, employee: $employee, employeeName: $employeeName, durationSeconds: $durationSeconds, startedAt: $startedAt, endedAt: $endedAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$CallRecordModelCopyWith<$Res> implements $CallRecordModelCopyWith<$Res> {
  factory _$CallRecordModelCopyWith(_CallRecordModel value, $Res Function(_CallRecordModel) _then) = __$CallRecordModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String? connection, String? externalCallId,@JsonKey(name: 'direction') String? directionRaw,@JsonKey(name: 'status') String? statusRaw,@JsonKey(name: 'call_type') String? callTypeRaw,@JsonKey(name: 'phone_number') String? phoneNumber, String? client,@JsonKey(name: 'client_name') String? clientName, String? employee,@JsonKey(name: 'employee_name') String? employeeName,@JsonKey(name: 'duration_seconds') int? durationSeconds,@JsonKey(name: 'started_at') DateTime? startedAt,@JsonKey(name: 'ended_at') DateTime? endedAt,@JsonKey(name: 'created_at') DateTime? createdAt
});




}
/// @nodoc
class __$CallRecordModelCopyWithImpl<$Res>
    implements _$CallRecordModelCopyWith<$Res> {
  __$CallRecordModelCopyWithImpl(this._self, this._then);

  final _CallRecordModel _self;
  final $Res Function(_CallRecordModel) _then;

/// Create a copy of CallRecordModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? connection = freezed,Object? externalCallId = freezed,Object? directionRaw = freezed,Object? statusRaw = freezed,Object? callTypeRaw = freezed,Object? phoneNumber = freezed,Object? client = freezed,Object? clientName = freezed,Object? employee = freezed,Object? employeeName = freezed,Object? durationSeconds = freezed,Object? startedAt = freezed,Object? endedAt = freezed,Object? createdAt = freezed,}) {
  return _then(_CallRecordModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,connection: freezed == connection ? _self.connection : connection // ignore: cast_nullable_to_non_nullable
as String?,externalCallId: freezed == externalCallId ? _self.externalCallId : externalCallId // ignore: cast_nullable_to_non_nullable
as String?,directionRaw: freezed == directionRaw ? _self.directionRaw : directionRaw // ignore: cast_nullable_to_non_nullable
as String?,statusRaw: freezed == statusRaw ? _self.statusRaw : statusRaw // ignore: cast_nullable_to_non_nullable
as String?,callTypeRaw: freezed == callTypeRaw ? _self.callTypeRaw : callTypeRaw // ignore: cast_nullable_to_non_nullable
as String?,phoneNumber: freezed == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String?,client: freezed == client ? _self.client : client // ignore: cast_nullable_to_non_nullable
as String?,clientName: freezed == clientName ? _self.clientName : clientName // ignore: cast_nullable_to_non_nullable
as String?,employee: freezed == employee ? _self.employee : employee // ignore: cast_nullable_to_non_nullable
as String?,employeeName: freezed == employeeName ? _self.employeeName : employeeName // ignore: cast_nullable_to_non_nullable
as String?,durationSeconds: freezed == durationSeconds ? _self.durationSeconds : durationSeconds // ignore: cast_nullable_to_non_nullable
as int?,startedAt: freezed == startedAt ? _self.startedAt : startedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,endedAt: freezed == endedAt ? _self.endedAt : endedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
