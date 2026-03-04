import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type QuickAction = {
  id: string;
  title: string;
  subtitle: string;
  iconName: IconName;
  iconColor: string;
  iconBg: string;
  route?: string;
  disabled?: boolean;
  statusLabel?: string;
};

export type WeeklyLevel = 'Yüksek' | 'Orta' | 'Risk';

export type WeeklyItem = {
  title: string;
  level: WeeklyLevel;
  desc: string;
  iconName: IconName;
};
