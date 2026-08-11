import 'package:flutter/material.dart';

import '../core/theme/atc_colors.dart';
import '../core/theme/atc_spacing.dart';
import '../core/theme/atc_typography.dart';

/// Small caption pill used for call statuses and record tags.
class AtcPill extends StatelessWidget {
  const AtcPill({
    super.key,
    required this.label,
    this.onDark = false,
    this.accent = false,
    this.danger = false,
    this.outline = false,
    this.dot = false,
  });

  final String label;
  final bool onDark;
  final bool accent;
  final bool danger;
  final bool outline;
  final bool dot;

  @override
  Widget build(BuildContext context) {
    final Color background;
    final Color foreground;
    final Color dotColor;

    if (danger) {
      background = onDark
          ? const Color(0xFF4A1D16)
          : const Color(0xFFFBEAE6);
      foreground = onDark ? const Color(0xFFFFB4A0) : const Color(0xFFB3261E);
      dotColor = foreground;
    } else if (accent) {
      background = onDark
          ? const Color(0xFF4A2A0E)
          : const Color(0xFFFFEFE0);
      foreground = onDark ? AtcColors.primaryOnDark : AtcColors.primaryActive;
      dotColor = AtcColors.primary;
    } else {
      background = onDark
          ? AtcColors.surfaceTile3
          : AtcColors.surfacePearl;
      foreground = onDark ? AtcColors.bodyMuted : AtcColors.inkMuted48;
      dotColor = onDark ? AtcColors.bodyMuted : AtcColors.inkMuted48;
    }

    final border = outline ? Border.all(color: AtcColors.hairline) : null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AtcSpace.sm, vertical: AtcSpace.xxs),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AtcRadius.pill),
        border: border,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: AtcTypography.finePrint.copyWith(
              color: foreground,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
