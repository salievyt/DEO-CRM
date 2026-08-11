// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'pbx_connection_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PbxConnectionModel {

 String get id; String get name; String? get provider;@JsonKey(name: 'api_url') String? get apiUrl;@JsonKey(name: 'ws_url') String? get wsUrl;@JsonKey(name: 'sip_domain') String? get sipDomain; String? get status;@JsonKey(name: 'is_default') bool? get isDefault;@JsonKey(name: 'created_at') DateTime? get createdAt;
/// Create a copy of PbxConnectionModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PbxConnectionModelCopyWith<PbxConnectionModel> get copyWith => _$PbxConnectionModelCopyWithImpl<PbxConnectionModel>(this as PbxConnectionModel, _$identity);

  /// Serializes this PbxConnectionModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PbxConnectionModel&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.apiUrl, apiUrl) || other.apiUrl == apiUrl)&&(identical(other.wsUrl, wsUrl) || other.wsUrl == wsUrl)&&(identical(other.sipDomain, sipDomain) || other.sipDomain == sipDomain)&&(identical(other.status, status) || other.status == status)&&(identical(other.isDefault, isDefault) || other.isDefault == isDefault)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,provider,apiUrl,wsUrl,sipDomain,status,isDefault,createdAt);

@override
String toString() {
  return 'PbxConnectionModel(id: $id, name: $name, provider: $provider, apiUrl: $apiUrl, wsUrl: $wsUrl, sipDomain: $sipDomain, status: $status, isDefault: $isDefault, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $PbxConnectionModelCopyWith<$Res>  {
  factory $PbxConnectionModelCopyWith(PbxConnectionModel value, $Res Function(PbxConnectionModel) _then) = _$PbxConnectionModelCopyWithImpl;
@useResult
$Res call({
 String id, String name, String? provider,@JsonKey(name: 'api_url') String? apiUrl,@JsonKey(name: 'ws_url') String? wsUrl,@JsonKey(name: 'sip_domain') String? sipDomain, String? status,@JsonKey(name: 'is_default') bool? isDefault,@JsonKey(name: 'created_at') DateTime? createdAt
});




}
/// @nodoc
class _$PbxConnectionModelCopyWithImpl<$Res>
    implements $PbxConnectionModelCopyWith<$Res> {
  _$PbxConnectionModelCopyWithImpl(this._self, this._then);

  final PbxConnectionModel _self;
  final $Res Function(PbxConnectionModel) _then;

/// Create a copy of PbxConnectionModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? provider = freezed,Object? apiUrl = freezed,Object? wsUrl = freezed,Object? sipDomain = freezed,Object? status = freezed,Object? isDefault = freezed,Object? createdAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,provider: freezed == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as String?,apiUrl: freezed == apiUrl ? _self.apiUrl : apiUrl // ignore: cast_nullable_to_non_nullable
as String?,wsUrl: freezed == wsUrl ? _self.wsUrl : wsUrl // ignore: cast_nullable_to_non_nullable
as String?,sipDomain: freezed == sipDomain ? _self.sipDomain : sipDomain // ignore: cast_nullable_to_non_nullable
as String?,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String?,isDefault: freezed == isDefault ? _self.isDefault : isDefault // ignore: cast_nullable_to_non_nullable
as bool?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [PbxConnectionModel].
extension PbxConnectionModelPatterns on PbxConnectionModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PbxConnectionModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PbxConnectionModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PbxConnectionModel value)  $default,){
final _that = this;
switch (_that) {
case _PbxConnectionModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PbxConnectionModel value)?  $default,){
final _that = this;
switch (_that) {
case _PbxConnectionModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String? provider, @JsonKey(name: 'api_url')  String? apiUrl, @JsonKey(name: 'ws_url')  String? wsUrl, @JsonKey(name: 'sip_domain')  String? sipDomain,  String? status, @JsonKey(name: 'is_default')  bool? isDefault, @JsonKey(name: 'created_at')  DateTime? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PbxConnectionModel() when $default != null:
return $default(_that.id,_that.name,_that.provider,_that.apiUrl,_that.wsUrl,_that.sipDomain,_that.status,_that.isDefault,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String? provider, @JsonKey(name: 'api_url')  String? apiUrl, @JsonKey(name: 'ws_url')  String? wsUrl, @JsonKey(name: 'sip_domain')  String? sipDomain,  String? status, @JsonKey(name: 'is_default')  bool? isDefault, @JsonKey(name: 'created_at')  DateTime? createdAt)  $default,) {final _that = this;
switch (_that) {
case _PbxConnectionModel():
return $default(_that.id,_that.name,_that.provider,_that.apiUrl,_that.wsUrl,_that.sipDomain,_that.status,_that.isDefault,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String? provider, @JsonKey(name: 'api_url')  String? apiUrl, @JsonKey(name: 'ws_url')  String? wsUrl, @JsonKey(name: 'sip_domain')  String? sipDomain,  String? status, @JsonKey(name: 'is_default')  bool? isDefault, @JsonKey(name: 'created_at')  DateTime? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _PbxConnectionModel() when $default != null:
return $default(_that.id,_that.name,_that.provider,_that.apiUrl,_that.wsUrl,_that.sipDomain,_that.status,_that.isDefault,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PbxConnectionModel extends PbxConnectionModel {
  const _PbxConnectionModel({required this.id, required this.name, this.provider, @JsonKey(name: 'api_url') this.apiUrl, @JsonKey(name: 'ws_url') this.wsUrl, @JsonKey(name: 'sip_domain') this.sipDomain, this.status, @JsonKey(name: 'is_default') this.isDefault, @JsonKey(name: 'created_at') this.createdAt}): super._();
  factory _PbxConnectionModel.fromJson(Map<String, dynamic> json) => _$PbxConnectionModelFromJson(json);

@override final  String id;
@override final  String name;
@override final  String? provider;
@override@JsonKey(name: 'api_url') final  String? apiUrl;
@override@JsonKey(name: 'ws_url') final  String? wsUrl;
@override@JsonKey(name: 'sip_domain') final  String? sipDomain;
@override final  String? status;
@override@JsonKey(name: 'is_default') final  bool? isDefault;
@override@JsonKey(name: 'created_at') final  DateTime? createdAt;

/// Create a copy of PbxConnectionModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PbxConnectionModelCopyWith<_PbxConnectionModel> get copyWith => __$PbxConnectionModelCopyWithImpl<_PbxConnectionModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PbxConnectionModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PbxConnectionModel&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.apiUrl, apiUrl) || other.apiUrl == apiUrl)&&(identical(other.wsUrl, wsUrl) || other.wsUrl == wsUrl)&&(identical(other.sipDomain, sipDomain) || other.sipDomain == sipDomain)&&(identical(other.status, status) || other.status == status)&&(identical(other.isDefault, isDefault) || other.isDefault == isDefault)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,provider,apiUrl,wsUrl,sipDomain,status,isDefault,createdAt);

@override
String toString() {
  return 'PbxConnectionModel(id: $id, name: $name, provider: $provider, apiUrl: $apiUrl, wsUrl: $wsUrl, sipDomain: $sipDomain, status: $status, isDefault: $isDefault, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$PbxConnectionModelCopyWith<$Res> implements $PbxConnectionModelCopyWith<$Res> {
  factory _$PbxConnectionModelCopyWith(_PbxConnectionModel value, $Res Function(_PbxConnectionModel) _then) = __$PbxConnectionModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String? provider,@JsonKey(name: 'api_url') String? apiUrl,@JsonKey(name: 'ws_url') String? wsUrl,@JsonKey(name: 'sip_domain') String? sipDomain, String? status,@JsonKey(name: 'is_default') bool? isDefault,@JsonKey(name: 'created_at') DateTime? createdAt
});




}
/// @nodoc
class __$PbxConnectionModelCopyWithImpl<$Res>
    implements _$PbxConnectionModelCopyWith<$Res> {
  __$PbxConnectionModelCopyWithImpl(this._self, this._then);

  final _PbxConnectionModel _self;
  final $Res Function(_PbxConnectionModel) _then;

/// Create a copy of PbxConnectionModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? provider = freezed,Object? apiUrl = freezed,Object? wsUrl = freezed,Object? sipDomain = freezed,Object? status = freezed,Object? isDefault = freezed,Object? createdAt = freezed,}) {
  return _then(_PbxConnectionModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,provider: freezed == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as String?,apiUrl: freezed == apiUrl ? _self.apiUrl : apiUrl // ignore: cast_nullable_to_non_nullable
as String?,wsUrl: freezed == wsUrl ? _self.wsUrl : wsUrl // ignore: cast_nullable_to_non_nullable
as String?,sipDomain: freezed == sipDomain ? _self.sipDomain : sipDomain // ignore: cast_nullable_to_non_nullable
as String?,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String?,isDefault: freezed == isDefault ? _self.isDefault : isDefault // ignore: cast_nullable_to_non_nullable
as bool?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
