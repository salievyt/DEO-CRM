// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'call_stats_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CallStatsModel {

 int get total; int get incoming; int get outgoing; int get missed; int get answered;@JsonKey(name: 'total_duration_seconds') int get totalDurationSeconds;
/// Create a copy of CallStatsModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CallStatsModelCopyWith<CallStatsModel> get copyWith => _$CallStatsModelCopyWithImpl<CallStatsModel>(this as CallStatsModel, _$identity);

  /// Serializes this CallStatsModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CallStatsModel&&(identical(other.total, total) || other.total == total)&&(identical(other.incoming, incoming) || other.incoming == incoming)&&(identical(other.outgoing, outgoing) || other.outgoing == outgoing)&&(identical(other.missed, missed) || other.missed == missed)&&(identical(other.answered, answered) || other.answered == answered)&&(identical(other.totalDurationSeconds, totalDurationSeconds) || other.totalDurationSeconds == totalDurationSeconds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,total,incoming,outgoing,missed,answered,totalDurationSeconds);

@override
String toString() {
  return 'CallStatsModel(total: $total, incoming: $incoming, outgoing: $outgoing, missed: $missed, answered: $answered, totalDurationSeconds: $totalDurationSeconds)';
}


}

/// @nodoc
abstract mixin class $CallStatsModelCopyWith<$Res>  {
  factory $CallStatsModelCopyWith(CallStatsModel value, $Res Function(CallStatsModel) _then) = _$CallStatsModelCopyWithImpl;
@useResult
$Res call({
 int total, int incoming, int outgoing, int missed, int answered,@JsonKey(name: 'total_duration_seconds') int totalDurationSeconds
});




}
/// @nodoc
class _$CallStatsModelCopyWithImpl<$Res>
    implements $CallStatsModelCopyWith<$Res> {
  _$CallStatsModelCopyWithImpl(this._self, this._then);

  final CallStatsModel _self;
  final $Res Function(CallStatsModel) _then;

/// Create a copy of CallStatsModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? total = null,Object? incoming = null,Object? outgoing = null,Object? missed = null,Object? answered = null,Object? totalDurationSeconds = null,}) {
  return _then(_self.copyWith(
total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,incoming: null == incoming ? _self.incoming : incoming // ignore: cast_nullable_to_non_nullable
as int,outgoing: null == outgoing ? _self.outgoing : outgoing // ignore: cast_nullable_to_non_nullable
as int,missed: null == missed ? _self.missed : missed // ignore: cast_nullable_to_non_nullable
as int,answered: null == answered ? _self.answered : answered // ignore: cast_nullable_to_non_nullable
as int,totalDurationSeconds: null == totalDurationSeconds ? _self.totalDurationSeconds : totalDurationSeconds // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [CallStatsModel].
extension CallStatsModelPatterns on CallStatsModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CallStatsModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CallStatsModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CallStatsModel value)  $default,){
final _that = this;
switch (_that) {
case _CallStatsModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CallStatsModel value)?  $default,){
final _that = this;
switch (_that) {
case _CallStatsModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int total,  int incoming,  int outgoing,  int missed,  int answered, @JsonKey(name: 'total_duration_seconds')  int totalDurationSeconds)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CallStatsModel() when $default != null:
return $default(_that.total,_that.incoming,_that.outgoing,_that.missed,_that.answered,_that.totalDurationSeconds);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int total,  int incoming,  int outgoing,  int missed,  int answered, @JsonKey(name: 'total_duration_seconds')  int totalDurationSeconds)  $default,) {final _that = this;
switch (_that) {
case _CallStatsModel():
return $default(_that.total,_that.incoming,_that.outgoing,_that.missed,_that.answered,_that.totalDurationSeconds);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int total,  int incoming,  int outgoing,  int missed,  int answered, @JsonKey(name: 'total_duration_seconds')  int totalDurationSeconds)?  $default,) {final _that = this;
switch (_that) {
case _CallStatsModel() when $default != null:
return $default(_that.total,_that.incoming,_that.outgoing,_that.missed,_that.answered,_that.totalDurationSeconds);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CallStatsModel extends CallStatsModel {
  const _CallStatsModel({required this.total, required this.incoming, required this.outgoing, required this.missed, required this.answered, @JsonKey(name: 'total_duration_seconds') required this.totalDurationSeconds}): super._();
  factory _CallStatsModel.fromJson(Map<String, dynamic> json) => _$CallStatsModelFromJson(json);

@override final  int total;
@override final  int incoming;
@override final  int outgoing;
@override final  int missed;
@override final  int answered;
@override@JsonKey(name: 'total_duration_seconds') final  int totalDurationSeconds;

/// Create a copy of CallStatsModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CallStatsModelCopyWith<_CallStatsModel> get copyWith => __$CallStatsModelCopyWithImpl<_CallStatsModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CallStatsModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CallStatsModel&&(identical(other.total, total) || other.total == total)&&(identical(other.incoming, incoming) || other.incoming == incoming)&&(identical(other.outgoing, outgoing) || other.outgoing == outgoing)&&(identical(other.missed, missed) || other.missed == missed)&&(identical(other.answered, answered) || other.answered == answered)&&(identical(other.totalDurationSeconds, totalDurationSeconds) || other.totalDurationSeconds == totalDurationSeconds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,total,incoming,outgoing,missed,answered,totalDurationSeconds);

@override
String toString() {
  return 'CallStatsModel(total: $total, incoming: $incoming, outgoing: $outgoing, missed: $missed, answered: $answered, totalDurationSeconds: $totalDurationSeconds)';
}


}

/// @nodoc
abstract mixin class _$CallStatsModelCopyWith<$Res> implements $CallStatsModelCopyWith<$Res> {
  factory _$CallStatsModelCopyWith(_CallStatsModel value, $Res Function(_CallStatsModel) _then) = __$CallStatsModelCopyWithImpl;
@override @useResult
$Res call({
 int total, int incoming, int outgoing, int missed, int answered,@JsonKey(name: 'total_duration_seconds') int totalDurationSeconds
});




}
/// @nodoc
class __$CallStatsModelCopyWithImpl<$Res>
    implements _$CallStatsModelCopyWith<$Res> {
  __$CallStatsModelCopyWithImpl(this._self, this._then);

  final _CallStatsModel _self;
  final $Res Function(_CallStatsModel) _then;

/// Create a copy of CallStatsModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? total = null,Object? incoming = null,Object? outgoing = null,Object? missed = null,Object? answered = null,Object? totalDurationSeconds = null,}) {
  return _then(_CallStatsModel(
total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,incoming: null == incoming ? _self.incoming : incoming // ignore: cast_nullable_to_non_nullable
as int,outgoing: null == outgoing ? _self.outgoing : outgoing // ignore: cast_nullable_to_non_nullable
as int,missed: null == missed ? _self.missed : missed // ignore: cast_nullable_to_non_nullable
as int,answered: null == answered ? _self.answered : answered // ignore: cast_nullable_to_non_nullable
as int,totalDurationSeconds: null == totalDurationSeconds ? _self.totalDurationSeconds : totalDurationSeconds // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
