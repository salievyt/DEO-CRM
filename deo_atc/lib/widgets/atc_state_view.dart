import 'package:flutter/material.dart';

import '../core/theme/atc_colors.dart';
import '../core/theme/atc_spacing.dart';
import '../core/theme/atc_typography.dart';

/// Empty / loading / error state block used across feature screens.
class AtcStateView extends StatelessWidget {
  const AtcStateView({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.action,
    this.loading = false,
  });

  const AtcStateView.loading({super.key})
      : icon = Icons.phone_in_talk_rounded,
        title = 'Загрузка…',
        subtitle = null,
        action = null,
        loading = true;

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Padding(
        padding: EdgeInsets.all(AtcSpace.xxl),
        child: Center(
          child: SizedBox(
            width: 26,
            height: 26,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AtcColors.primary,
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(AtcSpace.xl),
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AtcColors.surfacePearl,
                  borderRadius: BorderRadius.circular(AtcRadius.lg),
                ),
                child: Icon(icon, size: 28, color: AtcColors.inkMuted48),
              ),
              const SizedBox(height: AtcSpace.md),
              Text(
                title,
                textAlign: TextAlign.center,
                style: AtcTypography.bodyStrong.copyWith(color: AtcColors.ink),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: AtcSpace.xs),
                Text(
                  subtitle!,
                  textAlign: TextAlign.center,
                  style: AtcTypography.caption.copyWith(color: AtcColors.inkMuted48),
                ),
              ],
              if (action != null) ...[
                const SizedBox(height: AtcSpace.lg),
                action!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}
