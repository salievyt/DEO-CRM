import 'package:flutter/material.dart';

import '../core/theme/atc_colors.dart';
import '../core/theme/atc_spacing.dart';

/// Canvas of an edge-to-edge product tile.
enum AtcTileVariant {
  light,
  parchment,
  dark,
  dark2,
  dark3,
  black,
}

/// Full-bleed product tile (borderRadius 0 by design rule full-bleed-tiles).
/// Product tiles are the only surface allowed to cast product-shadow.
class AtcTile extends StatelessWidget {
  const AtcTile({
    super.key,
    required this.child,
    this.variant = AtcTileVariant.light,
    this.padding = const EdgeInsets.all(AtcSpace.xl),
    this.semanticsLabel,
  });

  final Widget child;
  final AtcTileVariant variant;
  final EdgeInsets padding;
  final String? semanticsLabel;

  Color get _color {
    switch (variant) {
      case AtcTileVariant.light:
        return AtcColors.canvas;
      case AtcTileVariant.parchment:
        return AtcColors.canvasParchment;
      case AtcTileVariant.dark:
        return AtcColors.surfaceTile1;
      case AtcTileVariant.dark2:
        return AtcColors.surfaceTile2;
      case AtcTileVariant.dark3:
        return AtcColors.surfaceTile3;
      case AtcTileVariant.black:
        return AtcColors.surfaceBlack;
    }
  }

  Color get _foreground {
    switch (variant) {
      case AtcTileVariant.light:
      case AtcTileVariant.parchment:
        return AtcColors.ink;
      case AtcTileVariant.dark:
      case AtcTileVariant.dark2:
      case AtcTileVariant.dark3:
      case AtcTileVariant.black:
        return AtcColors.onDark;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticsLabel,
      container: true,
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: _color,
          borderRadius: BorderRadius.zero,
        ),
        child: DefaultTextStyle.merge(
          style: TextStyle(color: _foreground),
          child: child,
        ),
      ),
    );
  }
}

/// Convenience constructors matching the product-tile component tokens.
class AtcTileSet {
  AtcTileSet._();

  static AtcTile light({required Widget child, EdgeInsets? padding, String? semanticsLabel}) {
    return AtcTile(
      variant: AtcTileVariant.light,
      padding: padding ?? const EdgeInsets.all(AtcSpace.sectionPhone),
      semanticsLabel: semanticsLabel,
      child: child,
    );
  }

  static AtcTile parchment({required Widget child, EdgeInsets? padding, String? semanticsLabel}) {
    return AtcTile(
      variant: AtcTileVariant.parchment,
      padding: padding ?? const EdgeInsets.all(AtcSpace.sectionPhone),
      semanticsLabel: semanticsLabel,
      child: child,
    );
  }

  static AtcTile dark({required Widget child, EdgeInsets? padding, String? semanticsLabel}) {
    return AtcTile(
      variant: AtcTileVariant.dark,
      padding: padding ?? const EdgeInsets.all(AtcSpace.sectionPhone),
      semanticsLabel: semanticsLabel,
      child: child,
    );
  }
}

/// Store utility card — canvas, lg radius, hairline border, no shadow.
class AtcCard extends StatelessWidget {
  const AtcCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AtcSpace.lg),
    this.onTap,
    this.dark = false,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final background = dark ? AtcColors.surfaceTile1 : AtcColors.canvas;
    final foreground = dark ? AtcColors.onDark : AtcColors.ink;
    final border = dark ? Colors.transparent : AtcColors.hairline;

    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AtcRadius.lg),
        border: Border.all(color: border),
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: foreground),
        child: child,
      ),
    );

    if (onTap == null) {
      return card;
    }
    return GestureDetector(onTap: onTap, child: card);
  }
}
