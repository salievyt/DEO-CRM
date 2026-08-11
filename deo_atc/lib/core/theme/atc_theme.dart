import 'package:flutter/material.dart';

import 'atc_colors.dart';
import 'atc_spacing.dart';
import 'atc_typography.dart';

/// Material theme assembled strictly from the ATC design tokens.
/// Rules enforced here: no gradients, no UI shadows, flat surfaces,
/// single orange interactive accent.
class AtcTheme {
  AtcTheme._();

  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamilyFallback: const ['SF Pro Text', 'system-ui', '-apple-system'],
    );

    final colorScheme = base.colorScheme.copyWith(
      primary: AtcColors.primary,
      onPrimary: AtcColors.onPrimary,
      secondary: AtcColors.primaryOnDark,
      surface: AtcColors.canvas,
      onSurface: AtcColors.ink,
      error: const Color(0xFFE53935),
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AtcColors.canvas,
      splashFactory: InkSparkle.splashFactory,
      textTheme: base.textTheme
          .apply(fontFamilyFallback: const ['SF Pro Text', 'system-ui'])
          .copyWith(
            displayLarge: AtcTypography.heroDisplay.copyWith(color: AtcColors.ink),
            displayMedium: AtcTypography.displayLg.copyWith(color: AtcColors.ink),
            displaySmall: AtcTypography.displayMd.copyWith(color: AtcColors.ink),
            headlineMedium: AtcTypography.tagline.copyWith(color: AtcColors.ink),
            titleLarge: AtcTypography.bodyStrong.copyWith(color: AtcColors.ink),
            bodyLarge: AtcTypography.body.copyWith(color: AtcColors.body),
            bodyMedium: AtcTypography.caption.copyWith(color: AtcColors.inkMuted48),
            bodySmall: AtcTypography.finePrint.copyWith(color: AtcColors.inkMuted48),
            labelLarge: AtcTypography.buttonUtility.copyWith(color: AtcColors.ink),
          ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AtcColors.surfaceBlack,
        foregroundColor: AtcColors.onDark,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: AtcColors.ink,
        unselectedLabelColor: AtcColors.inkMuted48,
        indicatorColor: AtcColors.primary,
        dividerColor: Colors.transparent,
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: AtcColors.canvas,
        side: BorderSide(color: AtcColors.hairline),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AtcRadius.pill)),
        labelStyle: AtcTypography.caption.copyWith(color: AtcColors.ink),
      ),
      cardTheme: base.cardTheme.copyWith(
        color: AtcColors.canvas,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AtcRadius.lg),
          side: const BorderSide(color: AtcColors.hairline),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AtcColors.dividerSoft,
        thickness: 1,
        space: 1,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AtcColors.canvas,
        hintStyle: AtcTypography.body.copyWith(color: AtcColors.inkMuted48),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AtcSpace.lg,
          vertical: AtcSpace.sm,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AtcRadius.pill),
          borderSide: const BorderSide(color: Color(0x14000000)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AtcRadius.pill),
          borderSide: const BorderSide(color: AtcColors.primaryFocus, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AtcRadius.pill),
          borderSide: const BorderSide(color: Color(0xFFE53935)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AtcColors.canvasParchment,
        indicatorColor: AtcColors.primary.withValues(alpha: 0.14),
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStatePropertyAll(
          AtcTypography.finePrint.copyWith(color: AtcColors.inkMuted48),
        ),
        iconTheme: const WidgetStatePropertyAll(
          IconThemeData(color: AtcColors.inkMuted48, size: 22),
        ),
      ),
    );
  }
}
