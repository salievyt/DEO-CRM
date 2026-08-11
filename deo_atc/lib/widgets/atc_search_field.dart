import 'package:flutter/material.dart';

import '../core/theme/atc_colors.dart';
import '../core/theme/atc_spacing.dart';
import '../core/theme/atc_typography.dart';

/// Search field — canvas, pill radius, 44px, soft hairline border
/// (component search-input).
class AtcSearchField extends StatelessWidget {
  const AtcSearchField({
    super.key,
    this.controller,
    this.hintText = 'Поиск',
    this.onChanged,
    this.trailing,
  });

  final TextEditingController? controller;
  final String hintText;
  final ValueChanged<String>? onChanged;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: AtcColors.canvas,
        borderRadius: BorderRadius.circular(AtcRadius.pill),
        border: Border.all(color: const Color(0x14000000)),
      ),
      child: Row(
        children: [
          const SizedBox(width: AtcSpace.md),
          const Icon(
            Icons.search_rounded,
            size: 20,
            color: AtcColors.inkMuted48,
          ),
          const SizedBox(width: AtcSpace.xs),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: AtcTypography.body.copyWith(color: AtcColors.ink),
              decoration: InputDecoration(
                isCollapsed: true,
                hintText: hintText,
                hintStyle: AtcTypography.body.copyWith(
                  color: AtcColors.inkMuted48,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
          ),
          if (trailing != null) ...[
            trailing!,
            const SizedBox(width: AtcSpace.sm),
          ],
        ],
      ),
    );
  }
}
