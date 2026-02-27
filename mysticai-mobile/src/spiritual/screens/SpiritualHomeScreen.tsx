import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSpiritualDaily } from '../hooks/useSpiritualDaily';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SafeScreen, AppHeader, Card, Button, Badge } from '../../components/ui';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';

export default function SpiritualHomeScreen() {
  const { prayers, asma, meditation } = useSpiritualDaily();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const isLoading = prayers.isLoading || asma.isLoading || meditation.isLoading;
  const hasError = prayers.isError || asma.isError || meditation.isError;

  return (
    <SafeScreen scroll>
      <AppHeader title="Ruhsal Pratikler" />

      {isLoading ? (
        <Text style={[s.info, { color: colors.subtext }]}>Yükleniyor...</Text>
      ) : null}
      {hasError ? (
        <Text style={[s.info, { color: colors.error }]}>
          Ruhsal içerikler yüklenemedi. Tekrar deneyin.
        </Text>
      ) : null}

      {/* Bugünün Duası */}
      <Card
        variant="elevated"
        onPress={() => router.push('/spiritual/prayers')}
        accessibilityLabel="Bugünün duası"
      >
        <View style={s.cardRow}>
          <View style={[s.accentBar, { backgroundColor: colors.spiritualDua }]} />
          <View style={[s.cardIcon, { backgroundColor: colors.spiritualDuaLight }]}>
            <Ionicons name="book-outline" size={20} color={colors.spiritualDua} />
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Bugünün Duası
            </Text>
            <Text style={s.cardSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {prayers.data
                ? `${prayers.data.items.length} dua · ${prayers.data.variant}`
                : 'Dua setine git'}
            </Text>
          </View>
          {prayers.data && (
            <Badge label={prayers.data.variant} variant="primary" />
          )}
        </View>
      </Card>

      {/* Bugünün Esması */}
      <Card
        variant="elevated"
        onPress={() => router.push('/spiritual/asma')}
        accessibilityLabel="Bugünün esması"
      >
        <View style={s.cardRow}>
          <View style={[s.accentBar, { backgroundColor: colors.spiritualEsma }]} />
          <View style={[s.cardIcon, { backgroundColor: colors.spiritualEsmaLight }]}>
            <Ionicons name="sparkles-outline" size={20} color={colors.spiritualEsma} />
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Bugünün Esması
            </Text>
            <Text style={s.cardSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {asma.data
                ? `${asma.data.transliterationTr} · ${asma.data.theme ?? 'Tema'}`
                : 'Esmaya git'}
            </Text>
          </View>
          {asma.data?.theme && (
            <Badge label={asma.data.theme} variant="success" />
          )}
        </View>
      </Card>

      {/* Bugünün Nefesi */}
      <Card
        variant="elevated"
        onPress={() => router.push('/spiritual/meditation')}
        accessibilityLabel="Bugünün nefes egzersizi"
      >
        <View style={s.cardRow}>
          <View style={[s.accentBar, { backgroundColor: colors.spiritualMeditation }]} />
          <View style={[s.cardIcon, { backgroundColor: colors.violetBg }]}>
            <Ionicons name="leaf-outline" size={20} color={colors.spiritualMeditation} />
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Bugünün Nefesi
            </Text>
            <Text style={s.cardSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {meditation.data
                ? `${meditation.data.title} · ${Math.floor(meditation.data.durationSec / 60)} dk`
                : 'Egzersize git'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Koleksiyonlar */}
      <View style={s.row}>
        <Card
          style={s.half}
          variant="elevated"
          onPress={() => router.push('/spiritual/dua')}
          accessibilityLabel="Tüm dualar"
        >
          <Ionicons name="book-outline" size={22} color={colors.spiritualDua} />
          <Text style={s.miniTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Dualar
          </Text>
          <Text style={s.miniSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Tüm dua koleksiyonu
          </Text>
        </Card>
        <Card
          style={s.half}
          variant="elevated"
          onPress={() => router.push('/spiritual/sure')}
          accessibilityLabel="Sureler"
        >
          <Ionicons name="library-outline" size={22} color="#0D9488" />
          <Text style={s.miniTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Sureler
          </Text>
          <Text style={s.miniSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Yasin, Mülk, Nebe ve daha fazlası
          </Text>
        </Card>
      </View>

      <Button
        title="Rutini Başlat"
        size="lg"
        onPress={() => router.push('/spiritual/prayers/flow')}
        accessibilityLabel="Dua rutinini başlat"
      />

      {/* Ruhsal Çantam + Nefes Teknikleri */}
      <View style={s.row}>
        <Card
          style={s.half}
          onPress={() => router.push('/spiritual/custom-sets')}
          accessibilityLabel="Ruhsal çantam"
        >
          <Ionicons name="bag-outline" size={22} color="#F59E0B" />
          <Text style={s.miniTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Ruhsal Çantam
          </Text>
          <Text style={s.miniSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Kişisel setler
          </Text>
        </Card>
        <Card
          style={s.half}
          onPress={() => router.push('/spiritual/breathing')}
          accessibilityLabel="Nefes teknikleri"
        >
          <Ionicons name="leaf-outline" size={22} color={colors.spiritualMeditation} />
          <Text style={s.miniTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Nefes Teknikleri
          </Text>
          <Text style={s.miniSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            4-7-8, Nadi Shodhana...
          </Text>
        </Card>
      </View>

      {/* Bottom row: Journal + Settings */}
      <View style={s.row}>
        <Card
          style={s.half}
          onPress={() => router.push('/spiritual/journal')}
          accessibilityLabel="Dua günlüğüm"
        >
          <Ionicons name="journal-outline" size={22} color={colors.spiritualDua} />
          <Text style={s.miniTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Günlüğüm
          </Text>
          <Text style={s.miniSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Takvim ve istatistik
          </Text>
        </Card>
        <Card
          style={s.half}
          onPress={() => router.push('/spiritual/settings')}
          accessibilityLabel="Ruhsal pratik ayarları"
        >
          <Ionicons name="settings-outline" size={22} color={colors.subtext} />
          <Text style={s.miniTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Ayarlar
          </Text>
          <Text style={s.miniSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Font, TTS, bildirim
          </Text>
        </Card>
      </View>
    </SafeScreen>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    info: {
      ...TYPOGRAPHY.Body,
      textAlign: 'center',
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    accentBar: {
      width: 3,
      height: 36,
      borderRadius: 2,
    },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    cardSub: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
    },
    row: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    half: {
      flex: 1,
      gap: SPACING.xs,
    },
    miniTitle: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
      marginTop: SPACING.xs,
    },
    miniSub: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
    },
  });
}
