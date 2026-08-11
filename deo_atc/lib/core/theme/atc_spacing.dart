import 'package:flutter/material.dart';

/// ATC design system — spacing, radii, motion and layout constants.
class AtcSpace {
  AtcSpace._();

  static const double xxs = 4;
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 17;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;

  /// Editorial section padding, scaled down for phone canvases.
  static const double section = 80;
  static const double sectionPhone = 48;
  static const double sectionSmallPhone = 40;
}

class AtcRadius {
  AtcRadius._();

  static const double none = 0;
  static const double xs = 5;
  static const double sm = 8;
  static const double md = 11;
  static const double lg = 18;
  static const double pill = 9999;
  static const double full = 9999;
}

class AtcMotion {
  AtcMotion._();

  static const Duration fast = Duration(milliseconds: 120);
  static const Duration standard = Duration(milliseconds: 240);

  static const Curve easeOut = Curves.easeOut;
}

class AtcElevation {
  AtcElevation._();

  /// UI chrome never casts shadows — only products do.
  static const List<BoxShadow> none = <BoxShadow>[];

  /// The one allowed product shadow (rgba(0,0,0,0.22) 3px 5px 30px).
  static const List<BoxShadow> product = <BoxShadow>[
    BoxShadow(
      color: Color(0x38_000000),
      offset: Offset(3, 5),
      blurRadius: 30,
    ),
  ];
}
