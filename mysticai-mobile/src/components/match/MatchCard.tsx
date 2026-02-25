import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { TraitAxis } from '../../services/match.api';
import TraitBar from './TraitBar';

export interface MatchCardProps {
  user1Name: string;
  user2Name: string;
  user1Sign: string;
  user2Sign: string;
  compatibilityScore: number;
  aiSummary: string;
  cardSummary?: string | null;
  traitAxes?: TraitAxis[];
  aspectsCount: number;
}

const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});

export default function MatchCard({
  user1Name,
  user2Name,
  user1Sign,
  user2Sign,
  compatibilityScore,
  aiSummary,
  cardSummary,
  traitAxes,
  aspectsCount,
}: MatchCardProps) {
  const score = Math.max(0, Math.min(100, Math.round(compatibilityScore)));
  const summary = (cardSummary || aiSummary || 'Yıldızlar bu bağ için dikkat çekici bir enerji alanı gösteriyor.')
    .trim()
    .replace(/\s+/g, ' ');
  const cardAxisItems = (traitAxes ?? []).slice(0, 8);

  return (
    <View style={styles.frame} collapsable={false}>
      <LinearGradient
        colors={['#100A2D', '#1E1B4B', '#0B1739']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <Text style={styles.watermark}>MYSTIC AI</Text>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>COSMIC MATCH</Text>
          <Text style={styles.title}>Uyum Kartı</Text>
        </View>

        <View style={styles.namesRow}>
          <View style={styles.personCol}>
            <Text style={styles.name} numberOfLines={1}>{user1Name}</Text>
            <Text style={styles.sign} numberOfLines={1}>{user1Sign}</Text>
          </View>
          <View style={styles.connector}>
            <Text style={styles.connectorText}>✦</Text>
          </View>
          <View style={[styles.personCol, styles.personColRight]}>
            <Text style={styles.name} numberOfLines={1}>{user2Name}</Text>
            <Text style={styles.sign} numberOfLines={1}>{user2Sign}</Text>
          </View>
        </View>

        <View style={styles.scorePanel}>
          <View style={styles.scoreOrb}>
            <Text style={styles.scoreValue}>{score}%</Text>
            <Text style={styles.scoreLabel}>Uyum</Text>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>Açı</Text>
              <Text style={styles.metaPillValue}>{aspectsCount}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>Kart</Text>
              <Text style={styles.metaPillValue}>Yıldız</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Öne Çıkan Eksenler</Text>
          <Text style={styles.summaryText} numberOfLines={3}>
            {summary}
          </Text>
          {cardAxisItems.length > 0 ? (
            <View style={styles.traitsWrap}>
              {cardAxisItems.map((axis) => (
                <TraitBar key={axis.id} axis={axis} compact variant="darkCard" />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Mystic AI • Astrolojik Uyum Raporu</Text>
          <Text style={styles.footerSub}>mysticai.app</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 360,
    height: 450, // 4:5
    backgroundColor: '#090C1A',
    borderRadius: 28,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  glowTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.26)',
    top: -48,
    right: -40,
  },
  glowBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.18)',
    bottom: -32,
    left: -28,
  },
  watermark: {
    color: 'rgba(255,255,255,0.14)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.8,
    textAlign: 'right',
    marginBottom: 8,
  },
  header: {
    marginBottom: 14,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: SERIF,
  },
  namesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  personCol: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  personColRight: {
    alignItems: 'flex-end',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sign: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  connector: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  connectorText: {
    color: '#E9D5FF',
    fontSize: 15,
  },
  scorePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  scoreOrb: {
    flex: 1,
    minHeight: 106,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.34)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 38,
    fontFamily: SERIF,
  },
  scoreLabel: {
    color: '#C4B5FD',
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaCol: {
    width: 102,
    gap: 10,
  },
  metaPill: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  metaPillLabel: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  metaPillValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryTitle: {
    color: '#DDD6FE',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  traitsWrap: {
    marginTop: 10,
    gap: 9,
  },
  footer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  footerSub: {
    color: '#C4B5FD',
    fontSize: 10.5,
    fontWeight: '700',
  },
});
