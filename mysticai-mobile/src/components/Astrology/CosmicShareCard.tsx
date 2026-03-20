import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
const mysticLogo = require('../../../assets/brand/logo/astro-guru-icon-transparent-128.png');

type CosmicShareCardProps = {
  personAName: string;
  personBName: string;
  personASunLabel: string;
  personBSunLabel: string;
  personASunSymbol: string;
  personBSunSymbol: string;
  relationLabel: string;
  score: number;
  verdict: string;
  downloadUrl?: string;
};

function ScoreRing({ score }: { score: number }) {
  const size = 260;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id="shareRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#C4B5FD" />
            <Stop offset="55%" stopColor="#A78BFA" />
            <Stop offset="100%" stopColor="#7C3AED" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#shareRing)"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.ringCenterGlow} />
      <View style={styles.ringCenter}>
        <Text style={styles.ringScore}>{clamped}%</Text>
        <Text style={styles.ringLabel}>COSMIC MATCH</Text>
      </View>
    </View>
  );
}

export default function CosmicShareCard(props: CosmicShareCardProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        top: `${(i * 29 + (i % 3) * 11) % 100}%`,
        size: i % 5 === 0 ? 4 : i % 2 === 0 ? 2.5 : 1.6,
        opacity: i % 4 === 0 ? 0.75 : 0.35,
      })),
    []
  );

  const qrValue = props.downloadUrl ?? 'https://mysticai.app/dl';

  return (
    <View style={styles.frame} collapsable={false}>
      <LinearGradient
        colors={['#24114F', '#111D5D', '#07152F']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.auroraA} />
        <View style={styles.auroraB} />
        <View style={styles.noiseGrid} />

        {stars.map((star) => (
          <View
            key={star.id}
            style={[
              styles.star,
              {
                left: star.left as any,
                top: star.top as any,
                width: star.size,
                height: star.size,
                borderRadius: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        ))}

        <View style={styles.brandTop}>
          <Text style={styles.brandWord}>ASTRO GURU</Text>
          <Text style={styles.brandSub}>Cosmic Compatibility Report</Text>
        </View>

        <View style={styles.headerBlock}>
          <Text style={styles.namesText} numberOfLines={2}>
            {props.personAName} & {props.personBName}
          </Text>
          <Text style={styles.relationPill}>{props.relationLabel}</Text>
        </View>

        <View style={styles.zodiacRow}>
          <View style={styles.signChip}>
            <View style={styles.signHalo} />
            <Text style={styles.signGlyph}>{props.personASunSymbol}</Text>
            <Text style={styles.signName} numberOfLines={1}>
              {props.personASunLabel}
            </Text>
          </View>
          <View style={styles.auraBridge}>
            <View style={styles.bridgeGlow} />
            <Text style={styles.vsText}>✦</Text>
          </View>
          <View style={styles.signChip}>
            <View style={styles.signHalo} />
            <Text style={styles.signGlyph}>{props.personBSunSymbol}</Text>
            <Text style={styles.signName} numberOfLines={1}>
              {props.personBSunLabel}
            </Text>
          </View>
        </View>

        <View style={styles.scoreSection}>
          <ScoreRing score={props.score} />
        </View>

        <View style={styles.verdictCard}>
          <Text style={styles.verdictEyebrow}>AI Verdict</Text>
          <Text style={styles.verdictText}>{props.verdict}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Astro Guru</Text>
          <View style={styles.qrWrap}>
            <View style={styles.qrShell}>
              <QRCode
                value={qrValue}
                size={74}
                color="#070E28"
                backgroundColor="#FFFFFF"
                quietZone={8}
                logo={mysticLogo}
                logoSize={16}
                logoBorderRadius={999}
                logoBackgroundColor="transparent"
              />
            </View>
          </View>
          <Text style={styles.storeText}>App Store / Play Store: Astro Guru</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const serifFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});

const styles = StyleSheet.create({
  frame: {
    width: 360,
    height: 640,
    backgroundColor: '#070E28',
  },
  card: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  auroraA: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.28)',
    top: -40,
    right: -30,
  },
  auroraB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(96,165,250,0.22)',
    bottom: 120,
    left: -70,
  },
  noiseGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    borderWidth: 0.6,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.75,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  brandTop: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 18,
  },
  brandWord: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 3.2,
  },
  brandSub: {
    color: 'rgba(203,213,225,0.8)',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  headerBlock: {
    alignItems: 'center',
    gap: 10,
  },
  namesText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    fontFamily: serifFamily,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
  },
  relationPill: {
    color: '#DDD6FE',
    borderWidth: 1,
    borderColor: 'rgba(221,214,254,0.3)',
    backgroundColor: 'rgba(76,29,149,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  zodiacRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  signChip: {
    flex: 1,
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  signHalo: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 999,
    backgroundColor: 'rgba(196,181,253,0.18)',
  },
  signGlyph: {
    color: '#F5F3FF',
    fontSize: 38,
    lineHeight: 42,
  },
  signName: {
    marginTop: 8,
    color: '#DCE7FF',
    fontSize: 12,
    fontWeight: '700',
  },
  auraBridge: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bridgeGlow: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.35)',
  },
  vsText: {
    color: '#EDE9FE',
    fontSize: 20,
    fontWeight: '700',
  },
  scoreSection: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterGlow: {
    position: 'absolute',
    width: 158,
    height: 158,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.18)',
  },
  ringCenter: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(8,13,34,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringScore: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ringLabel: {
    marginTop: 4,
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  verdictCard: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  verdictEyebrow: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  verdictText: {
    color: '#F8FAFC',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    fontFamily: serifFamily,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 14,
  },
  footerBrand: {
    color: '#EDE9FE',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  qrWrap: {
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrShell: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  storeText: {
    color: 'rgba(226,232,240,0.82)',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
