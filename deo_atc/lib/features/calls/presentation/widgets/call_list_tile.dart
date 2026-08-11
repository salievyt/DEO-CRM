import 'package:flutter/material.dart';

import '../../../../core/theme/atc_colors.dart';
import '../../../../core/theme/atc_spacing.dart';
import '../../../../core/theme/atc_typography.dart';
import '../../../../core/utils/format.dart';
import '../../../../widgets/atc_pill.dart';
import '../../domain/entities/call_enums.dart';
import '../../domain/entities/call_record.dart';

/// Compact row for one call record (store-utility-card anatomy).
class CallListTile extends StatelessWidget {
  const CallListTile({
    super.key,
    required this.call,
    this.onTap,
  });

  final CallRecord call;
  final VoidCallback? onTap;

  IconData get _icon => switch (call.direction) {
        CallDirection.incoming => Icons.call_received_rounded,
        CallDirection.outgoing => Icons.call_made_rounded,
        CallDirection.unknown => Icons.phone_rounded,
      };

  String get _meta {
    final parts = <String>[];
    if (call.direction.isOutgoing && call.durationSeconds > 0) {
      parts.add('${Fmt.duration(call.durationSeconds)} · исходящий');
    } else if (call.direction.isIncoming) {
      parts.add('входящий');
    }
    if (call.startedAt != null) {
      parts.add(Fmt.time(call.startedAt!));
    }
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final accent = call.status.isMissed ? AtcColors.primaryActive : AtcColors.primary;
    final tile = Container(
      padding: const EdgeInsets.symmetric(horizontal: AtcSpace.md, vertical: AtcSpace.sm),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: call.status.isMissed
                  ? const Color(0xFFFFEFE0)
                  : AtcColors.surfacePearl,
              shape: BoxShape.circle,
            ),
            child: Icon(_icon, size: 20, color: accent),
          ),
          const SizedBox(width: AtcSpace.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        call.displayName.isNotEmpty ? call.displayName : call.phone,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AtcTypography.bodyStrong.copyWith(color: AtcColors.ink),
                      ),
                    ),
                    if (call.displayName.isNotEmpty && call.phone != 'Без номера') ...[
                      const SizedBox(width: AtcSpace.xs),
                      Text(
                        call.phone,
                        style: AtcTypography.finePrint.copyWith(
                          color: AtcColors.inkMuted48,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _meta,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AtcTypography.caption.copyWith(color: AtcColors.inkMuted48),
                ),
              ],
            ),
          ),
          const SizedBox(width: AtcSpace.sm),
          _StatusPill(status: call.status),
        ],
      ),
    );

    if (onTap == null) {
      return tile;
    }
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AtcRadius.lg),
      child: tile,
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final CallStatus status;

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case CallStatus.answered:
        return const AtcPill(label: 'Отвечен', accent: true, dot: true);
      case CallStatus.missed:
        return const AtcPill(label: 'Пропущен', danger: true, dot: true);
      case CallStatus.busy:
        return const AtcPill(label: 'Занято', danger: true);
      case CallStatus.failed:
        return const AtcPill(label: 'Не удался', danger: true);
      case CallStatus.canceled:
        return const AtcPill(label: 'Отменён', outline: true);
      case CallStatus.voicemail:
        return const AtcPill(label: 'Сообщение');
      case CallStatus.unknown:
        return const SizedBox.shrink();
    }
  }
}
