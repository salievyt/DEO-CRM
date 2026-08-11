import 'dart:ui';

import 'package:flutter/material.dart';

import '../core/theme/atc_colors.dart';
import '../core/theme/atc_spacing.dart';
import '../core/theme/atc_typography.dart';

/// Global nav — surface-black, 44px, nav-link typography (component global-nav).
class AtcGlobalNav extends StatelessWidget implements PreferredSizeWidget {
  const AtcGlobalNav({
    super.key,
    this.title,
    this.leading,
    this.trailing,
  });

  final Widget? title;
  final Widget? leading;
  final Widget? trailing;

  @override
  Size get preferredSize => const Size.fromHeight(44);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      color: AtcColors.surfaceBlack,
      padding: const EdgeInsets.symmetric(horizontal: AtcSpace.md),
      child: Row(
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: AtcSpace.sm),
          ],
          Expanded(
            child: title ?? const SizedBox.shrink(),
          ),
          if (trailing != null) ...[
            const SizedBox(width: AtcSpace.sm),
            trailing!,
          ],
        ],
      ),
    );
  }
}

/// Frosted sub-nav — parchment, 52px, tagline type, saturate+blur backdrop
/// (component sub-nav-frosted).
class AtcSubNav extends StatelessWidget implements PreferredSizeWidget {
  const AtcSubNav({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<String> items;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Size get preferredSize => const Size.fromHeight(52);

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 52,
          color: AtcColors.canvasParchment.withValues(alpha: 0.8),
          child: Row(
            children: List.generate(items.length, (index) {
              final selected = index == selectedIndex;
              return Expanded(
                child: GestureDetector(
                  onTap: () => onSelected(index),
                  child: Center(
                    child: Text(
                      items[index],
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AtcTypography.tagline.copyWith(
                        color: selected ? AtcColors.ink : AtcColors.inkMuted48,
                        fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
