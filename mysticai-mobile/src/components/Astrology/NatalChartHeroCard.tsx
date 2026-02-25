import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HousePlacement, PlanetPosition, PlanetaryAspect } from '../../services/astrology.service';
import { getZodiacInfo } from '../../constants/zodiac';
import { useTheme } from '../../context/ThemeContext';
import NatalChartProPanels from './NatalChartProPanels';

export type HeroBigThreeRole = 'sun' | 'moon' | 'rising';
export type HeroMetricTarget = 'planet_positions' | 'house_positions' | 'aspect_list';

type Props = {
  name?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  birthLocation?: string | null;
  sunSign?: string | null;
  moonSign?: string | null;
  risingSign?: string | null;
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  planetNames?: Record<string, string>;
  showWheelPreview?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onBigThreePress?: (role: HeroBigThreeRole) => void;
  onMetricPress?: (target: HeroMetricTarget) => void;
};

function MetaChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.metaChipLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaChipValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MetricChip({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string | number;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.metricChip,
        { borderColor: colors.border, backgroundColor: colors.card },
        onPress && pressed && { opacity: 0.9 },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${value} ${label} detayını aç` : undefined}
    >
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function SignatureRow({
  icon,
  label,
  signText,
  element,
  onPress,
}: {
  icon: string;
  label: string;
  signText: string;
  element: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.signatureRow,
        { backgroundColor: colors.primaryTint, borderColor: colors.border },
        onPress && pressed && { opacity: 0.9 },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${label} detayını aç` : undefined}
    >
      <View style={[styles.signatureIconBubble, { backgroundColor: colors.violetBg }]}>
        <Text style={[styles.signatureIcon, { color: colors.violet }]}>{icon}</Text>
      </View>
      <View style={styles.signatureTextCol}>
        <Text style={[styles.signatureLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.signatureValue, { color: colors.text }]} numberOfLines={1}>
          {signText}
        </Text>
      </View>
      <View style={[styles.elementPill, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.elementPillText, { color: colors.textMuted }]}>{element}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={14} color={colors.muted} /> : null}
    </Pressable>
  );
}

export default function NatalChartHeroCard({
  name,
  birthDate,
  birthTime,
  birthLocation,
  sunSign,
  moonSign,
  risingSign,
  planets,
  houses,
  aspects,
  planetNames,
  showWheelPreview = false,
  expanded = true,
  onToggleExpanded,
  onBigThreePress,
  onMetricPress,
}: Props) {
  const { colors } = useTheme();
  const sun = getZodiacInfo(sunSign);
  const moon = getZodiacInfo(moonSign);
  const rising = getZodiacInfo(risingSign);

  const dateTimeLine = [birthDate || 'Tarih yok', birthTime || 'Saat yok'].join(' • ');
  const planetCount = planets?.length ?? 0;
  const houseCount = houses?.length ?? 0;
  const aspectCount = aspects?.length ?? 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Pressable
        onPress={onToggleExpanded}
        disabled={!onToggleExpanded}
        style={({ pressed }) => [
          styles.headerPlate,
          {
            backgroundColor: colors.primaryTint,
            borderBottomColor: expanded ? colors.border : 'transparent',
          },
          onToggleExpanded && pressed && { opacity: 0.95 },
        ]}
        accessibilityRole={onToggleExpanded ? 'button' : undefined}
        accessibilityState={onToggleExpanded ? { expanded } : undefined}
        accessibilityLabel={onToggleExpanded ? `Yıldız harita bilgilerini ${expanded ? 'daralt' : 'genişlet'}` : undefined}
      >
        <View style={[styles.headerGlow, { backgroundColor: colors.violetBg }]} />
        <View style={styles.headerRow}>
          <View style={styles.identityCol}>
            <Text style={[styles.eyebrow, { color: colors.violet }]}>YILDIZ HARİTA BİLGİLERİ</Text>
            <Text style={[styles.name, { color: colors.textSlate }]} numberOfLines={1}>
              {name || 'Mystic Soul'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]} numberOfLines={1}>
              {dateTimeLine}
            </Text>
          </View>

          <View style={[styles.headerBadge, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.headerBadgeText, { color: colors.violet }]}>ÖZET</Text>
          </View>

          {onToggleExpanded ? (
            <View style={[styles.headerChevronBadge, { backgroundColor: colors.violetBg }]}>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.violet}
              />
            </View>
          ) : null}
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <View style={styles.metaGrid}>
            <MetaChip label="Yer" value={birthLocation || 'Belirtilmedi'} />
            <MetaChip label="Harita Sistemi" value="Tropikal Zodyak • Placidus Ev Sistemi" />
          </View>

          <View style={styles.signaturePanel}>
            <View style={styles.signaturePanelHeader}>
              <Text style={[styles.signatureTitle, { color: colors.text }]}>Kozmik İmza</Text>
              <Text style={[styles.signatureSub, { color: colors.textMuted }]}>
                Güneş • Ay • Yükselen üçlüsüne dokunarak detayları aç
              </Text>
            </View>

            <View style={styles.signatureRows}>
              <SignatureRow
                icon="☉"
                label="Güneş"
                signText={`${sun.symbol} ${sun.name}`}
                element={sun.element}
                onPress={onBigThreePress ? () => onBigThreePress('sun') : undefined}
              />
              <SignatureRow
                icon="☽"
                label="Ay"
                signText={`${moon.symbol} ${moon.name}`}
                element={moon.element}
                onPress={onBigThreePress ? () => onBigThreePress('moon') : undefined}
              />
              <SignatureRow
                icon="↑"
                label="Yükselen"
                signText={`${rising.symbol} ${rising.name}`}
                element={rising.element}
                onPress={onBigThreePress ? () => onBigThreePress('rising') : undefined}
              />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricChip
              label="Gezegen"
              value={planetCount}
              onPress={onMetricPress ? () => onMetricPress('planet_positions') : undefined}
            />
            <MetricChip
              label="Ev"
              value={houseCount}
              onPress={onMetricPress ? () => onMetricPress('house_positions') : undefined}
            />
            <MetricChip
              label="Açı"
              value={aspectCount}
              onPress={onMetricPress ? () => onMetricPress('aspect_list') : undefined}
            />
          </View>

          {!showWheelPreview ? (
            <View style={[styles.footerNote, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.footerNoteText, { color: colors.textMuted }]}>
                Dairesel harita, açı matrisi ve derece listesi aşağıdaki teknik akordiyonlarda.
              </Text>
            </View>
          ) : null}

          {showWheelPreview ? (
            <View style={styles.chartWrap}>
              <NatalChartProPanels
                mode="hero"
                planets={planets}
                houses={houses}
                aspects={aspects}
                risingSign={risingSign}
                planetNames={planetNames}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  headerPlate: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    right: -18,
    top: -56,
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identityCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.05,
  },
  name: {
    fontSize: 16.5,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
  },
  headerBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerChevronBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 10,
    gap: 8,
  },
  metaGrid: {
    gap: 6,
  },
  metaChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 2,
  },
  metaChipLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaChipValue: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  signaturePanel: {
    gap: 7,
  },
  signaturePanelHeader: {
    paddingHorizontal: 2,
    gap: 1,
  },
  signatureTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  signatureSub: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '500',
  },
  signatureRows: {
    gap: 6,
  },
  signatureRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signatureIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureIcon: {
    fontSize: 14,
    fontWeight: '800',
  },
  signatureTextCol: {
    flex: 1,
    minWidth: 0,
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  signatureValue: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: '700',
  },
  elementPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  elementPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  metricChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  footerNote: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footerNoteText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
  },
  chartWrap: {
    marginTop: 2,
  },
});

