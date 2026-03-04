import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, subtleShadow, typography } from '../../theme';

interface TodayDigestCardProps {
  theme?: string | null;
  advice?: string | null;
  tags?: string[] | null;
  miniActions?: string[] | null;
  isLoading?: boolean;
  onPressCard: () => void;
  onPressTransits: () => void;
  onPressPrimary: () => void;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

function clampText(value: string | null | undefined, maxLen: number): string {
  if (!value) {
    return '';
  }

  if (value.length <= maxLen) {
    return value;
  }

  return `${value.slice(0, maxLen - 1).trimEnd()}…`;
}

export function TodayDigestCard({
  theme,
  advice,
  tags,
  miniActions,
  isLoading = false,
  onPressCard,
  onPressTransits,
  onPressPrimary,
}: TodayDigestCardProps) {
  const limitedTheme = clampText(theme, 80);
  const limitedAdvice = clampText(advice, 80);
  const safeTags = (tags ?? []).filter((tag) => tag.trim().length > 0);
  const visibleTags = safeTags.slice(0, 3);
  const hiddenTagCount = Math.max(0, safeTags.length - visibleTags.length);
  const compactActions = (miniActions ?? []).slice(0, 2).map((item) => clampText(item, 42));
  const hasContent = Boolean(limitedTheme || limitedAdvice);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPressCard}
        accessibilityRole="button"
        accessibilityLabel="Bugünün burç yorumunu aç"
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [styles.mainPressable, pressed && styles.pressed]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Bugün</Text>
          <View style={styles.todayPill}>
            <Text style={styles.todayText}>Bugün</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <View style={styles.skeletonLineLong} />
            <View style={styles.skeletonLineLong} />
            <View style={styles.skeletonLineShort} />
          </View>
        ) : hasContent ? (
          <View>
            <Text numberOfLines={1} style={styles.line}>
              <Text style={styles.lineLabel}>Tema:</Text> {limitedTheme}
            </Text>
            <Text numberOfLines={1} style={styles.line}>
              <Text style={styles.lineLabel}>Öneri:</Text> {limitedAdvice}
            </Text>

            <View style={styles.miniActionRow}>
              <Text style={styles.miniActionLabel}>Mini aksiyonlar:</Text>
              <Text numberOfLines={1} style={styles.miniActionText}>
                {compactActions.join(' • ')}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Bugün için veriler hazırlanıyor.</Text>
        )}
      </Pressable>

      {!!safeTags.length && !isLoading ? (
        <Pressable
          onPress={onPressTransits}
          accessibilityRole="button"
          accessibilityLabel="Günün transitlerini aç"
          hitSlop={HIT_SLOP}
          style={({ pressed }) => [styles.tagsPressable, pressed && styles.pressed]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagRow}
            style={styles.tagsWrap}
          >
            {visibleTags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text numberOfLines={1} style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {hiddenTagCount > 0 ? (
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{`+${hiddenTagCount}`}</Text>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onPressPrimary}
        accessibilityRole="button"
        accessibilityLabel="Günün detaylarını aç"
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
      >
        <Text style={styles.primaryBtnText}>Günün detayları</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...subtleShadow,
  },
  mainPressable: {
    borderRadius: radius.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
  },
  todayPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F2EBFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  todayText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  line: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  lineLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tagsWrap: {
    marginTop: spacing.xs,
  },
  tagsPressable: {
    borderRadius: radius.md,
  },
  tagRow: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tagPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#EFE6FF',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  miniActionRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: 4,
  },
  miniActionLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  miniActionText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  loadingWrap: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  skeletonLineLong: {
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(123,77,255,0.16)',
    width: '94%',
  },
  skeletonLineShort: {
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(123,77,255,0.16)',
    width: '62%',
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
});
