import 'package:flutter/material.dart';

import '../core/theme/atc_colors.dart';
import '../core/theme/atc_spacing.dart';
import '../core/theme/atc_typography.dart';

/// Button variants defined in ATC-DESIGN.md.
enum AtcButtonVariant {
  primary,
  secondary,
  darkUtility,
  pearlCapsule,
  storeHero,
  link,
}

/// Scale 0.95 on press, 120ms ease-out (motion.button-active).
class _PressScale extends StatefulWidget {
  const _PressScale({
    required this.child,
    required this.onPressed,
    this.backgroundRadius = AtcRadius.pill,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final double backgroundRadius;

  @override
  State<_PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<_PressScale> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;
    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
      onTapCancel: enabled ? () => setState(() => _pressed = false) : null,
      onTapUp: enabled
          ? (_) {
              setState(() => _pressed = false);
            }
          : null,
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _pressed ? 0.95 : 1.0,
        duration: AtcMotion.fast,
        curve: AtcMotion.easeOut,
        child: widget.child,
      ),
    );
  }
}

class AtcButton extends StatelessWidget {
  const AtcButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AtcButtonVariant.primary,
    this.icon,
    this.fullWidth = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final AtcButtonVariant variant;
  final IconData? icon;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final style = _style(variant);
    final enabled = onPressed != null;
    final textColor = enabled ? style.color : AtcColors.inkMuted48;
    final backgroundColor =
        enabled ? style.backgroundColor : AtcColors.dividerSoft;
    final borderColor = enabled ? style.borderColor : AtcColors.dividerSoft;

    final content = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, size: style.iconSize, color: textColor),
          const SizedBox(width: AtcSpace.xs),
        ],
        Flexible(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: style.textStyle.copyWith(color: textColor),
          ),
        ),
      ],
    );

    final button = Container(
      height: style.height,
      constraints: fullWidth ? const BoxConstraints(minWidth: double.infinity) : null,
      padding: style.padding,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(style.radius),
        border: borderColor == null
            ? null
            : Border.all(color: borderColor, width: style.borderWidth),
      ),
      child: content,
    );

    return _PressScale(onPressed: onPressed, backgroundRadius: style.radius, child: button);
  }

  AtcButtonStyle _style(AtcButtonVariant variant) {
    switch (variant) {
      case AtcButtonVariant.primary:
        return const AtcButtonStyle(
          color: AtcColors.onPrimary,
          backgroundColor: AtcColors.primary,
          radius: AtcRadius.pill,
          padding: EdgeInsets.symmetric(horizontal: 22, vertical: 11),
          textStyle: AtcTypography.body,
        );
      case AtcButtonVariant.secondary:
        return const AtcButtonStyle(
          color: AtcColors.primary,
          backgroundColor: Colors.transparent,
          borderColor: AtcColors.primary,
          borderWidth: 1,
          radius: AtcRadius.pill,
          padding: EdgeInsets.symmetric(horizontal: 22, vertical: 11),
          textStyle: AtcTypography.body,
        );
      case AtcButtonVariant.darkUtility:
        return const AtcButtonStyle(
          color: AtcColors.onDark,
          backgroundColor: AtcColors.ink,
          radius: AtcRadius.sm,
          padding: EdgeInsets.symmetric(horizontal: 15, vertical: 8),
          textStyle: AtcTypography.buttonUtility,
        );
      case AtcButtonVariant.pearlCapsule:
        return const AtcButtonStyle(
          color: AtcColors.inkMuted80,
          backgroundColor: AtcColors.surfacePearl,
          radius: AtcRadius.md,
          padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          textStyle: AtcTypography.caption,
        );
      case AtcButtonVariant.storeHero:
        return const AtcButtonStyle(
          color: AtcColors.onPrimary,
          backgroundColor: AtcColors.primary,
          radius: AtcRadius.pill,
          padding: EdgeInsets.symmetric(horizontal: 28, vertical: 14),
          textStyle: AtcTypography.buttonLarge,
          iconSize: 20,
        );
      case AtcButtonVariant.link:
        return const AtcButtonStyle(
          color: AtcColors.primary,
          backgroundColor: Colors.transparent,
          radius: AtcRadius.none,
          padding: EdgeInsets.zero,
          textStyle: AtcTypography.body,
        );
    }
  }
}

class AtcButtonStyle {
  const AtcButtonStyle({
    required this.color,
    required this.backgroundColor,
    required this.radius,
    required this.padding,
    required this.textStyle,
    this.borderColor,
    this.borderWidth = 0,
    this.iconSize = 18,
    this.height,
  });

  final Color color;
  final Color backgroundColor;
  final double radius;
  final EdgeInsets padding;
  final TextStyle textStyle;
  final Color? borderColor;
  final double borderWidth;
  final double iconSize;
  final double? height;
}

/// Circular icon button — surface-chip-translucent, full radius, 44px.
class AtcIconButton extends StatelessWidget {
  const AtcIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.size = 44,
    this.tooltip,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final double size;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    final background = enabled
        ? AtcColors.surfaceChipTranslucent
        : AtcColors.dividerSoft;
    final color = enabled ? AtcColors.ink : AtcColors.inkMuted48;

    final button = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: background, shape: BoxShape.circle),
      child: Icon(icon, size: size * 0.42, color: color),
    );

    final content = tooltip == null ? button : Tooltip(message: tooltip!, child: button);
    return _PressScale(onPressed: onPressed, backgroundRadius: size / 2, child: content);
  }
}
