import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { DailyRecommendationCard } from './DailyRecommendationCard';

type Variant = 'v1' | 'v2';

interface HomeSpiritualSectionProps {
  variant?: Variant;
}

/* ─── Feature card data ─── */
const FEATURES = [
  {
    key: 'dua',
    route: '/spiritual/dua' as const,
    icon: 'book-outline' as const,
    label: 'Dualar',
    sub: 'Günlük dualar',
    colorKey: 'dua' as const,
  },
  {
    key: 'esma',
    route: '/spiritual/asma' as const,
    icon: 'sparkles-outline' as const,
    label: 'Esmalar',
    sub: '99 Esma',
    colorKey: 'esma' as const,
  },
  {
    key: 'breath',
    route: '/spiritual/breathing' as const,
    icon: 'leaf-outline' as const,
    label: 'Nefes',
    sub: 'Nefes teknikleri',
    colorKey: 'meditation' as const,
  },
  {
    key: 'routine',
    route: '/spiritual/routine-picker' as const,
    icon: 'layers-outline' as const,
    label: 'Rutin Belirle',
    sub: 'Ruhsal çantam',
    colorKey: 'dua' as const,
  },
] as const;

const SURES = [
  { id: 16, letter: 'ف', name: 'Fâtiha', color: 'dua' as const },
  { id: 17, letter: 'إ', name: 'İhlâs', color: 'gold' as const },
  { id: 18, letter: 'ف', name: 'Felak', color: 'esma' as const },
  { id: 19, letter: 'ن', name: 'Nâs', color: 'meditation' as const },
] as const;

export function HomeSpiritualSection({ variant = 'v1' }: HomeSpiritualSectionProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark, variant);

  /* ─── Palette helpers ─── */
  const palette = {
    dua: isDark ? colors.spiritualDua : colors.spiritualDua,
    duaBg: isDark ? colors.spiritualDuaLight : colors.spiritualDuaLight + '28',
    esma: isDark ? colors.spiritualEsma : colors.spiritualEsma,
    esmaBg: isDark ? colors.spiritualEsmaLight : colors.spiritualEsmaLight + '28',
    meditation: isDark ? colors.spiritualMeditation : colors.spiritualMeditation,
    meditationBg: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)',
    gold: isDark ? colors.gold : colors.goldDark,
    goldBg: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.08)',
  };

  const featureColor = (key: 'dua' | 'esma' | 'meditation') => palette[key];
  const featureBg = (key: 'dua' | 'esma' | 'meditation') => palette[`${key}Bg`];

  const sureColor = (key: 'dua' | 'esma' | 'meditation' | 'gold') => palette[key];

  return (
    <View style={S.section}>
      {/* ─── Header ─── */}
      <View style={S.headerRow}>
        <View style={S.titleWrap}>
          <LinearGradient
            colors={isDark
              ? ['rgba(168,139,250,0.28)', 'rgba(124,58,237,0.08)']
              : ['rgba(124,58,237,0.14)', 'rgba(124,58,237,0.04)']}
            style={S.titleIconGlow}
          />
          <View style={S.titleIcon}>
            <Ionicons
              name="sparkles"
              size={13}
              color={isDark ? '#FCD34D' : '#7C3AED'}
            />
          </View>
          <Text style={S.title}>Ruhsal Pratikler</Text>
        </View>
        <Pressable
          onPress={() => router.push('/spiritual')}
          style={({ pressed }) => [S.allBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={S.allBtnText}>Keşfet</Text>
          <Ionicons name="arrow-forward" size={12} color={colors.primary} />
        </Pressable>
      </View>

      {/* ─── Günün Önerisi ─── */}
      <DailyRecommendationCard
        accentColor={colors.spiritualEsma}
        surfaceColor={isDark ? colors.spiritualEsmaLight : colors.spiritualEsmaLight + '28'}
        textColor={isDark ? '#FFFBEB' : '#78350F'}
        subtextColor={isDark ? '#FDE68A' : '#92400E'}
        borderColor={isDark ? '#92400E' : colors.spiritualEsmaLight}
        onShowAll={() => router.push('/spiritual/recommendations')}
      />

      {/* ─── Feature Grid (2 col first row, 1 full-width) ─── */}
      <View style={S.grid}>
        {FEATURES.map((f) => {
          const accent = featureColor(f.colorKey);
          const bg = featureBg(f.colorKey);
          return (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                S.featureCard,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => router.push(f.route as any)}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[accent + (isDark ? '18' : '10'), 'transparent']}
                style={S.featureGlow}
              />
              <View style={[S.featureIconWrap, { backgroundColor: bg }]}>
                <Ionicons name={f.icon} size={16} color={accent} />
              </View>
              <View style={S.featureTextWrap}>
                <Text style={S.featureLabel} numberOfLines={1}>{f.label}</Text>
                <Text style={S.featureSub} numberOfLines={1}>{f.sub}</Text>
              </View>
              <View style={[S.featureArrow, { backgroundColor: bg }]}>
                <Ionicons name="chevron-forward" size={14} color={accent} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ─── Sureler Strip ─── */}
      <View style={S.sureSection}>
        <View style={S.sureHeader}>
          <View style={S.sureHeaderLeft}>
            <Ionicons
              name="book"
              size={12}
              color={isDark ? colors.gold : colors.goldDark}
            />
            <Text style={S.sureTitle}>Sureler</Text>
          </View>
          <Pressable onPress={() => router.push('/spiritual/sure')}>
            <Text style={S.sureAll}>Tümü</Text>
          </Pressable>
        </View>
        <View style={S.sureChips}>
          {SURES.map((s) => {
            const clr = sureColor(s.color);
            return (
              <Pressable
                key={s.id}
                style={({ pressed }) => [
                  S.sureChip,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/spiritual/dua/[id]',
                    params: { id: s.id },
                  })
                }
              >
                <Text style={[S.sureArabic, { color: clr }]}>{s.letter}</Text>
                <Text style={S.sureName}>{s.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ─── Footer Badges ─── */}
      <View style={S.footerRow}>
        {[
          { icon: 'shield-checkmark-outline' as const, text: 'Kaynak notu' },
          { icon: 'moon-outline' as const, text: 'Kısa pratik' },
          { icon: 'stats-chart-outline' as const, text: 'Günlük takip' },
        ].map((f) => (
          <View key={f.text} style={S.footerItem}>
            <Ionicons name={f.icon} size={11} color={colors.subtext} />
            <Text style={S.footerText}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── Styles ─── */
function makeStyles(
  C: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
  variant: Variant,
) {
  const isV2 = variant === 'v2';

  return StyleSheet.create({
    /* ── Container ── */
    section: {
      marginTop: isV2 ? 4 : 12,
      marginHorizontal: isV2 ? 0 : 20,
      padding: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: isV2
        ? (isDark ? 'rgba(168,139,250,0.18)' : 'rgba(124,58,237,0.10)')
        : C.border,
      backgroundColor: isV2
        ? (isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.86)')
        : C.surface,
      gap: 14,
    },

    /* ── Header ── */
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    titleIconGlow: {
      position: 'absolute',
      left: -6,
      top: -6,
      width: 34,
      height: 34,
      borderRadius: 17,
    },
    titleIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? 'rgba(124,58,237,0.22)'
        : 'rgba(124,58,237,0.10)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(168,139,250,0.22)'
        : 'rgba(124,58,237,0.12)',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -0.3,
    },
    allBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: isDark
        ? 'rgba(99,102,241,0.12)'
        : 'rgba(99,102,241,0.06)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(129,140,248,0.18)'
        : 'rgba(99,102,241,0.12)',
    },
    allBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: C.primary,
    },

    /* ── Feature Grid ── */
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    featureCard: {
      width: '48%' as unknown as number,
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(148,163,184,0.14)'
        : 'rgba(226,232,240,0.85)',
      backgroundColor: isDark
        ? 'rgba(30,41,59,0.70)'
        : 'rgba(248,250,252,0.92)',
      overflow: 'hidden',
    },
    featureGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 48,
    },
    featureIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureTextWrap: {
      flex: 1,
      gap: 1,
    },
    featureLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: C.text,
    },
    featureSub: {
      fontSize: 10.5,
      fontWeight: '500',
      color: C.subtext,
    },
    featureArrow: {
      width: 24,
      height: 24,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ── Sureler ── */
    sureSection: {
      borderRadius: 16,
      padding: 12,
      backgroundColor: isDark
        ? 'rgba(15,23,42,0.40)'
        : 'rgba(255,255,255,0.65)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(148,163,184,0.10)'
        : 'rgba(229,231,235,0.7)',
    },
    sureHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sureHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sureTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: C.text,
    },
    sureAll: {
      fontSize: 11,
      fontWeight: '700',
      color: C.primary,
    },
    sureChips: {
      flexDirection: 'row',
      gap: 8,
    },
    sureChip: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: isDark
        ? 'rgba(30,41,59,0.70)'
        : 'rgba(248,250,252,0.95)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(148,163,184,0.12)'
        : 'rgba(226,232,240,0.8)',
    },
    sureArabic: {
      fontSize: 18,
      fontWeight: '700',
    },
    sureName: {
      fontSize: 11,
      fontWeight: '600',
      color: C.text,
    },

    /* ── Footer ── */
    footerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
      backgroundColor: isDark
        ? 'rgba(15,23,42,0.48)'
        : 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(148,163,184,0.12)'
        : 'rgba(229,231,235,0.8)',
    },
    footerText: {
      fontSize: 10,
      fontWeight: '600',
      color: C.subtext,
    },
  });
}
