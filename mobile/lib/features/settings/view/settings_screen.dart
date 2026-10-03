import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/data/auth_providers.dart';
import '../../workspace/crm_api.dart';
import '../../workspace/crm_form.dart';
import '../../workspace/crm_workspace.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});
  Future<void> _profile(BuildContext context, WidgetRef ref) async {
    final user = ref.read(authStateProvider).valueOrNull;
    if (await editCrmRecord(
      context,
      title: 'Профиль',
      path: '/auth/me/',
      method: 'PATCH',
      initial: user?.toJson() ?? {},
      fields: const {
        'first_name': {'type': 'string'},
        'last_name': {'type': 'string'},
        'phone': {'type': 'string'},
        'avatar': {'type': 'string'},
      },
    )) {
      await ref.read(authStateProvider.notifier).loadUser();
    }
  }

  Future<void> _setupTwoFactor(BuildContext context, WidgetRef ref) async {
    try {
      final data = await ref.read(crmApiProvider).save('/auth/2fa/enable/', {});
      if (!context.mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Подключить приложение-аутентификатор'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (data['qr_code'] is String)
                  Image.memory(
                    base64Decode((data['qr_code'] as String).split(',').last),
                    width: 220,
                  ),
                const SizedBox(height: 12),
                const Text(
                  'Отсканируйте QR-код или скопируйте секрет в приложение-аутентификатор.',
                ),
                SelectableText('${data['secret']}'),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Продолжить'),
            ),
          ],
        ),
      );
      if (!context.mounted) return;
      if (await editCrmRecord(
        context,
        title: 'Подтвердить 2FA',
        path: '/auth/2fa/verify/',
        fields: const {
          'code': {'type': 'string', 'required': true},
        },
      )) {
        await ref.read(authStateProvider.notifier).loadUser();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(crmError(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).valueOrNull;
    return Scaffold(
      appBar: AppBar(title: const Text('Настройки')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.person_outline),
              title: Text(user?.fullName ?? 'Профиль'),
              subtitle: Text(user?.email ?? ''),
              trailing: const Icon(Icons.edit_outlined),
              onTap: () => _profile(context, ref),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.password),
            title: const Text('Сменить пароль'),
            onTap: () => editCrmRecord(
              context,
              title: 'Сменить пароль',
              path: '/auth/change-password/',
              fields: const {
                'old_password': {'type': 'string', 'required': true},
                'new_password': {'type': 'string', 'required': true},
              },
            ),
          ),
          ListTile(
            leading: const Icon(Icons.security),
            title: Text(
              user?.is2faEnabled == true
                  ? 'Двухфакторная защита включена'
                  : 'Включить двухфакторную защиту',
            ),
            onTap: user?.is2faEnabled == true
                ? null
                : () => _setupTwoFactor(context, ref),
          ),
          if (user?.is2faEnabled == true) ...[
            ListTile(
              title: const Text('Новые резервные коды'),
              onTap: () => editCrmRecord(
                context,
                title: 'Новые резервные коды',
                path: '/auth/2fa/recovery-codes/',
                fields: const {
                  'password': {'type': 'string', 'required': true},
                  'code': {'type': 'string', 'required': true},
                },
              ),
            ),
            ListTile(
              title: const Text('Отключить двухфакторную защиту'),
              onTap: () async {
                if (await editCrmRecord(
                  context,
                  title: 'Отключить 2FA',
                  path: '/auth/2fa/disable/',
                  fields: const {
                    'password': {'type': 'string', 'required': true},
                    'code': {'type': 'string', 'required': true},
                  },
                )) {
                  await ref.read(authStateProvider.notifier).loadUser();
                }
              },
            ),
          ],
          ListTile(
            leading: const Icon(Icons.notifications_outlined),
            title: const Text('Настройки уведомлений'),
            onTap: () async {
              try {
                final initial = Map<String, dynamic>.from(
                  await ref
                          .read(crmApiProvider)
                          .get('/notifications/preferences/')
                      as Map,
                );
                if (!context.mounted) return;
                await editCrmRecord(
                  context,
                  title: 'Уведомления',
                  path: '/notifications/preferences/',
                  method: 'PATCH',
                  initial: initial,
                  fields: {
                    for (final name in [
                      'task_assigned',
                      'comment_added',
                      'project_updated',
                      'deadline_reminder',
                      'message_received',
                      'quiet_hours_enabled',
                      'digest_enabled',
                    ])
                      name: {'type': 'boolean'},
                  },
                );
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text(crmError(e))));
                }
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.apps),
            title: const Text('Все разделы CRM'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CrmWorkspaceMenu()),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('О приложении'),
            subtitle: const Text('DEO STUDIO CRM'),
            onTap: () => showAboutDialog(
              context: context,
              applicationName: 'DEO STUDIO CRM',
              applicationVersion: '1.0.0',
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            icon: const Icon(Icons.logout),
            label: const Text('Выйти'),
            onPressed: () async {
              await ref.read(authStateProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}
