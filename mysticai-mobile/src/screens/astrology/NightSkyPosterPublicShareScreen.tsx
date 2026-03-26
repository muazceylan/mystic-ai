import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import BirthNightSkyPoster from '../../components/Astrology/BirthNightSkyPoster';
import {
  fetchNightSkyProjection,
  resolveNightSkyPosterShareToken,
  type NightSkyPosterShareTokenResolveResponse,
  type NightSkyPosterVariant,
  type NightSkyProjectionResponse,
} from '../../services/astrology.service';

type ParsedSharePayload = {
  name?: string | null;
  birthDate: string;
  birthTime: string | null;
  birthLocation: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  variant?: NightSkyPosterVariant;
};

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asVariant(value: unknown): NightSkyPosterVariant | undefined {
  const v = asString(value)?.toLowerCase().replace('-', '_');
  if (v === 'minimal' || v === 'constellation_heavy' || v === 'gold_edition') return v;
  return undefined;
}

function parsePayload(payload: Record<string, unknown> | null | undefined): ParsedSharePayload | null {
  if (!payload) return null;
  const birthDate = asString(payload.birthDate);
  const birthLocation = asString(payload.birthLocation) ?? 'Unknown';
  if (!birthDate) return null;

  return {
    name: asString(payload.name) ?? null,
    birthDate,
    birthTime: asString(payload.birthTime) ?? null,
    birthLocation,
    latitude: asNumber(payload.latitude),
    longitude: asNumber(payload.longitude),
    timezone: asString(payload.timezone),
    variant: asVariant(payload.variant),
  };
}

export default function NightSkyPosterPublicShareScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<NightSkyPosterShareTokenResolveResponse | null>(null);
  const [projection, setProjection] = useState<NightSkyProjectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!token) {
        setError('Geçersiz paylaşım bağlantısı.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setProjection(null);

      try {
        const resolvedRes = await resolveNightSkyPosterShareToken(token);
        if (!active) return;
        const resolvedData = resolvedRes.data;
        setResolved(resolvedData);

        if (resolvedData.expired) {
          setLoading(false);
          return;
        }

        const payload = parsePayload(resolvedData.payload as Record<string, unknown>);
        if (!payload) {
          setError('Paylaşım verisi eksik veya bozuk.');
          setLoading(false);
          return;
        }

        const projectionRes = await fetchNightSkyProjection({
          name: payload.name,
          birthDate: payload.birthDate,
          birthTime: payload.birthTime,
          birthLocation: payload.birthLocation,
          latitude: payload.latitude,
          longitude: payload.longitude,
          timezone: payload.timezone,
        });

        if (!active) return;
        setProjection(projectionRes.data);
      } catch (e: any) {
        if (!active) return;
        const status = e?.response?.status;
        if (status === 404) {
          setError('Bu paylaşım bağlantısı bulunamadı.');
        } else if (status === 429) {
          setError('Bu paylaşım bağlantısı için çok fazla istek alındı. Lütfen biraz sonra tekrar dene.');
        } else {
          setError(e?.response?.data?.message ?? e?.message ?? 'Paylaşım yüklenemedi.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const parsedPayload = useMemo(
    () => parsePayload((resolved?.payload as Record<string, unknown> | undefined) ?? undefined),
    [resolved?.payload],
  );

  const variant: NightSkyPosterVariant =
    (resolved?.variant as NightSkyPosterVariant | undefined) ??
    parsedPayload?.variant ??
    'minimal';

  const shareUrl = useMemo(() => {
    const publicBase = (process.env.EXPO_PUBLIC_PUBLIC_BASE_URL ?? 'https://mysticai.app').replace(/\/+$/, '');
    return token ? `${publicBase}/share/night-sky/${token}` : publicBase;
  }, [token]);

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: shareUrl,
        url: shareUrl,
      });
    } catch {
      // no-op
    }
  };

  const handleOpenApp = async () => {
    if (!token) return;
    const deepLink = `mysticai://share/night-sky/${token}`;
    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
        return;
      }
      await Linking.openURL(shareUrl);
    } catch {
      Alert.alert('Bağlantı Açılamadı', 'Lütfen bağlantıyı tarayıcıda tekrar deneyin.');
    }
  };

  const expired = Boolean(resolved?.expired);
  const canRenderPoster = Boolean(parsedPayload && projection && !expired);

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroHeader}>
            <Ionicons name="moon" size={18} color={colors.violet} />
            <Text style={[styles.heroEyebrow, { color: colors.violet }]}>THE NIGHT YOU WERE BORN</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Bu senin gökyüzün.</Text>
          <Text style={[styles.heroSub, { color: colors.subtext }]}>
            Paylaşılan poster bağlantısı yüklendi. Gerçek zenith projection ile restore ediliyor.
          </Text>
        </View>

        {loading ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.violet} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>Poster yükleniyor…</Text>
            <Text style={[styles.stateSub, { color: colors.subtext }]}>
              Token çözülüyor ve gökyüzü projeksiyonu hazırlanıyor.
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="warning-outline" size={22} color={colors.warning} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>Poster açılamadı</Text>
            <Text style={[styles.stateSub, { color: colors.subtext }]}>{error}</Text>
            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.violet }]} onPress={() => handleOpenApp()}>
              <Text style={styles.primaryBtnText}>Uygulamada Aç</Text>
            </Pressable>
          </View>
        ) : expired ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={22} color={colors.warning} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>Paylaşım Süresi Dolmuş</Text>
            <Text style={[styles.stateSub, { color: colors.subtext }]}>
              Bu poster linkinin süresi dolmuş. Gönderen kişiden yeni bağlantı isteyebilirsin.
            </Text>
            <Pressable style={[styles.secondaryBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handleShareLink}>
              <Ionicons name="share-social-outline" size={16} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Bağlantıyı Paylaş</Text>
            </Pressable>
          </View>
        ) : null}

        {canRenderPoster && parsedPayload && projection ? (
          <>
            <View style={[styles.posterShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <BirthNightSkyPoster
                name={parsedPayload.name}
                fullName={parsedPayload.name}
                isGuest={/^guest[_-]/i.test(parsedPayload.name ?? '')}
                birthDate={parsedPayload.birthDate}
                birthTime={parsedPayload.birthTime}
                birthLocation={parsedPayload.birthLocation}
                latitude={projection.latitude ?? parsedPayload.latitude ?? 0}
                longitude={projection.longitude ?? parsedPayload.longitude ?? 0}
                shareUrl={shareUrl}
                planets={[]}
                houses={[]}
                variant={variant}
                projection={projection}
              />
            </View>

            <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.subtext }]}>Varyant</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{variant}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.subtext }]}>Projection</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{projection.projectionModel}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.subtext }]}>Star Catalog</Text>
                <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
                  {projection.starCatalog}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.subtext }]}>Timezone</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{projection.timezoneUsed}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.subtext }]}>Moon Phase</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {projection.moonPhase.phaseLabel} • %{Math.round(projection.moonPhase.illuminationPercent)}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={[styles.primaryBtn, { backgroundColor: colors.violet }]} onPress={handleOpenApp}>
                <Ionicons name="phone-portrait-outline" size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>Astro Guru'da Aç</Text>
              </Pressable>
              <Pressable style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleShareLink}>
                <Ionicons name="share-social-outline" size={16} color={colors.text} />
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Paylaş</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroSub: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  stateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  posterShell: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  metaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
