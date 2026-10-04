import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'crm_api.dart';

/// A compact, readable summary; editing and detail data remain server-driven.
class CrmRecordCard extends StatelessWidget {
  const CrmRecordCard({
    super.key,
    required this.row,
    this.icon = Icons.folder_outlined,
    this.onTap,
  });
  final Map<String, dynamic> row;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final status = row['status_name'] ?? row['stage_name'];
    final subtitle =
        row['project_name'] ??
        row['client_name'] ??
        row['assignee_name'] ??
        row['email'] ??
        row['phone'];
    final deadline = DateTime.tryParse('${row['deadline'] ?? ''}')?.toLocal();
    final progress = num.tryParse('${row['progress'] ?? ''}');
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: colors.primaryContainer.withValues(alpha: .55),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Icon(icon, size: 21, color: colors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          recordTitle(row),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium,
                        ),
                        if (subtitle != null && '$subtitle'.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            '$subtitle',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (onTap != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Icon(
                        Icons.chevron_right,
                        size: 18,
                        color: colors.outline,
                      ),
                    ),
                ],
              ),
              if (status != null ||
                  deadline != null ||
                  row['priority_name'] != null) ...[
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (status != null)
                      _Tag(text: '$status', color: colors.primary),
                    if (row['priority_name'] != null)
                      _Tag(
                        text: '${row['priority_name']}',
                        color: colors.onSurfaceVariant,
                      ),
                    if (deadline != null)
                      _Tag(
                        text: DateFormat('dd.MM.yyyy').format(deadline),
                        color: colors.onSurfaceVariant,
                        icon: Icons.calendar_today_outlined,
                      ),
                  ],
                ),
              ],
              if (progress != null) ...[
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: (progress / 100).clamp(0, 1),
                          minHeight: 5,
                          backgroundColor: colors.surfaceContainerHighest,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${progress.clamp(0, 100).round()}%',
                      style: theme.textTheme.labelSmall,
                    ),
                  ],
                ),
              ],
              if (row['amount'] != null ||
                  row['total'] != null ||
                  row['budget'] != null) ...[
                const SizedBox(height: 12),
                Text(
                  '${row['amount'] ?? row['total'] ?? row['budget']}${row['currency'] == null ? '' : ' ${row['currency']}'}',
                  style: theme.textTheme.titleSmall,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.text, required this.color, this.icon});
  final String text;
  final Color color;
  final IconData? icon;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: color.withValues(alpha: .09),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text.rich(
      TextSpan(
        children: [
          if (icon != null)
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Padding(
                padding: const EdgeInsets.only(right: 5),
                child: Icon(icon, size: 12, color: color),
              ),
            ),
          TextSpan(text: text),
        ],
      ),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color),
    ),
  );
}
