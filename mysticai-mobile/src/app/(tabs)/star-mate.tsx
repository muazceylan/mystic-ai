import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Image,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  type NativeSyntheticEvent,
  type LayoutChangeEvent,
  type TextInputChangeEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  FadeIn,
  FadeInDown,
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { TYPOGRAPHY } from '../../constants/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { useStarMateStore } from '../../store/useStarMateStore';
import {
  suggestCosmicAutoTags,
  type StarMateActionType,
  type StarMateChatMessage,
  type StarMateDetailSet,
  type StarMateDiscoveryFilters,
  type StarMateElement,
  type StarMateMatch,
  type StarMateMiniSynastryReport,
  type StarMateProfile,
  type StarMateProfileDraft,
  type StarMateShowMe,
} from '../../services/starMate.service';

type SegmentKey = 'DISCOVER' | 'MATCHES' | 'PROFILE' | 'SETTINGS';

type MatchTabKey = 'LIKES_YOU' | 'MATCHES';

type ProfileMode = 'EDIT' | 'PREVIEW';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DECK_CARD_WIDTH = SCREEN_WIDTH - 28;
const DECK_CARD_HEIGHT = Math.min(620, SCREEN_HEIGHT * 0.66);
const SWIPE_X_THRESHOLD = SCREEN_WIDTH * 0.28;
const SWIPE_UP_THRESHOLD = 120;

const SECTION_ITEMS: Array<{ key: SegmentKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'DISCOVER', label: 'Kesfet', icon: 'sparkles-outline' },
  { key: 'MATCHES', label: 'Eslesmeler', icon: 'chatbubbles-outline' },
  { key: 'PROFILE', label: 'Profilim', icon: 'person-circle-outline' },
  { key: 'SETTINGS', label: 'Filtreler', icon: 'options-outline' },
];

const MATCH_TAB_ITEMS: Array<{ key: MatchTabKey; label: string }> = [
  { key: 'LIKES_YOU', label: 'Seni begeniyor' },
  { key: 'MATCHES', label: 'Yeni eslesmeler' },
];

const PROFILE_MODE_ITEMS: Array<{ key: ProfileMode; label: string }> = [
  { key: 'EDIT', label: 'Duzenle' },
  { key: 'PREVIEW', label: 'On izleme' },
];

const SHOW_ME_OPTIONS: Array<{ value: StarMateShowMe; label: string }> = [
  { value: 'WOMEN', label: 'Kadinlar' },
  { value: 'MEN', label: 'Erkekler' },
  { value: 'EVERYONE', label: 'Herkes' },
];

const ELEMENT_OPTIONS: Array<{ value: 'ANY' | StarMateElement; label: string; icon: string }> = [
  { value: 'ANY', label: 'Tum', icon: '✨' },
  { value: 'FIRE', label: 'Ates', icon: '🔥' },
  { value: 'EARTH', label: 'Toprak', icon: '🌿' },
  { value: 'AIR', label: 'Hava', icon: '💨' },
  { value: 'WATER', label: 'Su', icon: '🌊' },
];

const INTEREST_TAG_OPTIONS = [
  'Seyahat',
  'Spa',
  'Spor',
  'Sinema',
  'Muzik',
  'Yoga',
  'Brunch',
  'Kamp',
  'Galeri',
  'Kahve',
  'Nightlife',
  'Yuruyus',
  'Yaratıcılık',
  'Seramik',
  'Kitap',
  'Podcast',
];

const EXERCISE_OPTIONS: Array<{ value: StarMateDetailSet['exercise']; label: string }> = [
  { value: 'LOW', label: 'Az' },
  { value: 'SOMETIMES', label: 'Bazen' },
  { value: 'REGULAR', label: 'Duzenli' },
];

const DRINKING_OPTIONS: Array<{ value: StarMateDetailSet['drinking']; label: string }> = [
  { value: 'NO', label: 'Icmem' },
  { value: 'SOCIAL', label: 'Sosyal' },
  { value: 'OCCASIONAL', label: 'Ara sira' },
];

const SMOKING_OPTIONS: Array<{ value: StarMateDetailSet['smoking']; label: string }> = [
  { value: 'NO', label: 'Hayir' },
  { value: 'SOCIAL', label: 'Sosyal' },
  { value: 'YES', label: 'Evet' },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeTrAscii(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U');
}

function formatSignLabel(value: string): string {
  const normalized = normalizeTrAscii(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function scoreGradient(score: number, colors: ReturnType<typeof useTheme>['colors']): [string, string] {
  if (score >= 80) return [colors.green, '#9BE7B8'];
  if (score >= 65) return [colors.amber, '#FDE68A'];
  return [colors.orange, '#FDBA74'];
}

function scoreChipText(score: number, profile: StarMateProfile): string {
  return `${profile.sunSymbol} ${formatSignLabel(profile.sunSign)} / %${score} Uyum`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (mins < 60) return `${mins} dk`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.round(hours / 24);
  return `${days} g`;
}

function getPrimaryPhoto(profile: StarMateProfile): string | null {
  return profile.photos[0]?.uri ?? null;
}

function draftToPreviewProfile(draft: StarMateProfileDraft): StarMateProfile {
  const photos = draft.photos
    .filter((uri): uri is string => !!uri)
    .map((uri, index) => ({ id: `preview-photo-${index}`, uri, order: index }));

  const previewScore = clamp(Math.round(draft.previewCompatibilityScore), 50, 99);

  const miniSynastryReport: StarMateMiniSynastryReport = {
    summary: `%${previewScore} uyum. Bu kart senin profilinin diger kisilere gorecegi kozmik etiketi simule eder.`,
    whyScore: 'Sun-Moon ritmin ve iliski hedefi sinyallerin iyi hizalaniyor gibi gorunuyor.',
    sparkNote: 'Profil dilin sicak ve net. Bu, yuksek uyumlu eslesmelerde donusumu arttirir.',
    cautionNote: 'Biyografiye biraz daha ozgun bir detay eklemek yanlis pozitif eslesmeleri azaltir.',
    aiInsight: 'Kartin guclu. Bir hobi + bir iliski niyeti + bir mizah satiri donusumde fark yaratir.',
    aspects: [
      { id: 'preview-1', label: 'Profil Enerjisi ✨', note: 'Net ve samimi bir ton yansiyor.', tone: 'HARMONY' },
      { id: 'preview-2', label: 'Niyet Sinyali', note: 'Uzun vade arayanlarla filtre uyumu yuksek.', tone: 'HARMONY' },
      { id: 'preview-3', label: 'Bio Derinligi', note: 'Tek bir ayirt edici detay eklenirse kalite artar.', tone: 'CHALLENGE' },
    ],
  };

  return {
    id: 'preview-self',
    userId: null,
    displayName: draft.displayName || 'Sen',
    age: draft.age,
    gender: 'WOMAN',
    locationLabel: draft.previewLocationLabel,
    distanceKm: 0,
    sunSign: draft.sunSign,
    sunSymbol: draft.sunSymbol,
    element: draft.element,
    compatibilityScore: previewScore,
    bio: draft.bio,
    tags: draft.tags,
    cosmicAutoTags: draft.cosmicAutoTags,
    photos: photos.length ? photos : [{ id: 'preview-fallback', uri: 'https://picsum.photos/seed/preview-fallback/900/1200', order: 0 }],
    details: draft.details,
    miniSynastryReport,
    discoveryEnabled: true,
  };
}

function MetricSlider({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
  colors,
}: {
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const ratio = (value - min) / (max - min || 1);

  const handleTrackPress = (e: any) => {
    const x = e?.nativeEvent?.locationX ?? 0;
    const nextRatio = clamp(x / Math.max(trackWidth, 1), 0, 1);
    const raw = min + nextRatio * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(clamp(snapped, min, max));
  };

  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
        <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 13 }}>{valueLabel}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => onChange(clamp(value - step, min, max))}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={handleTrackPress}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={{ flex: 1, height: 34, justifyContent: 'center' }}
        >
          <View style={{ height: 4, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' }}>
            <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: colors.primary }} />
          </View>
          <View
            style={{
              position: 'absolute',
              left: clamp(ratio * trackWidth - 12, -2, trackWidth - 22),
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
          />
        </Pressable>

        <Pressable
          onPress={() => onChange(clamp(value + step, min, max))}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function RangeSlider({
  label,
  min,
  max,
  low,
  high,
  onChange,
  colors,
}: {
  label: string;
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (next: { low: number; high: number }) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const lowRatio = (low - min) / (max - min || 1);
  const highRatio = (high - min) / (max - min || 1);

  const bumpLow = (delta: number) => onChange({ low: clamp(low + delta, min, high), high });
  const bumpHigh = (delta: number) => onChange({ low, high: clamp(high + delta, low, max) });

  const onTrackPress = (e: any) => {
    const x = e?.nativeEvent?.locationX ?? 0;
    const ratio = clamp(x / Math.max(trackWidth, 1), 0, 1);
    const raw = Math.round(min + ratio * (max - min));
    if (Math.abs(raw - low) < Math.abs(raw - high)) {
      bumpLow(raw - low);
    } else {
      bumpHigh(raw - high);
    }
  };

  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
        <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 13 }}>{`${low} - ${high}`}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => bumpLow(-1)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>-L</Text>
        </Pressable>

        <Pressable onPress={onTrackPress} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)} style={{ flex: 1, height: 34, justifyContent: 'center' }}>
          <View style={{ height: 4, borderRadius: 999, backgroundColor: colors.border }} />
          <View
            style={{
              position: 'absolute',
              left: lowRatio * trackWidth,
              width: Math.max(6, (highRatio - lowRatio) * trackWidth),
              height: 4,
              borderRadius: 999,
              backgroundColor: colors.primary,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: clamp(lowRatio * trackWidth - 10, -2, trackWidth - 20),
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: clamp(highRatio * trackWidth - 10, -2, trackWidth - 20),
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </Pressable>

        <Pressable
          onPress={() => bumpHigh(1)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>H+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  colors,
}: {
  items: Array<{ key: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{
              flex: 1,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
            }}
          >
            <Text style={{ color: active ? colors.white : colors.subtext, fontWeight: '700', fontSize: 13 }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  colors,
}: {
  options: Array<{ value: T; label: string; icon?: string }>;
  value: T;
  onChange: (next: T) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
            }}
          >
            {opt.icon ? <Text>{opt.icon}</Text> : null}
            <Text style={{ color: active ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  tint,
  bg,
  onPress,
  size = 56,
  badge,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  bg: string;
  onPress: () => void;
  size?: number;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled ? 'rgba(0,0,0,0.06)' : bg,
          borderWidth: 1,
          borderColor: disabled ? 'rgba(0,0,0,0.08)' : 'transparent',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Ionicons name={icon} size={size * 0.42} color={disabled ? '#9CA3AF' : tint} />
      </Pressable>
      <Text style={{ fontSize: 11, fontWeight: '700', color: tint }}>{label}</Text>
      {badge ? (
        <View style={{ position: 'absolute', top: -4, right: 0, backgroundColor: tint, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StarParticleField({ visible, colors }: { visible: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  if (!visible) return null;
  const dots = [
    { top: 40, left: 22, size: 4, opacity: 0.7 },
    { top: 72, left: 140, size: 3, opacity: 0.85 },
    { top: 120, right: 24, size: 4, opacity: 0.75 },
    { top: 180, left: 56, size: 2, opacity: 0.9 },
    { top: 240, right: 88, size: 3, opacity: 0.8 },
  ] as const;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {dots.map((dot, i) => (
        <View
          key={`star-${i}`}
          style={{
            position: 'absolute',
            top: dot.top,
            left: 'left' in dot ? dot.left : undefined,
            right: 'right' in dot ? dot.right : undefined,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: colors.white,
            opacity: dot.opacity,
          }}
        />
      ))}
    </View>
  );
}

function ProfileCard({
  profile,
  colors,
  onPressInfo,
  compact = false,
  showInsightButton = true,
}: {
  profile: StarMateProfile;
  colors: ReturnType<typeof useTheme>['colors'];
  onPressInfo?: () => void;
  compact?: boolean;
  showInsightButton?: boolean;
}) {
  const [gradA, gradB] = scoreGradient(profile.compatibilityScore, colors);
  const photoUri = getPrimaryPhoto(profile);

  return (
    <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surface }}>
      {photoUri ? (
        <ImageBackground source={{ uri: photoUri }} resizeMode="cover" style={{ flex: 1 }}>
          <LinearGradient
            colors={['rgba(8,11,26,0.05)', 'rgba(8,11,26,0.20)', 'rgba(8,11,26,0.88)']}
            style={StyleSheet.absoluteFill}
          />
          <StarParticleField visible={profile.compatibilityScore >= 85} colors={colors} />
          <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <LinearGradient colors={[gradA, gradB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '78%' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{scoreChipText(profile.compatibilityScore, profile)}</Text>
            </LinearGradient>
            {profile.premiumSpotlight ? (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Yuksek Eslesme</Text>
              </View>
            ) : null}
          </View>

          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
            <Text style={{ color: '#fff', fontSize: compact ? 22 : 32, fontWeight: '800' }}>{`${profile.displayName}, ${profile.age}`}</Text>
            {!compact ? (
              <Text style={{ color: 'rgba(255,255,255,0.88)', marginTop: 4, fontSize: 13 }}>{`${profile.locationLabel} · ${profile.distanceKm} km`}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingRight: showInsightButton ? 44 : 0 }}>
              {profile.tags.slice(0, compact ? 3 : 5).map((tag) => (
                <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{tag}</Text>
                </View>
              ))}
            </View>
            {!compact ? (
              <Text numberOfLines={2} style={{ color: 'rgba(255,255,255,0.82)', marginTop: 10, fontSize: 12, lineHeight: 16 }}>
                {profile.bio}
              </Text>
            ) : null}
          </View>

          {showInsightButton ? (
            <Pressable
              onPress={onPressInfo}
              style={{
                position: 'absolute',
                right: 14,
                bottom: 14,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.9)',
              }}
            >
              <Ionicons name="information-circle-outline" size={20} color="#111827" />
            </Pressable>
          ) : null}
        </ImageBackground>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.subtext }}>Foto yok</Text>
        </View>
      )}
    </View>
  );
}

type SwipeDeckHandle = {
  swipe: (action: StarMateActionType) => void;
  reset: () => void;
};

const SPRING_RETURN = {
  damping: 16,
  stiffness: 180,
  mass: 0.82,
};

const SPRING_FLY = {
  damping: 14,
  stiffness: 165,
  mass: 0.9,
  overshootClamping: false,
};

const ReanimatedSwipeDeck = React.forwardRef<SwipeDeckHandle, {
  deck: StarMateProfile[];
  discoveryEnabled: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  styles: ReturnType<typeof makeStyles>;
  onOpenInsight: () => void;
  onCommitAction: (action: StarMateActionType) => void;
}>(
  function ReanimatedSwipeDeck(
    {
      deck,
      discoveryEnabled,
      colors,
      styles,
      onOpenInsight,
      onCommitAction,
    },
    ref,
  ) {
    const topCard = deck[0] ?? null;
    const secondCard = deck[1] ?? null;
    const thirdCard = deck[2] ?? null;

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const isAnimatingOut = useSharedValue(0);

    const topCardId = topCard?.id ?? null;

    const resetPosition = useCallback(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      translateX.value = withSpring(0, SPRING_RETURN);
      translateY.value = withSpring(0, SPRING_RETURN);
    }, [translateX, translateY]);

    const hardReset = useCallback(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      translateX.value = 0;
      translateY.value = 0;
      isAnimatingOut.value = 0;
    }, [translateX, translateY, isAnimatingOut]);

    useEffect(() => {
      hardReset();
    }, [topCardId, hardReset]);

    const handleCommitAction = useCallback((action: StarMateActionType) => {
      onCommitAction(action);
    }, [onCommitAction]);

    const flyOut = useCallback((action: StarMateActionType) => {
      if (!topCard || !discoveryEnabled) return;
      if (isAnimatingOut.value) return;

      isAnimatingOut.value = 1;

      const targetX =
        action === 'LIKE'
          ? SCREEN_WIDTH * 1.25
          : action === 'NOPE'
            ? -SCREEN_WIDTH * 1.25
            : 0;
      const targetY =
        action === 'SUPERLIKE'
          ? -SCREEN_HEIGHT * 0.9
          : translateY.value + 36;

      translateY.value = withSpring(targetY, SPRING_FLY);
      translateX.value = withSpring(targetX, SPRING_FLY, (finished) => {
        if (!finished) {
          isAnimatingOut.value = 0;
          return;
        }
        runOnJS(handleCommitAction)(action);
      });
    }, [topCard, discoveryEnabled, translateX, translateY, isAnimatingOut, handleCommitAction]);

    React.useImperativeHandle(ref, () => ({
      swipe: flyOut,
      reset: resetPosition,
    }), [flyOut, resetPosition]);

    const dragPan = useMemo(
      () =>
        Gesture.Pan()
          .enabled(!!topCard && discoveryEnabled)
          .onUpdate((event) => {
            if (isAnimatingOut.value) return;
            translateX.value = event.translationX;
            translateY.value = event.translationY;
          })
          .onEnd((event) => {
            if (!topCard || !discoveryEnabled || isAnimatingOut.value) {
              translateX.value = withSpring(0, SPRING_RETURN);
              translateY.value = withSpring(0, SPRING_RETURN);
              return;
            }

            const shouldSuper = event.translationY < -SWIPE_UP_THRESHOLD && Math.abs(event.translationX) < 140;
            const shouldLike = event.translationX > SWIPE_X_THRESHOLD;
            const shouldNope = event.translationX < -SWIPE_X_THRESHOLD;

            if (shouldSuper) {
              runOnJS(flyOut)('SUPERLIKE');
              return;
            }
            if (shouldLike) {
              runOnJS(flyOut)('LIKE');
              return;
            }
            if (shouldNope) {
              runOnJS(flyOut)('NOPE');
              return;
            }

            translateX.value = withSpring(0, {
              ...SPRING_RETURN,
              velocity: event.velocityX / 1000,
            });
            translateY.value = withSpring(0, {
              ...SPRING_RETURN,
              velocity: event.velocityY / 1000,
            });
          }),
      [topCard, discoveryEnabled, flyOut, translateX, translateY, isAnimatingOut],
    );

    const topCardAnimatedStyle = useAnimatedStyle(() => {
      const rotateDeg = interpolate(
        translateX.value,
        [-SCREEN_WIDTH * 0.5, 0, SCREEN_WIDTH * 0.5],
        [-10, 0, 10],
        Extrapolation.CLAMP,
      );
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotateZ: `${rotateDeg}deg` },
        ],
      };
    });

    const likeBadgeAnimatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [0, 34, 150], [0, 0.25, 1], Extrapolation.CLAMP),
      transform: [
        { rotate: '12deg' },
        {
          scale: interpolate(translateX.value, [0, 140], [0.94, 1.03], Extrapolation.CLAMP),
        },
      ],
    }));

    const nopeBadgeAnimatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [-150, -34, 0], [1, 0.25, 0], Extrapolation.CLAMP),
      transform: [
        { rotate: '-12deg' },
        {
          scale: interpolate(translateX.value, [-140, 0], [1.03, 0.94], Extrapolation.CLAMP),
        },
      ],
    }));

    const superBadgeAnimatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(translateY.value, [-220, -84, 0], [1, 0.35, 0], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(translateY.value, [-200, 0], [1.04, 0.92], Extrapolation.CLAMP),
        },
      ],
    }));

    const secondCardAnimatedStyle = useAnimatedStyle(() => {
      const horizontalProgress = Math.abs(translateX.value) / (SCREEN_WIDTH * 0.9);
      const verticalProgress = Math.max(0, -translateY.value) / (SCREEN_HEIGHT * 0.55);
      const progress = Math.min(1, Math.max(horizontalProgress, verticalProgress));

      return {
        transform: [
          { translateY: interpolate(progress, [0, 1], [10, 0], Extrapolation.CLAMP) },
          { scale: interpolate(progress, [0, 1], [0.9, 1], Extrapolation.CLAMP) },
        ],
        opacity: interpolate(progress, [0, 1], [0.88, 1], Extrapolation.CLAMP),
      };
    });

    const thirdCardAnimatedStyle = useAnimatedStyle(() => {
      const horizontalProgress = Math.abs(translateX.value) / (SCREEN_WIDTH * 0.9);
      const verticalProgress = Math.max(0, -translateY.value) / (SCREEN_HEIGHT * 0.55);
      const progress = Math.min(1, Math.max(horizontalProgress, verticalProgress));

      return {
        transform: [
          { translateY: interpolate(progress, [0, 1], [20, 10], Extrapolation.CLAMP) },
          { scale: interpolate(progress, [0, 1], [0.84, 0.9], Extrapolation.CLAMP) },
        ],
        opacity: interpolate(progress, [0, 1], [0.7, 0.88], Extrapolation.CLAMP),
      };
    });

    return (
      <>
        {thirdCard ? (
          <Reanimated.View style={[styles.deckCardShell, { zIndex: 16 }, thirdCardAnimatedStyle]}>
            <ProfileCard profile={thirdCard} colors={colors} compact showInsightButton={false} />
          </Reanimated.View>
        ) : null}

        {secondCard ? (
          <Reanimated.View style={[styles.deckCardShell, { zIndex: 18 }, secondCardAnimatedStyle]}>
            <ProfileCard profile={secondCard} colors={colors} compact showInsightButton={false} />
          </Reanimated.View>
        ) : null}

        {topCard ? (
          <GestureDetector gesture={dragPan}>
            <Reanimated.View style={[styles.deckCardShell, { zIndex: 20 }, topCardAnimatedStyle]}>
              <ProfileCard profile={topCard} colors={colors} onPressInfo={onOpenInsight} />

              <Reanimated.View style={[styles.swipeBadge, { left: 14, borderColor: '#EF4444' }, nopeBadgeAnimatedStyle]}>
                <Text style={[styles.swipeBadgeText, { color: '#EF4444' }]}>PAS</Text>
              </Reanimated.View>

              <Reanimated.View style={[styles.swipeBadge, { right: 14, borderColor: '#22C55E' }, likeBadgeAnimatedStyle]}>
                <Text style={[styles.swipeBadgeText, { color: '#22C55E' }]}>BEĞEN</Text>
              </Reanimated.View>

              <Reanimated.View style={[styles.swipeBadge, { top: 52, alignSelf: 'center', borderColor: '#38BDF8' }, superBadgeAnimatedStyle]}>
                <Text style={[styles.swipeBadgeText, { color: '#38BDF8' }]}>SUPER STAR</Text>
              </Reanimated.View>
            </Reanimated.View>
          </GestureDetector>
        ) : null}
      </>
    );
  },
);

function MiniSynastryModal({
  visible,
  profile,
  colors,
  onClose,
}: {
  visible: boolean;
  profile: StarMateProfile | null;
  colors: ReturnType<typeof useTheme>['colors'];
  onClose: () => void;
}) {
  if (!profile) return null;
  const [gradA, gradB] = scoreGradient(profile.compatibilityScore, colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => {}}
          style={{
            maxHeight: '78%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: colors.bg,
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: 18,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 42, height: 4, borderRadius: 999, backgroundColor: colors.border, marginBottom: 12 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Mini Synastry Raporu</Text>
              <Text style={{ color: colors.subtext, marginTop: 4 }}>{`${profile.displayName} ile neden %${profile.compatibilityScore}?`}</Text>
            </View>
            <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <LinearGradient colors={[gradA, gradB]} style={{ marginTop: 14, borderRadius: 16, padding: 14 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{scoreChipText(profile.compatibilityScore, profile)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.94)', marginTop: 6, lineHeight: 18 }}>{profile.miniSynastryReport.summary}</Text>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 14 }}>
            <InsightBlock title="Neden bu skor?" body={profile.miniSynastryReport.whyScore} colors={colors} />
            <InsightBlock title="Romantik kıvılcım" body={profile.miniSynastryReport.sparkNote} colors={colors} tone="good" />
            <InsightBlock title="Iletisimde dikkat" body={profile.miniSynastryReport.cautionNote} colors={colors} tone="warn" />
            <InsightBlock title="AI yorum" body={profile.miniSynastryReport.aiInsight} colors={colors} />

            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 8, marginBottom: 8, fontSize: 14 }}>Aspekt Ozetleri</Text>
            {profile.miniSynastryReport.aspects.map((asp) => (
              <View
                key={asp.id}
                style={{
                  backgroundColor: asp.tone === 'HARMONY' ? colors.successBg : colors.warningBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: asp.tone === 'HARMONY' ? colors.greenBg : colors.orangeBg,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{asp.label}</Text>
                <Text style={{ color: colors.subtext, fontSize: 12, lineHeight: 17, marginTop: 4 }}>{asp.note}</Text>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InsightBlock({
  title,
  body,
  colors,
  tone,
}: {
  title: string;
  body: string;
  colors: ReturnType<typeof useTheme>['colors'];
  tone?: 'good' | 'warn';
}) {
  const bg = tone === 'good' ? colors.successBg : tone === 'warn' ? colors.warningBg : colors.surface;
  const border = tone === 'good' ? colors.greenBg : tone === 'warn' ? colors.orangeBg : colors.border;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 12, marginBottom: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{title}</Text>
      <Text style={{ color: colors.subtext, marginTop: 4, fontSize: 12, lineHeight: 18 }}>{body}</Text>
    </View>
  );
}

function MatchCelebrationModal({
  visible,
  match,
  viewerAvatarUri,
  viewerLabel,
  colors,
  onClose,
  onOpenChat,
}: {
  visible: boolean;
  match: StarMateMatch | null;
  viewerAvatarUri?: string | null;
  viewerLabel?: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onClose: () => void;
  onOpenChat: (matchId: string) => void;
}) {
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const cardTranslateY = useSharedValue(28);
  const glowOpacity = useSharedValue(0);
  const leftAvatarX = useSharedValue(-130);
  const rightAvatarX = useSharedValue(130);
  const avatarScale = useSharedValue(0.82);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible || !match) return;

    backdropOpacity.value = 0;
    cardScale.value = 0.92;
    cardTranslateY.value = 28;
    glowOpacity.value = 0;
    leftAvatarX.value = -130;
    rightAvatarX.value = 130;
    avatarScale.value = 0.82;
    contentOpacity.value = 0;

    backdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    cardTranslateY.value = withSpring(0, { damping: 17, stiffness: 170, mass: 0.9 });
    cardScale.value = withSpring(1, { damping: 16, stiffness: 190, mass: 0.9 });
    glowOpacity.value = withDelay(40, withTiming(1, { duration: 320 }));
    leftAvatarX.value = withDelay(90, withSpring(-44, { damping: 13, stiffness: 210, mass: 0.75 }));
    rightAvatarX.value = withDelay(90, withSpring(44, { damping: 13, stiffness: 210, mass: 0.75 }));
    avatarScale.value = withDelay(
      90,
      withSequence(
        withSpring(1.07, { damping: 10, stiffness: 240, mass: 0.7 }),
        withSpring(1, { damping: 14, stiffness: 210, mass: 0.75 }),
      ),
    );
    contentOpacity.value = withDelay(120, withTiming(1, { duration: 260 }));
  }, [visible, match, backdropOpacity, cardScale, cardTranslateY, glowOpacity, leftAvatarX, rightAvatarX, avatarScale, contentOpacity]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateY: cardTranslateY.value },
      { scale: cardScale.value },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) }],
  }));

  const leftAvatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftAvatarX.value }, { scale: avatarScale.value }],
  }));

  const rightAvatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightAvatarX.value }, { scale: avatarScale.value }],
  }));

  if (!match) return null;

  const viewerInitial = (viewerLabel ?? 'Sen').trim().charAt(0).toUpperCase() || 'S';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Reanimated.View style={[{ flex: 1, backgroundColor: 'rgba(8,10,23,0.88)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, backdropAnimatedStyle]}>
        <View style={{ width: '100%', maxWidth: 420, alignItems: 'center' }}>
          <Reanimated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: -10,
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: 'rgba(168,85,247,0.18)',
              },
              glowAnimatedStyle,
            ]}
          />

          <View style={{ height: 110, justifyContent: 'center', alignItems: 'center' }}>
            <Reanimated.View style={[{ position: 'absolute' }, leftAvatarAnimatedStyle]}>
              <View style={{ width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: '#1F2937', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                {viewerAvatarUri ? (
                  <Image source={{ uri: viewerAvatarUri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>{viewerInitial}</Text>
                )}
              </View>
            </Reanimated.View>

            <Reanimated.View style={[{ position: 'absolute' }, rightAvatarAnimatedStyle]}>
              <View style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: 'rgba(255,255,255,0.95)', backgroundColor: '#111827', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                {match.photoUri ? (
                  <Image source={{ uri: match.photoUri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>{(match.displayName ?? 'M').charAt(0).toUpperCase()}</Text>
                )}
              </View>
            </Reanimated.View>

            <Reanimated.View style={[{ position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(34,197,94,0.22)', alignItems: 'center', justifyContent: 'center' }, glowAnimatedStyle]}>
              <Ionicons name="sparkles" size={18} color="#DCFCE7" />
            </Reanimated.View>
          </View>

          <Reanimated.View style={[{ width: '100%' }, cardAnimatedStyle]}>
            <LinearGradient
              colors={['rgba(168,85,247,0.28)', 'rgba(34,197,94,0.16)', 'rgba(13,18,34,0.94)']}
              style={{
                width: '100%',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                padding: 20,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.28,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 12 },
                elevation: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 29, fontWeight: '900' }}>It’s a Match!</Text>
              <Text style={{ color: 'rgba(255,255,255,0.86)', marginTop: 8, textAlign: 'center' }}>{`${match.displayName} ile karsilikli begeni olustu.`}</Text>
              <View style={{ marginTop: 16, flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{`${match.sunSymbol} ${match.sunSign}`}</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(34,197,94,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: '#DCFCE7', fontWeight: '800' }}>{`%${match.compatibilityScore} Uyum`}</Text>
                </View>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 12, lineHeight: 18 }}>{match.icebreaker}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' }}>
                <Pressable onPress={onClose} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Sonra</Text>
                </Pressable>
                <Pressable onPress={() => onOpenChat(match.id)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Mesaja Basla</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Reanimated.View>
        </View>
      </Reanimated.View>
    </Modal>
  );
}

function ChatModal({
  visible,
  match,
  messages,
  composer,
  onChangeComposer,
  onSend,
  onClose,
  colors,
}: {
  visible: boolean;
  match: StarMateMatch | null;
  messages: StarMateChatMessage[];
  composer: string;
  onChangeComposer: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible]);

  if (!match) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen edges={['top', 'left', 'right', 'bottom']} style={{ backgroundColor: colors.bg }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
            <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{match.displayName}</Text>
              <Text style={{ color: colors.subtext, fontSize: 12 }}>{`${match.sunSymbol} ${match.sunSign} · %${match.compatibilityScore} Uyum`}</Text>
            </View>
            <View style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 11 }}>Cosmic Chat</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            <View style={{ backgroundColor: colors.primarySoft, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.primarySoftBg, marginBottom: 14 }}>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12, marginBottom: 4 }}>Cosmic Icebreaker</Text>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>{match.icebreaker}</Text>
            </View>

            {messages.map((message) => {
              const isSelf = message.role === 'self';
              const isSystem = message.role === 'system';
              return (
                <View key={message.id} style={{ marginBottom: 10, alignItems: isSystem ? 'center' : isSelf ? 'flex-end' : 'flex-start' }}>
                  <View
                    style={{
                      maxWidth: '84%',
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSystem ? colors.surface : isSelf ? colors.primary : colors.surface,
                      borderWidth: isSystem ? 1 : 0,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: isSystem ? colors.subtext : isSelf ? colors.white : colors.text, fontSize: 13, lineHeight: 18 }}>
                      {message.text}
                    </Text>
                  </View>
                  <Text style={{ color: colors.subtext, fontSize: 10, marginTop: 4 }}>{relativeTime(message.sentAt)}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <TextInput
                ref={inputRef}
                value={composer}
                onChangeText={onChangeComposer}
                placeholder="Mesaj yaz..."
                placeholderTextColor={colors.subtext}
                multiline
                style={{
                  flex: 1,
                  minHeight: 42,
                  maxHeight: 110,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                }}
              />
              <Pressable
                onPress={onSend}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                }}
              >
                <Ionicons name="send" size={18} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeScreen>
    </Modal>
  );
}

export default function StarMateTabScreen() {
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const chart = useNatalChartStore((s) => s.chart);

  const activeSection = useStarMateStore((s) => s.activeSection);
  const matchesTab = useStarMateStore((s) => s.matchesTab);
  const profileTab = useStarMateStore((s) => s.profileTab);
  const filters = useStarMateStore((s) => s.filters);
  const deck = useStarMateStore((s) => s.deck);
  const history = useStarMateStore((s) => s.history);
  const likesYou = useStarMateStore((s) => s.likesYou);
  const matches = useStarMateStore((s) => s.matches);
  const chats = useStarMateStore((s) => s.chats);
  const activeChatMatchId = useStarMateStore((s) => s.activeChatMatchId);
  const chatComposer = useStarMateStore((s) => s.chatComposer);
  const insightProfileId = useStarMateStore((s) => s.insightProfileId);
  const allCandidates = useStarMateStore((s) => s.allCandidates);
  const myProfileDraft = useStarMateStore((s) => s.myProfileDraft);
  const showMatchCelebration = useStarMateStore((s) => s.showMatchCelebration);
  const lastMatchCelebration = useStarMateStore((s) => s.lastMatchCelebration);
  const lastSavedAt = useStarMateStore((s) => s.lastSavedAt);
  const isPremium = useStarMateStore((s) => s.isPremium);
  const likesPreviewUnlocked = useStarMateStore((s) => s.likesPreviewUnlocked);
  const profileEditHint = useStarMateStore((s) => s.profileEditHint);

  const initialize = useStarMateStore((s) => s.initialize);
  const setSection = useStarMateStore((s) => s.setSection);
  const setMatchesTab = useStarMateStore((s) => s.setMatchesTab);
  const setProfileTab = useStarMateStore((s) => s.setProfileTab);
  const updateFilters = useStarMateStore((s) => s.updateFilters);
  const actOnTopCard = useStarMateStore((s) => s.actOnTopCard);
  const rewindLastAction = useStarMateStore((s) => s.rewindLastAction);
  const openInsight = useStarMateStore((s) => s.openInsight);
  const closeInsight = useStarMateStore((s) => s.closeInsight);
  const dismissMatchCelebration = useStarMateStore((s) => s.dismissMatchCelebration);
  const openChat = useStarMateStore((s) => s.openChat);
  const closeChat = useStarMateStore((s) => s.closeChat);
  const setChatComposer = useStarMateStore((s) => s.setChatComposer);
  const sendChatMessage = useStarMateStore((s) => s.sendChatMessage);
  const updateProfileDraft = useStarMateStore((s) => s.updateProfileDraft);
  const updateProfileDetails = useStarMateStore((s) => s.updateProfileDetails);
  const toggleInterestTag = useStarMateStore((s) => s.toggleInterestTag);
  const toggleCosmicAutoTag = useStarMateStore((s) => s.toggleCosmicAutoTag);
  const setCosmicAutoTags = useStarMateStore((s) => s.setCosmicAutoTags);
  const cyclePhotoSlot = useStarMateStore((s) => s.cyclePhotoSlot);
  const removePhotoSlot = useStarMateStore((s) => s.removePhotoSlot);
  const swapPhotoSlots = useStarMateStore((s) => s.swapPhotoSlots);
  const saveProfileDraftLocal = useStarMateStore((s) => s.saveProfileDraftLocal);
  const unlockLikesPreview = useStarMateStore((s) => s.unlockLikesPreview);

  const [selectedPhotoSlot, setSelectedPhotoSlot] = useState<number | null>(null);

  const topCard = deck[0] ?? null;
  const insightProfile = useMemo(
    () => allCandidates.find((profile) => profile.id === insightProfileId) ?? null,
    [allCandidates, insightProfileId],
  );

  const activeChatMatch = useMemo(
    () => matches.find((match) => match.id === activeChatMatchId) ?? null,
    [matches, activeChatMatchId],
  );
  const activeChatMessages = activeChatMatch ? chats[activeChatMatch.id]?.messages ?? [] : [];
  const previewProfile = useMemo(() => draftToPreviewProfile(myProfileDraft), [myProfileDraft]);

  useEffect(() => {
    initialize({
      name: user?.name ?? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
      birthDate: user?.birthDate,
      zodiacSign: user?.zodiacSign,
      sunSign: chart?.sunSign,
      moonSign: chart?.moonSign,
      risingSign: chart?.risingSign,
    });
  }, [initialize, user?.name, user?.firstName, user?.lastName, user?.birthDate, user?.zodiacSign, chart?.sunSign, chart?.moonSign, chart?.risingSign]);

  useEffect(() => {
    const tags = suggestCosmicAutoTags({ sunSign: chart?.sunSign, moonSign: chart?.moonSign, risingSign: chart?.risingSign });
    if (tags.length) {
      setCosmicAutoTags(tags.slice(0, 3));
    }
  }, [chart?.sunSign, chart?.moonSign, chart?.risingSign, setCosmicAutoTags]);

  useEffect(() => {
    if (showMatchCelebration) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [showMatchCelebration]);
  const swipeDeckRef = useRef<SwipeDeckHandle | null>(null);

  const commitAction = useCallback(
    async (action: StarMateActionType) => {
      if (action === 'NOPE') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (action === 'SUPERLIKE') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      actOnTopCard(action);
    },
    [actOnTopCard],
  );

  const onDeckCommitAction = useCallback((action: StarMateActionType) => {
    void commitAction(action);
  }, [commitAction]);

  const summaryCards = useMemo(() => {
    const avg = deck.length
      ? Math.round(deck.reduce((sum, p) => sum + p.compatibilityScore, 0) / deck.length)
      : 0;
    const high = deck.filter((p) => p.compatibilityScore >= 80).length;
    return [
      { label: 'Kuyruk', value: String(deck.length), icon: 'layers-outline' as const },
      { label: 'Ort. Uyum', value: deck.length ? `%${avg}` : '-', icon: 'pulse-outline' as const },
      { label: 'Yuksek', value: String(high), icon: 'star-outline' as const },
    ];
  }, [deck]);

  const onPressAction = useCallback(
    (action: StarMateActionType) => {
      if (!topCard) return;
      swipeDeckRef.current?.swipe(action);
    },
    [topCard],
  );

  const onPressRewind = useCallback(async () => {
    if (!history.length) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeDeckRef.current?.reset();
    rewindLastAction();
  }, [history.length, rewindLastAction]);

  const onOpenInsight = useCallback(() => {
    if (!topCard) return;
    void Haptics.selectionAsync();
    openInsight(topCard.id);
  }, [topCard, openInsight]);

  const onOpenChatFromMatchCelebration = useCallback(
    (matchId: string) => {
      dismissMatchCelebration();
      openChat(matchId);
      setSection('MATCHES');
    },
    [dismissMatchCelebration, openChat, setSection],
  );

  const onSendChat = useCallback(async () => {
    await Haptics.selectionAsync();
    sendChatMessage();
  }, [sendChatMessage]);

  const onSaveProfile = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveProfileDraftLocal();
  }, [saveProfileDraftLocal]);

  const handlePhotoSlotPress = useCallback(
    (index: number) => {
      const slotFilled = !!myProfileDraft.photos[index];
      if (selectedPhotoSlot !== null && selectedPhotoSlot !== index) {
        swapPhotoSlots(selectedPhotoSlot, index);
        setSelectedPhotoSlot(null);
        void Haptics.selectionAsync();
        return;
      }
      if (slotFilled) {
        setSelectedPhotoSlot((prev) => (prev === index ? null : index));
        void Haptics.selectionAsync();
        return;
      }
      cyclePhotoSlot(index);
      setSelectedPhotoSlot(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [myProfileDraft.photos, selectedPhotoSlot, swapPhotoSlots, cyclePhotoSlot],
  );

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const renderDiscoverSection = () => {
    return (
      <Reanimated.View entering={FadeIn.duration(220)} style={{ paddingBottom: 16 }}>
        <View style={styles.metricsRow}>
          {summaryCards.map((card) => (
            <View key={card.label} style={styles.metricCard}>
              <Ionicons name={card.icon} size={16} color={colors.primary} />
              <Text style={styles.metricValue}>{card.value}</Text>
              <Text style={styles.metricLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {!filters.discoveryEnabled ? (
          <View style={styles.disabledDiscoveryCard}>
            <Ionicons name="eye-off-outline" size={30} color={colors.primary} />
            <Text style={styles.disabledTitle}>Kesfet kapali</Text>
            <Text style={styles.disabledBody}>
              Profilin stack icinden aninda gizlendi. Ayarlar sekmesinden tekrar etkinlestirebilirsin.
            </Text>
            <Pressable
              onPress={() => {
                updateFilters({ discoveryEnabled: true });
                void Haptics.selectionAsync();
              }}
              style={styles.primaryPillButton}
            >
              <Text style={styles.primaryPillText}>Kesfeti Ac</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <View style={styles.deckStage}>
              <ReanimatedSwipeDeck
                ref={swipeDeckRef}
                deck={deck}
                discoveryEnabled={filters.discoveryEnabled}
                colors={colors}
                styles={styles}
                onOpenInsight={onOpenInsight}
                onCommitAction={onDeckCommitAction}
              />

              {deck.length === 0 ? (
                <View style={styles.deckEmptyOverlay}>
                  <Ionicons name="sparkles-outline" size={34} color={colors.primary} />
                  <Text style={styles.deckEmptyTitle}>Kuyruk bitti</Text>
                  <Text style={styles.deckEmptyText}>
                    Filtreleri genislet ya da minimum uyum eşiğini dusur. Arka planda yeni synastry kuyruğu hazırlanabilir.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Pressable onPress={() => setSection('SETTINGS')} style={styles.secondaryPillButton}>
                      <Text style={styles.secondaryPillText}>Filtreler</Text>
                    </Pressable>
                    <Pressable onPress={() => updateFilters({ minCompatibilityScore: Math.max(50, filters.minCompatibilityScore - 10) })} style={styles.primaryPillButton}>
                      <Text style={styles.primaryPillText}>Skoru Dusur</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.actionRail}>
              <ActionButton
                icon="arrow-undo"
                label="Rewind"
                tint={colors.amber}
                bg={colors.amberLight}
                onPress={onPressRewind}
                badge={isPremium ? undefined : 'PRO'}
                disabled={!history.length}
                size={52}
              />
              <ActionButton icon="close" label="Nope" tint="#EF4444" bg="#FEE2E2" onPress={() => onPressAction('NOPE')} />
              <ActionButton icon="star" label="Super" tint="#0EA5E9" bg="#E0F2FE" onPress={() => onPressAction('SUPERLIKE')} size={64} />
              <ActionButton icon="heart" label="Like" tint="#10B981" bg="#DCFCE7" onPress={() => onPressAction('LIKE')} />
            </View>

            <View style={styles.deckHintCard}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.deckHintText}>
                Karti saga/sola kaydirabilir veya yukari iterek Super Star kullanabilirsin. Bilgi (i) mini synastry raporunu acar.
              </Text>
            </View>
          </View>
        )}
      </Reanimated.View>
    );
  };

  const renderSettingsSection = () => {
    return (
      <Reanimated.View entering={FadeIn.duration(220)} style={{ paddingBottom: 20 }}>
        <View style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.panelTitle}>Kesfet'i Etkinlestir</Text>
            <Switch
              value={filters.discoveryEnabled}
              onValueChange={(value) => {
                updateFilters({ discoveryEnabled: value });
                void Haptics.selectionAsync();
              }}
              trackColor={{ false: colors.switchTrack, true: colors.primarySoft }}
              thumbColor={filters.discoveryEnabled ? colors.primary : colors.white}
            />
          </View>
          <Text style={styles.panelDescription}>
            Kapandiginda profilin aninda kart destesi dışından gizlenir. Mevcut eslesmeler ve sohbetler gorunmeye devam eder.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Kesfetme Ayarlari</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingsRowBlock}>
              <Text style={styles.settingsLabel}>Konum</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.settingsValue}>{filters.locationLabel}</Text>
                <Ionicons name="refresh" size={16} color={colors.subtext} />
              </View>
            </View>

            <MetricSlider
              label="Mesafe Tercihi"
              valueLabel={`${filters.maxDistanceKm} km`}
              value={filters.maxDistanceKm}
              min={5}
              max={100}
              step={1}
              onChange={(value) => updateFilters({ maxDistanceKm: value })}
              colors={colors}
            />
            <View style={styles.inlineToggleRow}>
              <Text style={styles.inlineToggleText}>Sadece bu araliktaki kisileri goster</Text>
              <Switch
                value={filters.distanceStrict}
                onValueChange={(value) => updateFilters({ distanceStrict: value })}
                trackColor={{ false: colors.switchTrack, true: colors.primarySoft }}
                thumbColor={filters.distanceStrict ? colors.primary : colors.white}
              />
            </View>

            <RangeSlider
              label="Yas Tercihi"
              min={18}
              max={60}
              low={filters.ageMin}
              high={filters.ageMax}
              onChange={({ low, high }) => updateFilters({ ageMin: low, ageMax: high })}
              colors={colors}
            />
            <View style={styles.inlineToggleRow}>
              <Text style={styles.inlineToggleText}>Sadece bu araliktaki kisileri goster</Text>
              <Switch
                value={filters.ageStrict}
                onValueChange={(value) => updateFilters({ ageStrict: value })}
                trackColor={{ false: colors.switchTrack, true: colors.primarySoft }}
                thumbColor={filters.ageStrict ? colors.primary : colors.white}
              />
            </View>

            <View style={styles.divider} />
            <Text style={styles.settingsLabel}>Aradigim Sey</Text>
            <ChoiceChips options={SHOW_ME_OPTIONS} value={filters.showMe} onChange={(value) => updateFilters({ showMe: value })} colors={colors} />

            <MetricSlider
              label="Minimum Uyum"
              valueLabel={`>%${filters.minCompatibilityScore}`}
              value={filters.minCompatibilityScore}
              min={50}
              max={95}
              step={1}
              onChange={(value) => updateFilters({ minCompatibilityScore: value })}
              colors={colors}
            />

            <Text style={[styles.settingsLabel, { marginTop: 16 }]}>Element Filtre (Faz 2 Hazir)</Text>
            <ChoiceChips options={ELEMENT_OPTIONS} value={filters.elementalPreference} onChange={(value) => updateFilters({ elementalPreference: value })} colors={colors} />

            <View style={styles.inlineToggleRow}>
              <Text style={styles.inlineToggleText}>Bildirimler</Text>
              <Switch
                value={filters.notificationsEnabled}
                onValueChange={(value) => updateFilters({ notificationsEnabled: value })}
                trackColor={{ false: colors.switchTrack, true: colors.primarySoft }}
                thumbColor={filters.notificationsEnabled ? colors.primary : colors.white}
              />
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Gizlilik ve Kuyruk Mimarisi</Text>
          <View style={styles.archCard}>
            <Text style={styles.archTitle}>Synastry Queue Akisi</Text>
            <Text style={styles.archBody}>
              Uygulama acilisinda ve filtre degisimlerinde, geo + yas kriterlerine uyan adaylar icin synastry hesaplari arka planda kuyruğa alinmis kabul edilir. UI yalnizca pre-calculated adaylari gosterir.
            </Text>
            <Text style={styles.archBody}>
              Anlik `Kesfet` kapatma, discovery feed sorgularini ve kart gorunumunu client tarafinda hemen keser. Sunucu tarafinda `discoveryEnabled=false` durumu yazilmalidir.
            </Text>
          </View>
          <Pressable style={styles.dangerRow}>
            <Ionicons name="trash-outline" size={18} color={colors.redBright} />
            <Text style={styles.dangerText}>Ruh Esi Hesabimi Sil (placeholder)</Text>
          </Pressable>
        </View>
      </Reanimated.View>
    );
  };

  const renderProfileSection = () => {
    return (
      <Reanimated.View entering={FadeIn.duration(220)} style={{ paddingBottom: 24 }}>
        <View style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.panelTitle}>Bilgileri duzenle</Text>
            <Pressable onPress={onSaveProfile} style={styles.textActionBtn}>
              <Text style={styles.textActionBtnText}>Kaydet</Text>
            </Pressable>
          </View>
          <SegmentedControl items={PROFILE_MODE_ITEMS} value={profileTab} onChange={setProfileTab} colors={colors} />
          {profileEditHint ? <Text style={styles.helperText}>{profileEditHint}</Text> : null}
          {lastSavedAt ? <Text style={styles.helperText}>{`Son kayit: ${relativeTime(lastSavedAt)} once`}</Text> : null}
        </View>

        {profileTab === 'EDIT' ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Fotograflar (3x3 grid)</Text>
              <Text style={styles.panelDescription}>
                Slot'a dokun: foto ekle/degistir. Dolu bir slota dokunup sonra baska slota dokun: yer degistir (drag-drop fallback).
              </Text>
              <View style={styles.photoGrid}>
                {myProfileDraft.photos.map((uri, index) => {
                  const selected = selectedPhotoSlot === index;
                  return (
                    <Pressable
                      key={`slot-${index}`}
                      onPress={() => handlePhotoSlotPress(index)}
                      style={[styles.photoSlot, selected && { borderColor: colors.primary, borderWidth: 2 }]}
                    >
                      {uri ? (
                        <>
                          <Image source={{ uri }} style={styles.photoSlotImage} />
                          <View style={styles.photoSlotOverlayTop}>
                            <Text style={styles.photoSlotIndex}>{index + 1}</Text>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                removePhotoSlot(index);
                                setSelectedPhotoSlot(null);
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }}
                              style={styles.photoRemoveBtn}
                            >
                              <Ionicons name="close" size={14} color="#111827" />
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="add-circle" size={28} color={colors.subtext} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Kim bu {myProfileDraft.displayName}</Text>
              <TextInput
                value={myProfileDraft.bio}
                onChangeText={(bio) => updateProfileDraft({ bio })}
                multiline
                placeholder="Hakkinda kisa ama karakterli bir paragraf..."
                placeholderTextColor={colors.subtext}
                style={styles.bioInput}
              />
              <Text style={styles.panelDescription}>Sosyal medya kullanici adi / iletisim bilgisi paylasma.</Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Ilgi Alanlari</Text>
              <Text style={styles.panelDescription}>Maksimum 10 etiket.</Text>
              <View style={styles.tagWrap}>
                {INTEREST_TAG_OPTIONS.map((tag) => {
                  const active = myProfileDraft.tags.includes(tag);
                  return (
                    <Pressable key={tag} onPress={() => toggleInterestTag(tag)} style={[styles.tagChip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      <Text style={[styles.tagChipText, active && { color: colors.white }]}>{tag}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.settingsLabel, { marginTop: 14 }]}>Kozmik Oto-Etiketler</Text>
              <Text style={styles.panelDescription}>Natal chart'a gore otomatik onerilir. Ac/kapat yapabilirsin.</Text>
              <View style={styles.tagWrap}>
                {myProfileDraft.cosmicAutoTags.map((tag) => {
                  const active = myProfileDraft.cosmicAutoTags.includes(tag);
                  return (
                    <Pressable
                      key={`auto-${tag}`}
                      onPress={() => toggleCosmicAutoTag(tag)}
                      style={[styles.tagChip, { backgroundColor: colors.primarySoft, borderColor: colors.primarySoftBg }, active && { borderColor: colors.primary }]}
                    >
                      <Text style={[styles.tagChipText, { color: colors.primary }]}>{tag}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Detaylar</Text>
              <View style={styles.detailRow}>
                <Text style={styles.settingsLabel}>Boy</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={() => updateProfileDetails({ heightCm: Math.max(140, (myProfileDraft.details.heightCm ?? 170) - 1) })} style={styles.detailStepBtn}><Ionicons name="remove" size={14} color={colors.text} /></Pressable>
                  <Text style={styles.settingsValue}>{`${myProfileDraft.details.heightCm ?? '-'} cm`}</Text>
                  <Pressable onPress={() => updateProfileDetails({ heightCm: Math.min(210, (myProfileDraft.details.heightCm ?? 170) + 1) })} style={styles.detailStepBtn}><Ionicons name="add" size={14} color={colors.text} /></Pressable>
                </View>
              </View>
              <Text style={styles.settingsLabel}>Egzersiz</Text>
              <ChoiceChips options={EXERCISE_OPTIONS.map((o) => ({ ...o }))} value={myProfileDraft.details.exercise} onChange={(value) => updateProfileDetails({ exercise: value })} colors={colors} />
              <Text style={[styles.settingsLabel, { marginTop: 12 }]}>Icki</Text>
              <ChoiceChips options={DRINKING_OPTIONS.map((o) => ({ ...o }))} value={myProfileDraft.details.drinking} onChange={(value) => updateProfileDetails({ drinking: value })} colors={colors} />
              <Text style={[styles.settingsLabel, { marginTop: 12 }]}>Sigara</Text>
              <ChoiceChips options={SMOKING_OPTIONS.map((o) => ({ ...o }))} value={myProfileDraft.details.smoking} onChange={(value) => updateProfileDetails({ smoking: value })} colors={colors} />
            </View>
          </>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Kart On Izleme</Text>
            <Text style={styles.panelDescription}>Diger kullanicilarin gorecegi kartın kozmik badge + etiket görünümü.</Text>
            <View style={{ height: DECK_CARD_HEIGHT * 0.88, marginTop: 10 }}>
              <ProfileCard profile={previewProfile} colors={colors} compact={false} showInsightButton={false} />
            </View>
          </View>
        )}
      </Reanimated.View>
    );
  };

  const renderMatchesSection = () => {
    return (
      <Reanimated.View entering={FadeIn.duration(220)} style={{ paddingBottom: 20 }}>
        <View style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.panelTitle}>Baglantilar</Text>
            <Pressable
              onPress={() => {
                unlockLikesPreview();
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              style={styles.textActionBtn}
            >
              <Text style={styles.textActionBtnText}>{likesPreviewUnlocked ? 'Premium Acik' : 'Premium Ac'}</Text>
            </Pressable>
          </View>
          <SegmentedControl items={MATCH_TAB_ITEMS} value={matchesTab} onChange={setMatchesTab} colors={colors} />
        </View>

        {matchesTab === 'LIKES_YOU' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{`Seni begeniyor (${likesYou.length})`}</Text>
            <View style={styles.likesGrid}>
              {likesYou.length ? (
                likesYou.map((profile) => (
                  <Pressable key={`like-${profile.id}`} onPress={() => openInsight(profile.id)} style={styles.likeTile}>
                    <ImageBackground source={{ uri: getPrimaryPhoto(profile) ?? 'https://picsum.photos/seed/likes-fallback/900/1200' }} resizeMode="cover" style={{ flex: 1 }} imageStyle={{ borderRadius: 16 }} blurRadius={likesPreviewUnlocked ? 0 : 18}>
                      {!likesPreviewUnlocked ? <View style={styles.likeTileBlurOverlay} /> : null}
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
                      <View style={styles.likeTileFooter}>
                        <Text style={styles.likeTileTitle}>{likesPreviewUnlocked ? `${profile.displayName}, ${profile.age}` : 'Gizli Profil'}</Text>
                        <Text style={styles.likeTileSubtitle}>{likesPreviewUnlocked ? `%${profile.compatibilityScore} Uyum` : 'Premium ile ac'}</Text>
                      </View>
                      {!likesPreviewUnlocked ? (
                        <View style={styles.likeTileLockBubble}>
                          <Ionicons name="lock-closed" size={15} color="#fff" />
                        </View>
                      ) : null}
                    </ImageBackground>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyStateCard}>
                  <Ionicons name="heart-outline" size={24} color={colors.primary} />
                  <Text style={styles.emptyStateTitle}>Henuz begeni yok</Text>
                  <Text style={styles.emptyStateBody}>Kesfet deck'inde aktif kaldikca seni begenenler burada gorunecek.</Text>
                </View>
              )}
            </View>
            {!likesPreviewUnlocked && likesYou.length > 0 ? (
              <Pressable
                onPress={() => {
                  unlockLikesPreview();
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={[styles.primaryPillButton, { alignSelf: 'center', marginTop: 10 }]}
              >
                <Text style={styles.primaryPillText}>Premium ile Profilleri Ac</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Yeni Eslesmeler</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {matches.length ? (
                  matches.map((match) => (
                    <Pressable key={`match-pill-${match.id}`} onPress={() => openChat(match.id)} style={styles.matchPillCard}>
                      {match.photoUri ? (
                        <Image source={{ uri: match.photoUri }} style={styles.matchPillImage} />
                      ) : (
                        <View style={[styles.matchPillImage, { backgroundColor: colors.surfaceMuted }]} />
                      )}
                      <View style={{ marginTop: 6, alignItems: 'center' }}>
                        <Text style={styles.matchPillName} numberOfLines={1}>{match.displayName}</Text>
                        <Text style={styles.matchPillScore}>{`%${match.compatibilityScore}`}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateTitle}>Henuz eslesme yok</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Sohbetler</Text>
              {matches.length ? (
                <View style={{ gap: 10 }}>
                  {matches.map((match) => (
                    <Pressable key={`chat-row-${match.id}`} onPress={() => openChat(match.id)} style={styles.chatRow}>
                      {match.photoUri ? <Image source={{ uri: match.photoUri }} style={styles.chatAvatar} /> : <View style={[styles.chatAvatar, { backgroundColor: colors.surfaceMuted }]} />}
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.chatName}>{match.displayName}</Text>
                          <Text style={styles.chatMeta}>{relativeTime(match.lastMessageAt)}</Text>
                        </View>
                        <Text style={styles.chatSubtitle} numberOfLines={1}>{match.lastMessage}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <View style={styles.chatScoreBadge}><Text style={styles.chatScoreText}>{`%${match.compatibilityScore}`}</Text></View>
                          {match.superLikeByMe ? (
                            <View style={[styles.chatScoreBadge, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.chatScoreText, { color: '#0369A1' }]}>Super Star</Text></View>
                          ) : null}
                        </View>
                      </View>
                      {match.unreadCount > 0 ? (
                        <View style={styles.unreadDot}><Text style={styles.unreadText}>{match.unreadCount}</Text></View>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyStateCard}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
                  <Text style={styles.emptyStateTitle}>Mesajlasma burada baslayacak</Text>
                  <Text style={styles.emptyStateBody}>Mutual like olunca AI icebreaker ile sohbet acilir.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </Reanimated.View>
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'DISCOVER':
        return renderDiscoverSection();
      case 'MATCHES':
        return renderMatchesSection();
      case 'PROFILE':
        return renderProfileSection();
      case 'SETTINGS':
        return renderSettingsSection();
      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={isDark ? [colors.background, colors.bgGrad1, colors.background] : [colors.bgGrad1, colors.background, colors.bg]} style={{ flex: 1 }}>
      <SafeScreen edges={['top', 'left', 'right']} style={{ backgroundColor: 'transparent' }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Yildiz Esi</Text>
            <Text style={styles.headerTitle}>Kozmik uyumla kesfet</Text>
            <Text style={styles.headerSubtitle}>Synastry skoru odakli eslesme ve sohbet deneyimi</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => setSection('SETTINGS')} style={styles.headerIconBtn}>
              <Ionicons name="moon-outline" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionDock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {SECTION_ITEMS.map((item) => {
              const active = item.key === activeSection;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setSection(item.key);
                    void Haptics.selectionAsync();
                  }}
                  style={[styles.sectionDockItem, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Ionicons name={item.icon} size={16} color={active ? colors.white : colors.subtext} />
                  <Text style={[styles.sectionDockText, active && { color: colors.white }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32 }}>
          {renderActiveSection()}
        </ScrollView>

        <MiniSynastryModal visible={!!insightProfile} profile={insightProfile} colors={colors} onClose={closeInsight} />
        <MatchCelebrationModal
          visible={showMatchCelebration}
          match={lastMatchCelebration}
          viewerAvatarUri={myProfileDraft.photos.find((p) => !!p) ?? null}
          viewerLabel={myProfileDraft.displayName}
          colors={colors}
          onClose={dismissMatchCelebration}
          onOpenChat={onOpenChatFromMatchCelebration}
        />
        <ChatModal
          visible={!!activeChatMatch}
          match={activeChatMatch}
          messages={activeChatMessages}
          composer={chatComposer}
          onChangeComposer={setChatComposer}
          onSend={onSendChat}
          onClose={closeChat}
          colors={colors}
        />
      </SafeScreen>
    </LinearGradient>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 14,
      paddingTop: 6,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerEyebrow: {
      ...TYPOGRAPHY.CaptionBold,
      color: colors.primary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    headerTitle: {
      ...TYPOGRAPHY.H2,
      color: colors.text,
      marginTop: 4,
    },
    headerSubtitle: {
      ...TYPOGRAPHY.Caption,
      color: colors.subtext,
      marginTop: 4,
      maxWidth: 290,
    },
    headerRight: {
      paddingTop: 4,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionDock: {
      marginHorizontal: 14,
      marginBottom: 12,
      backgroundColor: colors.surfaceGlass,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      paddingVertical: 6,
      shadowColor: colors.shadow,
      shadowOpacity: isDark ? 0.24 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    sectionDockItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    sectionDockText: {
      color: colors.subtext,
      fontWeight: '700',
      fontSize: 12,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 4,
    },
    metricValue: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 16,
    },
    metricLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    deckStage: {
      width: DECK_CARD_WIDTH,
      height: DECK_CARD_HEIGHT + 26,
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginBottom: 8,
    },
    deckCardShell: {
      position: 'absolute',
      width: DECK_CARD_WIDTH,
      height: DECK_CARD_HEIGHT,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOpacity: isDark ? 0.28 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    swipeBadge: {
      position: 'absolute',
      top: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderWidth: 2,
    },
    swipeBadgeText: {
      fontWeight: '900',
      fontSize: 12,
      letterSpacing: 0.4,
    },
    actionRail: {
      width: '100%',
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    deckHintCard: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    deckHintText: {
      flex: 1,
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
    },
    deckEmptyOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderRadius: 24,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    deckEmptyTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 20,
      marginTop: 8,
    },
    deckEmptyText: {
      color: colors.subtext,
      textAlign: 'center',
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
    },
    disabledDiscoveryCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      alignItems: 'center',
    },
    disabledTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 18,
      marginTop: 8,
    },
    disabledBody: {
      color: colors.subtext,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
      fontSize: 13,
    },
    primaryPillButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    primaryPillText: {
      color: colors.white,
      fontWeight: '800',
      fontSize: 13,
    },
    secondaryPillButton: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    secondaryPillText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    panel: {
      backgroundColor: colors.surfaceGlass,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      padding: 14,
      marginBottom: 12,
    },
    panelTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 15,
    },
    panelDescription: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    settingsCard: {
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
    },
    settingsRowBlock: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    settingsLabel: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    settingsValue: {
      color: colors.subtext,
      fontWeight: '600',
      fontSize: 12,
    },
    inlineToggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderMuted,
    },
    inlineToggleText: {
      flex: 1,
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderMuted,
      marginTop: 14,
      marginBottom: 14,
    },
    archCard: {
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
    },
    archTitle: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 13,
      marginBottom: 6,
    },
    archBody: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 8,
    },
    dangerRow: {
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.redLight,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dangerText: {
      color: colors.redBright,
      fontWeight: '700',
      fontSize: 13,
    },
    textActionBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
    },
    textActionBtnText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 12,
    },
    helperText: {
      color: colors.subtext,
      fontSize: 11,
      marginTop: 8,
    },
    photoGrid: {
      marginTop: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
    },
    photoSlot: {
      width: (SCREEN_WIDTH - 28 - 28 - 20) / 3,
      aspectRatio: 1,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoSlotImage: {
      width: '100%',
      height: '100%',
    },
    photoSlotOverlayTop: {
      position: 'absolute',
      top: 6,
      left: 6,
      right: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    photoSlotIndex: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      backgroundColor: 'rgba(0,0,0,0.35)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 999,
      overflow: 'hidden',
    },
    photoRemoveBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.85)',
    },
    bioInput: {
      marginTop: 10,
      minHeight: 96,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
    },
    tagWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    tagChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tagChipText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      marginTop: 4,
    },
    detailStepBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    likesGrid: {
      marginTop: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
    },
    likeTile: {
      width: (SCREEN_WIDTH - 28 - 28 - 10) / 2,
      aspectRatio: 0.78,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    likeTileBlurOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15,23,42,0.36)',
      borderRadius: 16,
    },
    likeTileFooter: {
      position: 'absolute',
      left: 10,
      right: 10,
      bottom: 10,
    },
    likeTileTitle: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
    likeTileSubtitle: {
      color: 'rgba(255,255,255,0.88)',
      marginTop: 3,
      fontSize: 11,
    },
    likeTileLockBubble: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    emptyStateCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    emptyStateTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 14,
      marginTop: 6,
    },
    emptyStateBody: {
      color: colors.subtext,
      textAlign: 'center',
      marginTop: 5,
      fontSize: 12,
      lineHeight: 17,
    },
    matchPillCard: {
      width: 94,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      alignItems: 'center',
    },
    matchPillImage: {
      width: 78,
      height: 88,
      borderRadius: 10,
      backgroundColor: colors.surfaceMuted,
    },
    matchPillName: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 11,
      maxWidth: 76,
    },
    matchPillScore: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 11,
      marginTop: 2,
    },
    chatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
    },
    chatAvatar: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
    },
    chatName: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 14,
    },
    chatMeta: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '600',
    },
    chatSubtitle: {
      color: colors.subtext,
      marginTop: 3,
      fontSize: 12,
    },
    chatScoreBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    chatScoreText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 10,
    },
    unreadDot: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    unreadText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: '800',
    },
  });
}
