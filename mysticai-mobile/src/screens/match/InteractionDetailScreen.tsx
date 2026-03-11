import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Flame,
  Heart,
  MessageCircle,
  Shield,
  Sparkles,
} from 'lucide-react-native';

import { AccessibleText, AppHeader, SafeScreen } from '../../components/ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import PersonAvatar from '../../components/match/PersonAvatar';
import { useMatchTraits } from '../../hooks/useMatchTraits';
import {
  buildMeaningBullets,
  buildPairLine,
  buildPositiveFlowLine,
  buildRiskSolution,
  buildUsageSteps,
} from './matchNarrative';
import {
  formatPersonPlanetLabel,
  localizeAspectName,
  localizeAspectType,
  localizeAstroText,
  localizePlanetName,
  parseLocalizedSignLabel,
} from '../../utils/matchAstroLabels';

type AspectTone = 'DESTEKLEYICI' | 'ZORLAYICI';
type ThemeKey = 'ASK' | 'ILETISIM' | 'GUVEN' | 'TUTKU';

const KNOWN_PLANETS = new Set([
  'Güneş',
  'Ay',
  'Merkür',
  'Venüs',
  'Mars',
  'Jüpiter',
  'Satürn',
  'Uranüs',
  'Neptün',
  'Plüton',
  'Kiron',
  'Kuzey Düğümü',
  'Güney Düğümü',
]);

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseMatchId(value: string | string[] | undefined) {
  const raw = firstParam(value);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parseSignLabel(value: string | undefined) {
  const parsed = parseLocalizedSignLabel(value, '');
  return { icon: parsed.icon, sign: parsed.label };
}

function parseThemeKey(value: string | undefined): ThemeKey {
  const key = (value ?? '').toUpperCase();
  if (key === 'ILETISIM') return 'ILETISIM';
  if (key === 'GUVEN') return 'GUVEN';
  if (key === 'TUTKU') return 'TUTKU';
  return 'ASK';
}

function parseTone(value: string | undefined): AspectTone {
  const tone = (value ?? '').toUpperCase();
  if (tone === 'ZORLAYICI') return 'ZORLAYICI';
  return 'DESTEKLEYICI';
}

function inferThemeKeyFromAspect(name: string, theme: string): ThemeKey {
  const haystack = `${name} ${theme}`.toLocaleLowerCase('tr-TR');
  if (/merkür|merkur|mercury|iletişim|ifade/.test(haystack)) return 'ILETISIM';
  if (/satürn|saturn|güven|guven/.test(haystack)) return 'GUVEN';
  if (/mars|plüton|pluton|tutku|enerji/.test(haystack)) return 'TUTKU';
  return 'ASK';
}

function themeMeta(theme: ThemeKey) {
  if (theme === 'ILETISIM') {
    return {
      title: 'İfade ve iletişim alanı',
      Icon: MessageCircle,
      iconColor: '#7C3AED',
      gradient: ['#F7F2FF', '#EEF8FF'] as const,
    };
  }
  if (theme === 'GUVEN') {
    return {
      title: 'Güven ve dayanıklılık alanı',
      Icon: Shield,
      iconColor: '#0F9D76',
      gradient: ['#F1FFF8', '#F7FFFC'] as const,
    };
  }
  if (theme === 'TUTKU') {
    return {
      title: 'Tutku ve enerji alanı',
      Icon: Flame,
      iconColor: '#EA580C',
      gradient: ['#FFF4EF', '#FFF9F5'] as const,
    };
  }
  return {
    title: 'Aşk, keyif ve paylaşım alanı',
    Icon: Heart,
    iconColor: '#DB2777',
    gradient: ['#FFF1F7', '#F1FFF8'] as const,
  };
}

function aspectPlanets(name: string) {
  const rawParts = name.trim().split(/\s+/).filter(Boolean);
  if (!rawParts.length) return { left: 'Gezegen A', right: 'Gezegen B' };

  const localizedPlanets = rawParts
    .map((part) => part.replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü_]/g, ''))
    .filter(Boolean)
    .map((part) => localizePlanetName(part, ''))
    .map((part) => part.trim())
    .filter((part) => KNOWN_PLANETS.has(part));

  if (localizedPlanets.length >= 2) {
    return { left: localizedPlanets[0], right: localizedPlanets[localizedPlanets.length - 1] };
  }

  if (localizedPlanets.length === 1) {
    return { left: localizedPlanets[0], right: localizedPlanets[0] };
  }

  const fallbackParts = rawParts.map((part) => localizeAstroText(part, part));
  if (fallbackParts.length === 1) return { left: fallbackParts[0], right: fallbackParts[0] };
  return { left: fallbackParts[0], right: fallbackParts[fallbackParts.length - 1] };
}

export default function InteractionDetailScreen() {
  const params = useLocalSearchParams<{
    matchId?: string;
    aspectId?: string;
    aspectName?: string;
    theme?: string;
    themeKey?: string;
    tone?: string;
    orb?: string;
    aspectType?: string;
    personAName?: string;
    personBName?: string;
    personASignLabel?: string;
    personBSignLabel?: string;
    personAAvatarUri?: string;
    personBAvatarUri?: string;
  }>();

  const matchId = parseMatchId(params.matchId);
  const aspectId = firstParam(params.aspectId);
  const personAName = firstParam(params.personAName) ?? 'Aslı';
  const personBName = firstParam(params.personBName) ?? 'Muaz';
  const personAAvatarUri = firstParam(params.personAAvatarUri) ?? undefined;
  const personBAvatarUri = firstParam(params.personBAvatarUri) ?? undefined;
  const personASign = parseSignLabel(firstParam(params.personASignLabel));
  const personBSign = parseSignLabel(firstParam(params.personBSignLabel));
  const { data: matchData, loading: matchLoading } = useMatchTraits(matchId, {
    personAName,
    personBName,
    personASignLabel: firstParam(params.personASignLabel),
    personBSignLabel: firstParam(params.personBSignLabel),
  });

  const selectedAspect = useMemo(() => {
    if (!aspectId || !matchData?.aspects?.length) return null;
    return matchData.aspects.find((item) => item.id === aspectId) ?? null;
  }, [aspectId, matchData?.aspects]);

  const aspectNameRaw = firstParam(params.aspectName) ?? selectedAspect?.name ?? 'Venüs △ Jüpiter';
  const themeRaw = firstParam(params.theme) ?? selectedAspect?.theme ?? 'Aşk, keyif ve paylaşım alanı';
  const themeKey = parseThemeKey(
    firstParam(params.themeKey) ?? inferThemeKeyFromAspect(aspectNameRaw, themeRaw),
  );
  const meta = themeMeta(themeKey);
  const aspectName = localizeAspectName(aspectNameRaw, 'Venüs △ Jüpiter');
  const theme = localizeAstroText(themeRaw, meta.title);
  const tone = parseTone(firstParam(params.tone) ?? selectedAspect?.tone);
  const orb = firstParam(params.orb) ?? (selectedAspect ? selectedAspect.orb.toFixed(1) : '1.1');
  const aspectType = localizeAspectType(firstParam(params.aspectType) ?? selectedAspect?.aspectType);
  const orbValue = Number.parseFloat(orb);

  const planets = useMemo(() => aspectPlanets(aspectName), [aspectName]);
  const narrativeInput = useMemo(
    () => ({
      theme: themeKey,
      tone,
      leftName: personAName,
      rightName: personBName,
      aspectName,
      leftPlanet: planets.left,
      rightPlanet: planets.right,
      orb: Number.isFinite(orbValue) ? orbValue : undefined,
    }),
    [aspectName, orbValue, personAName, personBName, planets.left, planets.right, themeKey, tone],
  );
  const bullets = useMemo(() => buildMeaningBullets(narrativeInput), [narrativeInput]);
  const steps = useMemo(() => buildUsageSteps(narrativeInput), [narrativeInput]);
  const pairLineText = useMemo(() => buildPairLine(narrativeInput), [narrativeInput]);
  const riskSolutionText = useMemo(() => buildRiskSolution(narrativeInput), [narrativeInput]);
  const positiveFlowText = useMemo(() => buildPositiveFlowLine(narrativeInput), [narrativeInput]);

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#F7F5FB' }}>
      <View style={styles.container}>
        <AppHeader title="Etkileşim Detayları" subtitle="İki kişi arasındaki astrolojik etkileşimler" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {matchLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <AccessibleText style={styles.loadingText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Etkileşim detayı hazırlanıyor…
              </AccessibleText>
            </View>
          ) : null}

          <LinearGradient colors={[...meta.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIcon}>
                <meta.Icon size={24} color={meta.iconColor} />
              </View>
              <View style={styles.heroTexts}>
                <AccessibleText style={styles.heroTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {aspectName}
                </AccessibleText>
                <AccessibleText style={styles.heroSubtitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {theme}
                </AccessibleText>
                <AccessibleText style={styles.heroMeta} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {tone === 'DESTEKLEYICI' ? 'Destekleyici' : 'Zorlayıcı'} • Orb {orb}° {aspectType ? `• ${aspectType}` : ''}
                </AccessibleText>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.peopleCard}>
            <View style={styles.peopleRow}>
              <View style={styles.personCol}>
                <PersonAvatar name={personAName} uri={personAAvatarUri} side="left" size={58} />
                <AccessibleText style={styles.personLabel} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {formatPersonPlanetLabel(personAName, planets.left)}
                </AccessibleText>
                <AccessibleText style={styles.personSign} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {personASign.icon} {personASign.sign}
                </AccessibleText>
              </View>

              <View style={styles.bridgeCol}>
                <View style={styles.bridgeLine} />
                <View style={styles.bridgeIcons}>
                  <Heart size={12} color="#EC4899" />
                  <Sparkles size={12} color="#F59E0B" />
                </View>
                <View style={styles.bridgeLine} />
              </View>

              <View style={styles.personCol}>
                <PersonAvatar name={personBName} uri={personBAvatarUri} side="right" size={58} />
                <AccessibleText style={styles.personLabel} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {formatPersonPlanetLabel(personBName, planets.right)}
                </AccessibleText>
                <AccessibleText style={styles.personSign} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {personBSign.icon} {personBSign.sign}
                </AccessibleText>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <AccessibleText style={styles.sectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Bu Ne Demek?
            </AccessibleText>
            {bullets.map((bullet, index) => (
              <View key={`bullet-${index}`} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <AccessibleText style={styles.bulletText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {bullet}
                </AccessibleText>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <AccessibleText style={styles.sectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Nasıl Kullanılır?
            </AccessibleText>
            {steps.map((step, index) => (
              <Pressable key={`step-${index}`} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <Sparkles size={12} color="#7C3AED" />
                </View>
                <AccessibleText style={styles.stepText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {step}
                </AccessibleText>
                <ChevronRight size={16} color="#7E7892" />
              </Pressable>
            ))}
          </View>

          {tone === 'ZORLAYICI' ? (
            <View style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <AlertTriangle size={16} color="#B42318" />
                <AccessibleText style={styles.riskTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Zorlayıcı İfade
                </AccessibleText>
              </View>
              <AccessibleText style={styles.riskPair} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {pairLineText}
              </AccessibleText>
              <View style={styles.riskBars}>
                <View style={[styles.riskBar, { width: '49%', backgroundColor: '#F59E0B' }]} />
                <View style={[styles.riskBar, { width: '41%', backgroundColor: '#A78BFA' }]} />
              </View>
              <View style={styles.solutionCard}>
                <AccessibleText style={styles.solutionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Çözüm Yolu
                </AccessibleText>
                <AccessibleText style={styles.solutionText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {riskSolutionText}
                </AccessibleText>
                <Pressable style={styles.solutionBtn}>
                  <AccessibleText style={styles.solutionBtnText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    Planla
                  </AccessibleText>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.okCard}>
              <CheckCircle2 size={16} color="#0D8B56" />
              <AccessibleText style={styles.okText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {positiveFlowText}
              </AccessibleText>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.5,
    color: '#1E192C',
    fontWeight: '800',
  },
  scroll: {
    gap: 10,
    paddingBottom: 20,
  },
  loadingCard: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F5872',
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4DBF1',
    padding: 14,
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECDFF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTexts: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    color: '#1D182C',
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '600',
    color: '#615B73',
  },
  heroMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#7A7390',
  },
  peopleCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  bridgeCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: -8,
  },
  bridgeLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#DCCFF0',
    borderStyle: 'dotted',
  },
  bridgeIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personLabel: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: '#2B2540',
  },
  personSign: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6C6680',
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.5,
    fontWeight: '800',
    color: '#1E192C',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F59E0B',
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: '#282238',
    fontWeight: '500',
  },
  stepRow: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE6F3',
    backgroundColor: '#FBF9FE',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFE6FF',
    borderWidth: 1,
    borderColor: '#DCC8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#221C34',
  },
  riskCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3D5DC',
    backgroundColor: '#FFF8FA',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 9,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  riskTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: '#891A35',
  },
  riskPair: {
    fontSize: 14,
    lineHeight: 20,
    color: '#30283F',
    fontWeight: '600',
  },
  riskBars: {
    flexDirection: 'row',
    gap: 8,
  },
  riskBar: {
    height: 7,
    borderRadius: 999,
  },
  solutionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0DDE5',
    backgroundColor: '#FFFDFE',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 7,
  },
  solutionTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: '#7A2544',
  },
  solutionText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#3F364D',
    fontWeight: '600',
  },
  solutionBtn: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DCCCF9',
    backgroundColor: '#F3ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  solutionBtnText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5B21B6',
    fontWeight: '800',
  },
  okCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBEAD3',
    backgroundColor: '#F2FBF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  okText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#0C6B4C',
    fontWeight: '700',
  },
});
