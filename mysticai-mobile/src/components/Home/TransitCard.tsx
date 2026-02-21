import { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import type { TransitDigest } from './homeUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PAD = SPACING.lgXl;
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.75);
const CARD_HEIGHT = 148;
const CARD_GAP = 10;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

interface TransitCardProps {
  transitDigest: TransitDigest;
  dailyVibeText: string;
}

interface GlassCard {
  id: string;
  icon: string;
  label: string;
  headline: string;
  accentHex: string;
}

function buildCards(
  transitDigest: TransitDigest,
  dailyVibeText: string,
  colors: ReturnType<typeof useTheme>['colors'],
): GlassCard[] {
  const cards: GlassCard[] = [];

  // Card 1: Overall energy
  const energyIcon =
    transitDigest.energyType === 'lucky' ? '🌟' :
    transitDigest.energyType === 'caution' ? '🔴' : '🔮';
  const energyHex =
    transitDigest.energyType === 'lucky' ? colors.success :
    transitDigest.energyType === 'caution' ? colors.error : colors.warning;
  cards.push({
    id: 'energy',
    icon: energyIcon,
    label: 'GENEL ENERJİ',
    headline: transitDigest.energyLabel,
    accentHex: energyHex,
  });

  // Card 2: Transit headline / daily vibe
  if (transitDigest.title) {
    cards.push({
      id: 'headline',
      icon: '🪐',
      label: 'BUGÜNÜN TRANSİTİ',
      headline: transitDigest.title,
      accentHex: colors.primary,
    });
  }

  // Card 3+: Action items
  transitDigest.actionItems.forEach((item, i) => {
    cards.push({
      id: `action-${i}`,
      icon: '⚡',
      label: 'ODAKLAN',
      headline: item,
      accentHex: colors.success,
    });
  });

  // Caution cards
  transitDigest.cautionItems.forEach((item, i) => {
    cards.push({
      id: `caution-${i}`,
      icon: '🚫',
      label: 'DİKKAT',
      headline: item,
      accentHex: colors.error,
    });
  });

  return cards;
}

export function TransitCard({ transitDigest, dailyVibeText }: TransitCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList<GlassCard>>(null);
  const currentIndexRef = useRef(0);

  const cards = useMemo(
    () => buildCards(transitDigest, dailyVibeText, colors),
    [transitDigest, dailyVibeText, colors],
  );

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (cards.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % cards.length;
      currentIndexRef.current = nextIndex;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [cards.length]);

  if (cards.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.wrapper}>
      {/* Section label */}
      <Text
        style={[
          styles.sectionLabel,
          { color: isDark ? 'rgba(196,181,253,0.6)' : 'rgba(99,102,241,0.55)' },
        ]}
      >
        {t('home.transitTitle').toUpperCase()}
      </Text>

      <FlatList
        ref={flatListRef}
        data={cards}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        style={styles.flatList}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={() => {
          // Reset auto-scroll index when user manually drags
          currentIndexRef.current = 0;
        }}
        renderItem={({ item }) => (
          <GlassTransitCard card={item} isDark={isDark} colors={colors} />
        )}
      />
    </Animated.View>
  );
}

interface GlassTransitCardProps {
  card: GlassCard;
  isDark: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function GlassTransitCard({ card, isDark, colors }: GlassTransitCardProps) {
  // Glass background: dark = deep indigo/violet tint, light = white tint
  const bgColor = isDark
    ? 'rgba(26, 20, 60, 0.65)'
    : 'rgba(255, 255, 255, 0.72)';
  const borderColor = isDark
    ? 'rgba(255, 255, 255, 0.09)'
    : 'rgba(0, 0, 0, 0.07)';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bgColor,
          borderColor,
          shadowColor: card.accentHex,
        },
      ]}
    >
      {/* Top row: glow icon pill + label */}
      <View style={styles.cardTopRow}>
        <View style={[styles.iconPill, { backgroundColor: `${card.accentHex}22`, borderColor: `${card.accentHex}44` }]}>
          <Text style={styles.iconEmoji}>{card.icon}</Text>
        </View>
        <Text style={[styles.cardLabel, { color: card.accentHex }]}>
          {card.label}
        </Text>
      </View>

      {/* Headline */}
      <Text
        style={[styles.cardHeadline, { color: isDark ? '#e8e0ff' : '#1e1b4b' }]}
        numberOfLines={3}
      >
        {card.headline}
      </Text>

      {/* Bottom glow line */}
      <View style={[styles.cardGlowLine, { backgroundColor: `${card.accentHex}55` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: SPACING.xl,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: SPACING.smMd,
    marginLeft: H_PAD,
  },
  flatList: {
    height: CARD_HEIGHT + 12, // explicit height prevents clipping by animated parent
  },
  listContent: {
    gap: CARD_GAP,
    paddingLeft: H_PAD,
    paddingRight: H_PAD,
    alignItems: 'flex-start',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: SPACING.mdLg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    justifyContent: 'space-between',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xsSm,
    marginBottom: SPACING.smMd,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardHeadline: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    flex: 1,
  },
  cardGlowLine: {
    height: 2,
    borderRadius: 1,
    marginTop: SPACING.xs,
  },
});
