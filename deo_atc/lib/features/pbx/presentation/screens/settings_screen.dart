import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/atc_colors.dart';
import '../../../../core/theme/atc_spacing.dart';
import '../../../../core/theme/atc_typography.dart';
import '../../../../widgets/atc_pill.dart';
import '../../../../widgets/atc_section_header.dart';
import '../../../../widgets/atc_state_view.dart';
import '../../../../widgets/atc_tile.dart';
import '../../domain/entities/pbx_connection.dart';
import '../providers/pbx_providers.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connections = ref.watch(pbxConnectionsProvider);
    final sip = ref.watch(sipAccountsProvider);

    return Scaffold(
      backgroundColor: AtcColors.canvasParchment,
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            Padding(
              padding: const EdgeInsets.all(AtcSpace.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const AtcSectionHeader(
                    eyebrow: 'СИСТЕМА',
                    title: 'Настройки',
                    subtitle: 'Подключения АТС и SIP-аккаунты',
                  ),
                  const SizedBox(height: AtcSpace.lg),
                  Text(
                    'Подключение АТС',
                    style: AtcTypography.bodyStrong.copyWith(color: AtcColors.ink),
                  ),
                  const SizedBox(height: AtcSpace.sm),
                  connections.when(
                    loading: () => const AtcStateView.loading(),
                    error: (error, _) => AtcStateView(
                      icon: Icons.link_off_rounded,
                      title: 'Не удалось загрузить АТС',
                      subtitle: '$error',
                      action: TextButton(
                        onPressed: () => ref.invalidate(pbxConnectionsProvider),
                        child: const Text('Повторить'),
                      ),
                    ),
                    data: (list) => list.isEmpty
                        ? const AtcStateView(
                            icon: Icons.phone_android_rounded,
                            title: 'АТС не подключена',
                            subtitle:
                                'Подключите АТС в веб-версии CRM — здесь появится статус соединения',
                          )
                        : Column(
                            children: list.map((c) => _PbxCard(connection: c)).toList(),
                          ),
                  ),
                  const SizedBox(height: AtcSpace.lg),
                  Text(
                    'SIP-аккаунты',
                    style: AtcTypography.bodyStrong.copyWith(color: AtcColors.ink),
                  ),
                  const SizedBox(height: AtcSpace.sm),
                  sip.when(
                    loading: () => const AtcStateView.loading(),
                    error: (error, _) => AtcStateView(
                      icon: Icons.perm_identity_rounded,
                      title: 'Не удалось загрузить SIP',
                      subtitle: '$error',
                      action: TextButton(
                        onPressed: () => ref.invalidate(sipAccountsProvider),
                        child: const Text('Повторить'),
                      ),
                    ),
                    data: (list) => list.isEmpty
                        ? const AtcStateView(
                            icon: Icons.dialpad_rounded,
                            title: 'SIP-аккаунтов нет',
                            subtitle: 'Добавьте внутренние номера в веб-версии CRM',
                          )
                        : AtcTileSet.parchment(
                            padding: EdgeInsets.zero,
                            child: Column(
                              children: [
                                for (var i = 0; i < list.length; i++) ...[
                                  _SipRow(account: list[i]),
                                  if (i != list.length - 1)
                                    const Divider(color: AtcColors.hairline),
                                ],
                              ],
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PbxCard extends StatelessWidget {
  const _PbxCard({required this.connection});

  final PbxConnection connection;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AtcSpace.sm),
      padding: const EdgeInsets.all(AtcSpace.md),
      decoration: BoxDecoration(
        color: AtcColors.canvas,
        borderRadius: BorderRadius.circular(AtcRadius.lg),
        border: Border.all(color: AtcColors.hairline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  connection.name,
                  style: AtcTypography.bodyStrong.copyWith(color: AtcColors.ink),
                ),
              ),
              if (connection.isDefault) ...[
                const AtcPill(label: 'По умолчанию', accent: true, dot: true),
                const SizedBox(width: AtcSpace.xs),
              ],
              _statusPill(connection.status),
            ],
          ),
          const SizedBox(height: AtcSpace.xs),
          Text(
            _providerLabel(connection.provider),
            style: AtcTypography.caption.copyWith(color: AtcColors.inkMuted48),
          ),
          if (connection.apiUrl.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              connection.apiUrl,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AtcTypography.finePrint.copyWith(color: AtcColors.inkMuted48),
            ),
          ],
        ],
      ),
    );
  }

  Widget _statusPill(PbxStatus status) {
    switch (status) {
      case PbxStatus.connected:
        return const AtcPill(label: 'Подключена', accent: true, dot: true);
      case PbxStatus.error:
        return const AtcPill(label: 'Ошибка', danger: true, dot: true);
      case PbxStatus.disabled:
      case PbxStatus.unknown:
        return const AtcPill(label: 'Отключена', outline: true);
    }
  }

  String _providerLabel(PbxProvider provider) {
    switch (provider) {
      case PbxProvider.asterisk:
        return 'Asterisk / FreePBX';
      case PbxProvider.mikopbx:
        return 'MikoPBX';
      case PbxProvider.yeastar:
        return 'Yeastar';
      case PbxProvider.grandstream:
        return 'Grandstream';
      case PbxProvider.other:
      case PbxProvider.unknown:
        return 'АТС';
    }
  }
}

class _SipRow extends StatelessWidget {
  const _SipRow({required this.account});

  final SipAccount account;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AtcSpace.md, vertical: AtcSpace.sm),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: account.isActive
                  ? const Color(0xFFFFEFE0)
                  : AtcColors.surfacePearl,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.dialpad_rounded,
              size: 18,
              color: account.isActive
                  ? AtcColors.primaryActive
                  : AtcColors.inkMuted48,
            ),
          ),
          const SizedBox(width: AtcSpace.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  account.extension.isEmpty ? 'Без номера' : account.extension,
                  style: AtcTypography.bodyStrong.copyWith(color: AtcColors.ink),
                ),
                if (account.name.isNotEmpty || account.user.isNotEmpty)
                  Text(
                    [account.name, account.user]
                        .where((value) => value.isNotEmpty)
                        .join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AtcTypography.caption.copyWith(
                      color: AtcColors.inkMuted48,
                    ),
                  ),
              ],
            ),
          ),
          if (account.isActive)
            const AtcPill(label: 'Активен', accent: true, dot: true)
          else
            const AtcPill(label: 'Выключен', outline: true),
        ],
      ),
    );
  }
}
