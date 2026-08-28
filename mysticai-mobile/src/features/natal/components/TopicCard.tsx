import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText, Skeleton } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import * as Haptics from '../../../utils/haptics';
import type { NatalTopic } from '../../../services/natalPortrait.service';

interface Props {
  topic: NatalTopic;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Behind the natal-detail entitlement. Still shows its preview — the lock is on the depth. */
  locked?: boolean;
  onPress: (topic: NatalTopic) => void;
}

/**
 * One thematic card, collapsed.
 *
 * Card anatomy is fixed across every topic: icon, title, the one-line explanation, and a short
 * personalised preview. The preview is the first sentence of the real interpretation rather than a
 * generic teaser, so the card already says something true about the reader before it is opened —
 * which is what makes a grid of these feel like a profile instead of a menu.
 */
export default function TopicCard({ topic, icon, locked = false, onPress }: Props) {
  const { colors } = useTheme();
  const s = createStyles(colors);

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress(topic);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}. ${topic.subtitle}`}
      style={({ pressed }) => [s.card, pressed ? s.cardPressed : undefined]}
    >
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={18} color={colors.birthChart.primaryAccent} />
      </View>

      <View style={s.body}>
        <AppText variant="BodyBold" style={s.title} numberOfLines={1}>
          {topic.title}
        </AppText>
        <AppText variant="CaptionSmall" style={s.subtitle} numberOfLines={1}>
          {topic.subtitle}
        </AppText>
        <AppText variant="Small" style={s.preview} numberOfLines={2}>
          {firstSentence(topic.summary)}
        </AppText>
      </View>

      <Ionicons
        name={locked ? 'lock-closed' : 'chevron-forward'}
        size={16}
        color={locked ? colors.birthChart.goldAccent : colors.birthChart.textMuted}
      />
    </Pressable>
  );
}

/**
 * Trims the summary to its opening sentence for the collapsed preview.
 * Falls back to the raw string when no sentence boundary is found, so a preview is never empty.
 */
function firstSentence(text: string): string {
  if (!text) return '';
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text;
}

export function TopicCardSkeleton() {
  const { colors } = useTheme();
  const s = createStyles(colors);
  return (
    <View style={s.card}>
      <Skeleton width={38} height={38} borderRadius={radius.icon} />
      <View style={s.body}>
        <Skeleton height={14} width="52%" />
        <Skeleton height={11} width="72%" />
        <Skeleton height={11} width="90%" />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.birthChart.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.card,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    cardPressed: {
      opacity: 0.85,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.icon,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.birthChart.iconBadgeBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.iconBadgeBorder,
    },
    body: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: colors.birthChart.textPrimary,
    },
    subtitle: {
      color: colors.birthChart.primaryAccent,
    },
    preview: {
      color: colors.birthChart.textMuted,
      lineHeight: 18,
    },
  });
