import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSpiritualDaily } from '../hooks/useSpiritualDaily';
import { DailyRecommendationCard } from './DailyRecommendationCard';

type Variant = 'v1' | 'v2';

interface HomeSpiritualSectionProps {
  variant?: Variant;
}

export function HomeSpiritualSection({ variant = 'v1' }: HomeSpiritualSectionProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { prayers, asma, meditation } = useSpiritualDaily();

  const isLoading = prayers.isLoading || asma.isLoading || meditation.isLoading;
  const hasError = prayers.isError || asma.isError || meditation.isError;

  const S = makeStyles(colors, isDark, variant);

  return (
    <View style={S.section}>
      <View style={S.headerRow}>
        <View style={S.titleWrap}>
          <View style={S.titleIcon}>
            <Ionicons name="sparkles-outline" size={14} color={isDark ? '#FCD34D' : '#7C3AED'} />
          </View>
          <Text style={S.title}>Ruhsal Pratikler</Text>
          <View style={S.livePill}>
            <View style={S.liveDot} />
            <Text style={S.liveText}>Günlük</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/spiritual')}>
          <Text style={S.link}>Tümünü Aç</Text>
        </Pressable>
      </View>

      {hasError ? (
        <Text style={S.helper}>
          Ruhsal içerikler şu an yüklenemedi. Modül ekranına geçerek tekrar deneyebilirsiniz.
        </Text>
      ) : isLoading ? (
        <Text style={S.helper}>Bugünün dua/esma/nefes içerikleri yükleniyor...</Text>
      ) : (
        <Text style={S.helper}>
          Günlük dua, esma ve nefes egzersizi ile kısa ve düzenli pratik.
        </Text>
      )}

      <DailyRecommendationCard
        accentColor={isDark ? '#4CAF50' : '#16A34A'}
        surfaceColor={isDark ? '#1A3D28' : '#F0FDF4'}
        textColor={isDark ? '#F0FFF4' : '#14532D'}
        subtextColor={isDark ? '#86EFAC' : '#166534'}
        borderColor={isDark ? '#2D5A3D' : '#BBF7D0'}
        onShowAll={() => router.push('/spiritual/recommendations')}
      />

      <View style={S.cards}>
        {/* Dualar */}
        <Pressable style={S.card} onPress={() => router.push('/spiritual/dua')}>
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? ['rgba(99,102,241,0.14)', 'rgba(99,102,241,0.00)'] : ['rgba(99,102,241,0.08)', 'rgba(99,102,241,0.00)']}
            style={S.cardGlow}
          />
          <View style={S.cardTopRow}>
            <View style={S.cardIconWrap}>
              <Ionicons name="book-outline" size={14} color={isDark ? '#818CF8' : '#6366F1'} />
            </View>
            <Text style={S.cardMetaPill}>Akış</Text>
          </View>
          <Text style={S.cardTitle}>Dualar</Text>
        </Pressable>

        {/* Esmalar */}
        <Pressable style={S.card} onPress={() => router.push('/spiritual/asma')}>
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? ['rgba(22,163,74,0.14)', 'rgba(22,163,74,0.00)'] : ['rgba(22,163,74,0.08)', 'rgba(22,163,74,0.00)']}
            style={S.cardGlow}
          />
          <View style={S.cardTopRow}>
            <View style={S.cardIconWrap}>
              <Ionicons name="sparkles-outline" size={14} color={isDark ? '#4ADE80' : '#16A34A'} />
            </View>
            <Text style={S.cardMetaPill}>Esma</Text>
          </View>
          <Text style={S.cardTitle}>Esmalar</Text>
        </Pressable>

        {/* Nefes Egzersizleri */}
        <Pressable style={S.card} onPress={() => router.push('/spiritual/meditation')}>
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? ['rgba(124,58,237,0.14)', 'rgba(124,58,237,0.00)'] : ['rgba(124,58,237,0.08)', 'rgba(124,58,237,0.00)']}
            style={S.cardGlow}
          />
          <View style={S.cardTopRow}>
            <View style={S.cardIconWrap}>
              <Ionicons name="leaf-outline" size={14} color={isDark ? '#A855F7' : '#7C3AED'} />
            </View>
            <Text style={S.cardMetaPill}>Nefes</Text>
          </View>
          <Text style={S.cardTitle}>Nefes Egzersizleri</Text>
        </Pressable>
      </View>

      {/* Sureler */}
      <Pressable style={S.shortRowWrap} onPress={() => router.push('/spiritual/sure')}>
        <View style={S.shortHeaderRow}>
          <Text style={S.shortTitle}>Sureler</Text>
          <Text style={S.shortHint}>Kur'an-ı Kerim</Text>
        </View>
        <View style={S.shortChips}>
          <Pressable
            style={S.shortChip}
            onPress={() => router.push({ pathname: '/spiritual/dua/[id]', params: { id: 16 } })}
          >
            <Text style={[S.shortChipArabic, { color: isDark ? '#818CF8' : '#6366F1' }]}>ف</Text>
            <Text style={S.shortChipText}>Fâtiha</Text>
          </Pressable>
          <Pressable
            style={S.shortChip}
            onPress={() => router.push({ pathname: '/spiritual/dua/[id]', params: { id: 17 } })}
          >
            <Text style={[S.shortChipArabic, { color: isDark ? '#FCD34D' : '#D97706' }]}>إ</Text>
            <Text style={S.shortChipText}>İhlâs</Text>
          </Pressable>
          <Pressable
            style={S.shortChip}
            onPress={() => router.push({ pathname: '/spiritual/dua/[id]', params: { id: 18 } })}
          >
            <Ionicons name="shield-checkmark-outline" size={12} color={isDark ? '#93C5FD' : '#2563EB'} />
            <Text style={S.shortChipText}>Felak</Text>
          </Pressable>
          <Pressable
            style={S.shortChip}
            onPress={() => router.push({ pathname: '/spiritual/dua/[id]', params: { id: 19 } })}
          >
            <Ionicons name="people-outline" size={12} color={isDark ? '#C4B5FD' : '#7C3AED'} />
            <Text style={S.shortChipText}>Nâs</Text>
          </Pressable>
        </View>
      </Pressable>

      <View style={S.footerRow}>
        <View style={S.footerItem}>
          <Ionicons name="shield-checkmark-outline" size={12} color={colors.subtext} />
          <Text style={S.footerText}>Kaynak notu</Text>
        </View>
        <View style={S.footerItem}>
          <Ionicons name="moon-outline" size={12} color={colors.subtext} />
          <Text style={S.footerText}>Kısa pratik</Text>
        </View>
        <View style={S.footerItem}>
          <Ionicons name="stats-chart-outline" size={12} color={colors.subtext} />
          <Text style={S.footerText}>Günlük takip</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, variant: Variant) {
  const isV2 = variant === 'v2';
  return StyleSheet.create({
    section: {
      marginTop: isV2 ? 4 : 12,
      marginHorizontal: isV2 ? 0 : 20,
      padding: isV2 ? 14 : 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isV2
        ? (isDark ? 'rgba(168,139,250,0.18)' : 'rgba(124,58,237,0.10)')
        : C.border,
      backgroundColor: isV2
        ? (isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.86)')
        : C.surface,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    titleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    titleIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(124,58,237,0.22)' : 'rgba(124,58,237,0.10)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(168,139,250,0.22)' : 'rgba(124,58,237,0.12)',
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: C.text,
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(248,250,252,0.95)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(226,232,240,0.9)',
    },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 999,
      backgroundColor: isDark ? '#34D399' : '#10B981',
    },
    liveText: {
      fontSize: 10,
      fontWeight: '700',
      color: C.subtext,
    },
    link: {
      fontSize: 12,
      fontWeight: '700',
      color: C.primary,
    },
    helper: {
      fontSize: 12,
      lineHeight: 18,
      color: C.subtext,
      marginBottom: 10,
    },
    cards: {
      gap: 8,
    },
    card: {
      overflow: 'hidden',
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isV2
        ? (isDark ? 'rgba(148,163,184,0.16)' : 'rgba(226,232,240,0.85)')
        : C.border,
      backgroundColor: isV2
        ? (isDark ? 'rgba(30,41,59,0.82)' : 'rgba(248,250,252,0.92)')
        : C.background,
    },
    cardGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 42,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    cardIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(226,232,240,0.8)',
    },
    cardMetaPill: {
      fontSize: 10,
      fontWeight: '700',
      color: C.subtext,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.75)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(229,231,235,0.9)',
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: C.text,
    },
    cardSub: {
      marginTop: 4,
      fontSize: 12,
      color: C.subtext,
    },
    footerRow: {
      marginTop: 10,
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
      backgroundColor: isDark ? 'rgba(15,23,42,0.48)' : 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(229,231,235,0.8)',
    },
    footerText: {
      fontSize: 10,
      fontWeight: '600',
      color: C.subtext,
    },
    shortRowWrap: {
      marginTop: 10,
      borderRadius: 14,
      padding: 10,
      backgroundColor: isDark ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.62)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(229,231,235,0.7)',
    },
    shortHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    shortTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: C.text,
    },
    shortHint: {
      fontSize: 10,
      fontWeight: '700',
      color: C.subtext,
    },
    shortChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    shortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: isDark ? 'rgba(30,41,59,0.72)' : 'rgba(248,250,252,0.95)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(226,232,240,0.8)',
    },
    shortChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: C.text,
    },
    shortChipArabic: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
