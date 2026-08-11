import 'package:flutter/material.dart';

/// ATC design system — typography tokens.
/// SF Pro Display / SF Pro Text scales from ATC-DESIGN.md.
/// Fonts resolve to the platform default so iOS renders real SF Pro.
class AtcTypography {
  AtcTypography._();

  static const double _displayTracking = -0.28;

  static const TextStyle heroDisplay = TextStyle(
    fontSize: 56,
    height: 1.07,
    fontWeight: FontWeight.w600,
    letterSpacing: _displayTracking,
  );

  static const TextStyle displayLg = TextStyle(
    fontSize: 40,
    height: 1.1,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
  );

  static const TextStyle displayMd = TextStyle(
    fontSize: 34,
    height: 1.47,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.374,
  );

  static const TextStyle lead = TextStyle(
    fontSize: 28,
    height: 1.14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.196,
  );

  static const TextStyle leadAiry = TextStyle(
    fontSize: 24,
    height: 1.5,
    fontWeight: FontWeight.w300,
    letterSpacing: 0,
  );

  static const TextStyle tagline = TextStyle(
    fontSize: 21,
    height: 1.19,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.231,
  );

  static const TextStyle bodyStrong = TextStyle(
    fontSize: 17,
    height: 1.24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.374,
  );

  static const TextStyle body = TextStyle(
    fontSize: 17,
    height: 1.47,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.374,
  );

  static const TextStyle denseLink = TextStyle(
    fontSize: 17,
    height: 2.41,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 14,
    height: 1.43,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.224,
  );

  static const TextStyle captionStrong = TextStyle(
    fontSize: 14,
    height: 1.29,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.224,
  );

  static const TextStyle buttonLarge = TextStyle(
    fontSize: 18,
    height: 1.0,
    fontWeight: FontWeight.w300,
    letterSpacing: 0,
  );

  static const TextStyle buttonUtility = TextStyle(
    fontSize: 14,
    height: 1.29,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.224,
  );

  static const TextStyle finePrint = TextStyle(
    fontSize: 12,
    height: 1.0,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.12,
  );

  static const TextStyle microLegal = TextStyle(
    fontSize: 10,
    height: 1.3,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.08,
  );

  static const TextStyle navLink = TextStyle(
    fontSize: 12,
    height: 1.0,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.12,
  );
}
