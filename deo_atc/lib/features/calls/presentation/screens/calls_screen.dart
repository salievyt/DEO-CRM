import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/atc_colors.dart';
import '../../../../core/theme/atc_spacing.dart';
import '../../../../core/theme/atc_typography.dart';
import '../../../../core/utils/format.dart';
import '../../../../widgets/atc_search_field.dart';
import '../../../../widgets/atc_section_header.dart';
import '../../../../widgets/atc_state_view.dart';
import '../../../../widgets/atc_tile.dart';
import '../../domain/entities/call_record.dart';
import '../providers/calls_providers.dart';
import '../widgets/call_list_tile.dart';

class CallsScreen extends ConsumerWidget {
  const CallsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(callsFilterProvider);
    final callsAsync = ref.watch(recentCallsProvider);

    return Scaffold(
      backgroundColor: AtcColors.canvasParchment,
      body: SafeArea(
        child: Column(
          children: [
            _Header(filter: filter),
            Expanded(child: _CallsBody(callsAsync: callsAsync)),
          ],
        ),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.filter});

  final CallsFilter filter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = CallsFilterKind.values;

    return Container(
      color: AtcColors.canvasParchment,
      padding: const EdgeInsets.fromLTRB(
        AtcSpace.lg,
        AtcSpace.sm,
        AtcSpace.lg,
        AtcSpace.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AtcSectionHeader(
            eyebrow: 'ЖУРНАЛ',
            title: 'Звонки',
            subtitle: 'История звонков АТС',
          ),
          const SizedBox(height: AtcSpace.md),
          const AtcSearchField(hintText: 'Номер или имя клиента'),
          const SizedBox(height: AtcSpace.sm),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: filters.map((kind) {
                final selected = filter.kind == kind;
                return Padding(
                  padding: const EdgeInsets.only(right: AtcSpace.xs),
                  child: _FilterChip(
                    label: switch (kind) {
                      CallsFilterKind.all => 'Все',
                      CallsFilterKind.incoming => 'Входящие',
                      CallsFilterKind.outgoing => 'Исходящие',
                      CallsFilterKind.missed => 'Пропущенные',
                    },
                    selected: selected,
                    onTap: () =>
                        ref.read(callsFilterProvider.notifier).apply(kind),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AtcMotion.standard,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AtcColors.ink : AtcColors.canvas,
          borderRadius: BorderRadius.circular(AtcRadius.pill),
          border: selected
              ? null
              : Border.all(color: AtcColors.hairline),
        ),
        child: Text(
          label,
          style: AtcTypography.caption.copyWith(
            color: selected ? AtcColors.onDark : AtcColors.inkMuted48,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ),
    );
  }
}

class _CallsBody extends ConsumerWidget {
  const _CallsBody({required this.callsAsync});

  final AsyncValue<List<CallRecord>> callsAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return callsAsync.when(
      loading: () => const AtcStateView.loading(),
      error: (error, _) => AtcStateView(
        icon: Icons.wifi_off_rounded,
        title: 'Не удалось загрузить звонки',
        subtitle: '$error',
        action: TextButton(
          onPressed: () =>
              ref.invalidate(recentCallsProvider),
          child: const Text('Повторить'),
        ),
      ),
      data: (calls) {
        if (calls.isEmpty) {
          return AtcStateView(
            icon: Icons.phone_disabled_rounded,
            title: 'Звонков нет',
            subtitle: 'Когда АТС передаст звонки в CRM, они появятся здесь',
          );
        }

        final byDay = <String, List<CallRecord>>{};
        for (final call in calls) {
          final day = call.startedAt == null
              ? 'Без даты'
              : Fmt.date(call.startedAt!);
          byDay.putIfAbsent(day, () => []).add(call);
        }

        return RefreshIndicator(
          color: AtcColors.primary,
          onRefresh: () async {
            ref.invalidate(recentCallsProvider);
            await ref.read(recentCallsProvider.future);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AtcSpace.lg,
              0,
              AtcSpace.lg,
              AtcSpace.xl,
            ),
            children: [
              for (final entry in byDay.entries) ...[
                Padding(
                  padding: const EdgeInsets.only(top: AtcSpace.md, bottom: AtcSpace.xs),
                  child: Text(
                    entry.key,
                    style: AtcTypography.navLink.copyWith(
                      color: AtcColors.inkMuted48,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
                AtcCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (var i = 0; i < entry.value.length; i++) ...[
                        CallListTile(call: entry.value[i]),
                        if (i != entry.value.length - 1)
                          const Divider(indent: 72),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
