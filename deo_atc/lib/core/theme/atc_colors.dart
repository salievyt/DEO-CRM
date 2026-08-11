import 'package:flutter/material.dart';

/// ATC design system — color tokens.
/// Source of truth: ATC-DESIGN.md (Apple-inspired-orange-design-system).
class AtcColors {
  AtcColors._();

  static const Color primary = Color(0xFFF08331);
  static const Color primaryFocus = Color(0xFFFF944D);
  static const Color primaryActive = Color(0xFFD96F25);
  static const Color primaryOnDark = Color(0xFFFF9A5C);

  static const Color ink = Color(0xFF1d1d1f);
  static const Color body = Color(0xFF1d1d1f);
  static const Color bodyOnDark = Color(0xFFFFFFFF);

  static const Color bodyMuted = Color(0xFFCCCCCC);
  static const Color inkMuted80 = Color(0xFF333333);
  static const Color inkMuted48 = Color(0xFF7A7A7A);

  static const Color dividerSoft = Color(0xFFF0F0F0);
  static const Color hairline = Color(0xFFE0E0E0);

  static const Color canvas = Color(0xFFFFFFFF);
  static const Color canvasParchment = Color(0xFFF5F5F7);
  static const Color surfacePearl = Color(0xFFFAFAFC);

  static const Color surfaceTile1 = Color(0xFF272729);
  static const Color surfaceTile2 = Color(0xFF2A2A2C);
  static const Color surfaceTile3 = Color(0xFF252527);
  static const Color surfaceBlack = Color(0xFF000000);

  static const Color surfaceChipTranslucent = Color(0xFFD2D2D7);

  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onDark = Color(0xFFFFFFFF);
}

/// Dark canvas variants for edge-to-edge product tiles.
class AtcTileSurface {
  AtcTileSurface._();

  static const List<Color> dark = [
    AtcColors.surfaceTile1,
    AtcColors.surfaceTile2,
    AtcColors.surfaceTile3,
  ];
}
