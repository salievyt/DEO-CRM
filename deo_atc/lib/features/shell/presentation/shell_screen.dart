import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/atc_colors.dart';
import '../../../core/theme/atc_typography.dart';

/// App shell — hosts the four top-level tabs in an IndexedStack and paints
/// the ATC bottom tab bar (surface-black, nav-link type).
class ShellScreen extends StatelessWidget {
  const ShellScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    final currentIndex = navigationShell.currentIndex;

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: _AtcTabBar(
        selectedIndex: currentIndex,
        onSelected: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
      ),
    );
  }
}

class _TabItem {
  const _TabItem({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

const _tabs = [
  _TabItem(label: 'Звонки', icon: Icons.phone_rounded),
  _TabItem(label: 'Статистика', icon: Icons.bar_chart_rounded),
  _TabItem(label: 'Живой', icon: Icons.sensors_rounded),
  _TabItem(label: 'Настройки', icon: Icons.settings_rounded),
];

class _AtcTabBar extends StatelessWidget {
  const _AtcTabBar({required this.selectedIndex, required this.onSelected});

  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AtcColors.surfaceBlack,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 56,
          child: Row(
            children: List.generate(_tabs.length, (index) {
              final selected = index == selectedIndex;
              final tab = _tabs[index];
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onSelected(index),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        tab.icon,
                        size: 20,
                        color: selected ? AtcColors.primary : AtcColors.inkMuted48,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        tab.label,
                        style: AtcTypography.navLink.copyWith(
                          color: selected ? AtcColors.primary : AtcColors.inkMuted48,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ],
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
