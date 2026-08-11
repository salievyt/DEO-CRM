import 'package:flutter/material.dart';

import '../core/theme/atc_spacing.dart';
import '../core/theme/atc_typography.dart';

/// Editorial section header — eyebrow + display title + optional action.
class AtcSectionHeader extends StatelessWidget {
  const AtcSectionHeader({
    super.key,
    this.eyebrow,
    required this.title,
    this.subtitle,
    this.action,
    this.light = false,
  });

  final String? eyebrow;
  final String title;
  final String? subtitle;
  final Widget? action;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final foreground = light ? Colors.white : null;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (eyebrow != null) ...[
                Text(
                  eyebrow!,
                  style: AtcTypography.navLink.copyWith(
                    color: light ? Colors.white70 : null,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: AtcSpace.xs),
              ],
              Text(
                title,
                style: AtcTypography.displayMd.copyWith(color: foreground),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: AtcSpace.xs),
                Text(
                  subtitle!,
                  style: AtcTypography.caption.copyWith(
                    color: light ? Colors.white60 : null,
                  ),
                ),
              ],
            ],
          ),
        ),
        ?action,
      ],
    );
  }
}
