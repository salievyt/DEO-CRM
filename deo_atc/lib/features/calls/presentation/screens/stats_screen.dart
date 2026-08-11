import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/atc_colors.dart';
import '../../../../core/theme/atc_spacing.dart';
import '../../../../core/theme/atc_typography.dart';
import '../../../../core/utils/format.dart';
import '../../../../widgets/atc_section_header.dart';
import '../../../../widgets/atc_state_view.dart';
import '../../../../widgets/atc_tile.dart';
import '../../domain/entities/call_stats.dart';
import '../providers/calls_providers.dart';

class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(callStatsProvider);

    return Scaffold(
      backgroundColor: AtcColors.canvas,
      body: SafeArea(
        child: statsAsync.when(
          loading: () => const AtcStateView.loading(),
          error: (error, _) => AtcStateView(
            icon: Icons.bar_chart_rounded,
            title: 'Не удалось загрузить статистику',
            subtitle: '$error',
            action: TextButton(
              onPressed: () => ref.invalidate(callStatsProvider),
              child: const Text('Повторить'),
            ),
          ),
          data: (stats) => ListView(
            padding: EdgeInsets.zero,
            children: [
              AtcTileSet.dark(
                padding: const EdgeInsets.all(AtcSpace.sectionPhone),
                semanticsLabel: 'Сводка по звонкам',
                child: _HeroStats(stats: stats),
              ),
              Padding(
                padding: const EdgeInsets.all(AtcSpace.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AtcSectionHeader(
                      eyebrow: 'ДЕТАЛИ',
                      title: 'Статистика',
                      subtitle: 'За все время по журналу АТС',
                    ),
                    const SizedBox(height: AtcSpace.lg),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: AtcSpace.sm,
                      crossAxisSpacing: AtcSpace.sm,
                      childAspectRatio: 1.5,
                      children: [
                        _StatCard(
                          icon: Icons.call_received_rounded,
                          value: '${stats.incoming}',
                          label: 'Входящие',
                          accent: true,
                        ),
                        _StatCard(
                          icon: Icons.call_made_rounded,
                          value: '${stats.outgoing}',
                          label: 'Исходящие',
                        ),
                        _StatCard(
                          icon: Icons.phone_missed_rounded,
                          value: '${stats.missed}',
                          label: 'Пропущенные',
                          danger: stats.missed > 0,
                        ),
                        _StatCard(
                          icon: Icons.check_circle_outline_rounded,
                          value: '${stats.answered}',
                          label: 'Отвечены',
                        ),
                        _StatCard(
                          icon: Icons.timelapse_rounded,
                          value: Fmt.duration(stats.totalDurationSeconds),
                          label: 'Разговор по времени',
                        ),
                        _StatCard(
                          icon: Icons.trending_down_rounded,
                          value: '${stats.missedRate}%',
                          label: 'Доля пропущенных',
                          danger: stats.missedRate > 20,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroStats extends StatelessWidget {
  const _HeroStats({required this.stats});

  final CallStats stats;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'СВОДКА',
          style: AtcTypography.navLink.copyWith(
            color: Colors.white60,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: AtcSpace.sm),
        Text(
          '${stats.total}',
          style: AtcTypography.heroDisplay.copyWith(color: Colors.white),
        ),
        Text(
          Fmt.plural(stats.total, 'звонок', 'звонка', 'звонков'),
          style: AtcTypography.leadAiry.copyWith(color: Colors.white70),
        ),
        const SizedBox(height: AtcSpace.lg),
        Row(
          children: [
            _InlineStat(value: '${stats.answered}', label: 'отвечено'),
            const SizedBox(width: AtcSpace.xl),
            _InlineStat(value: '${stats.missed}', label: 'пропущено'),
          ],
        ),
      ],
    );
  }
}

class _InlineStat extends StatelessWidget {
  const _InlineStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: AtcTypography.tagline.copyWith(color: Colors.white),
        ),
        Text(
          label,
          style: AtcTypography.finePrint.copyWith(color: Colors.white60),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
    this.accent = false,
    this.danger = false,
  });

  final IconData icon;
  final String value;
  final String label;
  final bool accent;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AtcSpace.md),
      decoration: BoxDecoration(
        color: AtcColors.canvas,
        borderRadius: BorderRadius.circular(AtcRadius.lg),
        border: Border.all(color: AtcColors.hairline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 18,
            color: danger
                ? AtcColors.primaryActive
                : (accent ? AtcColors.primary : AtcColors.inkMuted48),
          ),
          const Spacer(),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AtcTypography.displayMd.copyWith(
              color: AtcColors.ink,
              fontSize: 26,
              height: 1.1,
            ),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AtcTypography.finePrint.copyWith(color: AtcColors.inkMuted48),
          ),
        ],
      ),
    );
  }
}
