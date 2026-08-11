import 'package:flutter/material.dart';

import '../core/theme/atc_colors.dart';
import '../core/theme/atc_spacing.dart';
import '../core/theme/atc_typography.dart';

/// Configurator option chip — pill, canvas background, optional selected ring.
class AtcChip extends StatelessWidget {
  const AtcChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.leading,
    this.trailing,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Widget? leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AtcMotion.standard,
        curve: AtcMotion.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AtcColors.canvas,
          borderRadius: BorderRadius.circular(AtcRadius.pill),
          border: Border.all(
            color: selected ? AtcColors.primaryFocus : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: AtcSpace.xs)],
            Text(
              label,
              style: AtcTypography.caption.copyWith(color: AtcColors.ink),
            ),
            if (trailing != null) ...[const SizedBox(width: AtcSpace.xs), trailing!],
          ],
        ),
      ),
    );
  }
}
