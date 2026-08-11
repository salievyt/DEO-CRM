// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'sip_account_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SipAccountModel {

 String get id; String? get connection; String? get extension; String? get name; String? get user;@JsonKey(name: 'is_active') bool? get isActive;
/// Create a copy of SipAccountModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SipAccountModelCopyWith<SipAccountModel> get copyWith => _$SipAccountModelCopyWithImpl<SipAccountModel>(this as SipAccountModel, _$identity);

  /// Serializes this SipAccountModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SipAccountModel&&(identical(other.id, id) || other.id == id)&&(identical(other.connection, connection) || other.connection == connection)&&(identical(other.extension, extension) || other.extension == extension)&&(identical(other.name, name) || other.name == name)&&(identical(other.user, user) || other.user == user)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,connection,extension,name,user,isActive);

@override
String toString() {
  return 'SipAccountModel(id: $id, connection: $connection, extension: $extension, name: $name, user: $user, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class $SipAccountModelCopyWith<$Res>  {
  factory $SipAccountModelCopyWith(SipAccountModel value, $Res Function(SipAccountModel) _then) = _$SipAccountModelCopyWithImpl;
@useResult
$Res call({
 String id, String? connection, String? extension, String? name, String? user,@JsonKey(name: 'is_active') bool? isActive
});




}
/// @nodoc
class _$SipAccountModelCopyWithImpl<$Res>
    implements $SipAccountModelCopyWith<$Res> {
  _$SipAccountModelCopyWithImpl(this._self, this._then);

  final SipAccountModel _self;
  final $Res Function(SipAccountModel) _then;

/// Create a copy of SipAccountModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? connection = freezed,Object? extension = freezed,Object? name = freezed,Object? user = freezed,Object? isActive = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,connection: freezed == connection ? _self.connection : connection // ignore: cast_nullable_to_non_nullable
as String?,extension: freezed == extension ? _self.extension : extension // ignore: cast_nullable_to_non_nullable
as String?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,user: freezed == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as String?,isActive: freezed == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool?,
  ));
}

}


/// Adds pattern-matching-related methods to [SipAccountModel].
extension SipAccountModelPatterns on SipAccountModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SipAccountModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SipAccountModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SipAccountModel value)  $default,){
final _that = this;
switch (_that) {
case _SipAccountModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SipAccountModel value)?  $default,){
final _that = this;
switch (_that) {
case _SipAccountModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? connection,  String? extension,  String? name,  String? user, @JsonKey(name: 'is_active')  bool? isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SipAccountModel() when $default != null:
return $default(_that.id,_that.connection,_that.extension,_that.name,_that.user,_that.isActive);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? connection,  String? extension,  String? name,  String? user, @JsonKey(name: 'is_active')  bool? isActive)  $default,) {final _that = this;
switch (_that) {
case _SipAccountModel():
return $default(_that.id,_that.connection,_that.extension,_that.name,_that.user,_that.isActive);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? connection,  String? extension,  String? name,  String? user, @JsonKey(name: 'is_active')  bool? isActive)?  $default,) {final _that = this;
switch (_that) {
case _SipAccountModel() when $default != null:
return $default(_that.id,_that.connection,_that.extension,_that.name,_that.user,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SipAccountModel extends SipAccountModel {
  const _SipAccountModel({required this.id, this.connection, this.extension, this.name, this.user, @JsonKey(name: 'is_active') this.isActive}): super._();
  factory _SipAccountModel.fromJson(Map<String, dynamic> json) => _$SipAccountModelFromJson(json);

@override final  String id;
@override final  String? connection;
@override final  String? extension;
@override final  String? name;
@override final  String? user;
@override@JsonKey(name: 'is_active') final  bool? isActive;

/// Create a copy of SipAccountModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SipAccountModelCopyWith<_SipAccountModel> get copyWith => __$SipAccountModelCopyWithImpl<_SipAccountModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SipAccountModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SipAccountModel&&(identical(other.id, id) || other.id == id)&&(identical(other.connection, connection) || other.connection == connection)&&(identical(other.extension, extension) || other.extension == extension)&&(identical(other.name, name) || other.name == name)&&(identical(other.user, user) || other.user == user)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,connection,extension,name,user,isActive);

@override
String toString() {
  return 'SipAccountModel(id: $id, connection: $connection, extension: $extension, name: $name, user: $user, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$SipAccountModelCopyWith<$Res> implements $SipAccountModelCopyWith<$Res> {
  factory _$SipAccountModelCopyWith(_SipAccountModel value, $Res Function(_SipAccountModel) _then) = __$SipAccountModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String? connection, String? extension, String? name, String? user,@JsonKey(name: 'is_active') bool? isActive
});




}
/// @nodoc
class __$SipAccountModelCopyWithImpl<$Res>
    implements _$SipAccountModelCopyWith<$Res> {
  __$SipAccountModelCopyWithImpl(this._self, this._then);

  final _SipAccountModel _self;
  final $Res Function(_SipAccountModel) _then;

/// Create a copy of SipAccountModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? connection = freezed,Object? extension = freezed,Object? name = freezed,Object? user = freezed,Object? isActive = freezed,}) {
  return _then(_SipAccountModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,connection: freezed == connection ? _self.connection : connection // ignore: cast_nullable_to_non_nullable
as String?,extension: freezed == extension ? _self.extension : extension // ignore: cast_nullable_to_non_nullable
as String?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,user: freezed == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as String?,isActive: freezed == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool?,
  ));
}


}

// dart format on
