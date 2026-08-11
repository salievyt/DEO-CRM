import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/atc_colors.dart';
import '../../../../core/theme/atc_spacing.dart';
import '../../../../core/theme/atc_typography.dart';
import '../../../../core/utils/format.dart';
import '../../../../widgets/atc_button.dart';
import '../../../../widgets/atc_section_header.dart';
import '../../../../widgets/atc_state_view.dart';
import '../../../../widgets/atc_tile.dart';
import '../../domain/entities/live_call.dart';
import '../providers/live_calls_providers.dart';

class LiveScreen extends ConsumerStatefulWidget {
  const LiveScreen({super.key});

  @override
  ConsumerState<LiveScreen> createState() => _LiveScreenState();
}

class _LiveScreenState extends ConsumerState<LiveScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(liveCallsProvider.notifier).connect();
    });
  }

  @override
  Widget build(BuildContext context) {
    final calls = ref.watch(liveCallsProvider).value ?? const <LiveCall>[];
    final connected = ref.watch(liveCallsProvider.notifier).isConnected;

    return Scaffold(
      backgroundColor: AtcColors.canvas,
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _HeroTile(connected: connected, callsCount: calls.length),
            Padding(
              padding: const EdgeInsets.all(AtcSpace.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const AtcSectionHeader(
                    eyebrow: 'СОБЫТИЯ',
                    title: 'Последние события',
                    subtitle: 'Пропущенные звонки приходят в реальном времени',
                  ),
                  const SizedBox(height: AtcSpace.lg),
                  if (calls.isEmpty)
                    const AtcStateView(
                      icon: Icons.sensors_rounded,
                      title: 'Ожидание событий',
                      subtitle:
                          'Подключитесь к АТС — пропущенные звонки появятся здесь мгновенно',
                    )
                  else
                    ...calls.map((call) => Padding(
                          padding: const EdgeInsets.only(bottom: AtcSpace.sm),
                          child: _LiveEventTile(call: call),
                        )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroTile extends StatelessWidget {
  const _HeroTile({required this.connected, required this.callsCount});

  final bool connected;
  final int callsCount;

  @override
  Widget build(BuildContext context) {
    return AtcTileSet.dark(
      semanticsLabel: 'Режим реального времени',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: connected
                      ? const Color(0xFF34C759)
                      : AtcColors.bodyMuted,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: AtcSpace.xs),
              Text(
                connected ? 'АТС НА СВЯЗИ' : 'ПОДКЛЮЧЕНИЕ…',
                style: AtcTypography.navLink.copyWith(
                  color: Colors.white60,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: AtcSpace.sm),
          Text(
            'В эфире',
            style: AtcTypography.displayLg.copyWith(color: Colors.white),
          ),
          const SizedBox(height: AtcSpace.xs),
          Text(
            callsCount == 0
                ? 'Звонков сейчас нет. Всё спокойно.'
                :             '$callsCount ${Fmt.plural(callsCount, 'событие', 'события', 'событий')} за сессию',
            style: AtcTypography.leadAiry.copyWith(color: Colors.white60),
          ),
          const SizedBox(height: AtcSpace.xl),
          const AtcButton(
            label: 'Совершить звонок',
            variant: AtcButtonVariant.storeHero,
            icon: Icons.call_rounded,
          ),
        ],
      ),
    );
  }
}

class _LiveEventTile extends StatelessWidget {
  const _LiveEventTile({required this.call});

  final LiveCall call;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AtcSpace.md),
      decoration: BoxDecoration(
        color: AtcColors.canvas,
        borderRadius: BorderRadius.circular(AtcRadius.lg),
        border: Border.all(color: AtcColors.hairline),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFFEFE0),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.phone_missed_rounded,
              size: 18,
              color: AtcColors.primaryActive,
            ),
          ),
          const SizedBox(width: AtcSpace.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  Fmt.phone(call.phoneNumber),
                  style: AtcTypography.bodyStrong.copyWith(color: AtcColors.ink),
                ),
                const SizedBox(height: 2),
                Text(
                  'Пропущен · ${Fmt.time(call.startedAt)}',
                  style: AtcTypography.caption.copyWith(color: AtcColors.inkMuted48),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.arrow_forward_ios_rounded,
            size: 14,
            color: AtcColors.inkMuted48,
          ),
        ],
      ),
    );
  }
}
