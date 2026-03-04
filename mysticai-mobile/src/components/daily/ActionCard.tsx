import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import type { DailyActionsDTO } from '../../types/daily.types';

interface ActionCardProps {
  action: DailyActionsDTO['actions'][number];
  onToggle: (actionId: string, nextValue: boolean) => void;
  loading?: boolean;
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  walk: 'walk',
  chatbubble: 'chatbubble-ellipses',
  'chatbubble-ellipses': 'chatbubble-ellipses',
  sparkles: 'sparkles',
  calendar: 'calendar-outline',
  'checkmark-done': 'checkmark-done',
};

export function ActionCard({ action, onToggle, loading = false }: ActionCardProps) {
  const { colors, isDark } = useTheme();
  const iconName = ICON_MAP[action.icon] ?? 'sparkles';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          borderColor: action.isDone
            ? (isDark ? 'rgba(110,231,183,0.45)' : '#A7F3D0')
            : (isDark ? 'rgba(255,255,255,0.12)' : '#EAE3FA'),
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F2EBFF' }]}>
          <Ionicons name={iconName} size={15} color={colors.primary} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{action.title}</Text>
          <Text style={[styles.detail, { color: colors.subtext }]}>{action.detail}</Text>

          <View style={styles.metaRow}>
            {action.tag ? (
              <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#F5F0FF' }]}>
                <Text style={[styles.metaText, { color: colors.primary }]}>{action.tag}</Text>
              </View>
            ) : null}
            {typeof action.etaMin === 'number' ? (
              <Text style={[styles.eta, { color: colors.subtext }]}>{action.etaMin} dk</Text>
            ) : null}
          </View>
        </View>
      </View>

      <Pressable
        style={[
          styles.toggleBtn,
          {
            backgroundColor: action.isDone
              ? (isDark ? 'rgba(16,185,129,0.24)' : '#D1FAE5')
              : colors.primary,
            opacity: loading ? 0.7 : 1,
          },
        ]}
        onPress={() => onToggle(action.id, !action.isDone)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={action.isDone ? '#047857' : '#FFF'} />
        ) : (
          <>
            <Ionicons
              name={action.isDone ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={14}
              color={action.isDone ? '#047857' : '#FFF'}
            />
            <Text style={[styles.toggleText, { color: action.isDone ? '#047857' : '#FFF' }]}>
              {action.isDone ? 'Yapıldı' : 'Yaptım'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  content: {
    flex: 1,
    gap: SPACING.xsSm,
  },
  title: {
    ...TYPOGRAPHY.BodyBold,
    fontSize: 19,
    lineHeight: 25,
  },
  detail: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  metaBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  metaText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 11,
  },
  eta: {
    ...TYPOGRAPHY.Caption,
    fontSize: 12,
  },
  toggleBtn: {
    alignSelf: 'flex-end',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.mdLg,
    paddingVertical: SPACING.sm,
    minHeight: 36,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  toggleText: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 14,
  },
});

export default ActionCard;
