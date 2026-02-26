# Ruhsal Pratikler Modulu - Mobil Mimari ve React Native Skeletonlari

Bu belge `Expo React Native + Expo Router + Zustand + TanStack Query` stack'ine uygun ekran/kod iskeletlerini tanimlar.

## Mevcut Repo ile Uyum Notlari

Mevcut projede gozlenen patternler:
- `expo-router` (`src/app/*`)
- `zustand` store'lar (`src/store/*`)
- axios tabanli ortak API client (`src/services/api.ts`)
- TanStack Query + AsyncStorage persister (`src/lib/queryClient.ts`)
- Tema sistemi (`src/context/ThemeContext.tsx`)

Bu nedenle ruhsal modul de ayni yapida ilerlemelidir.

## Proje Klasor Yapisi (Mobil)

```text
mysticai-mobile/src
  app/
    (tabs)/
      home.tsx              // MVP: Ruhsal kartlar burada
      ruhsal.tsx            // v1 opsiyonel yeni tab
    spiritual/
      index.tsx             // Ruhsal landing / hub
      prayers/
        index.tsx           // gunun dua seti
        [id].tsx            // dua detay
        flow.tsx            // sayaç akisi
      asma/
        index.tsx           // gunun esmasi
        all.tsx             // tum esmalar
        [id].tsx            // esma detay
      meditation/
        index.tsx           // gunun egzersizi
        session.tsx         // timer/session
      journal/
        index.tsx           // gunluk ana ekran
        [date].tsx          // gun detay
      settings.tsx          // ruhsal ayarlar
  components/spiritual/
    DailyCards.tsx
    PrayerCounter.tsx
    PrayerTextTabs.tsx
    DhikrCounter.tsx
    BreathTimer.tsx
    MoodCheckin.tsx
  hooks/
    useSpiritualQueries.ts
  services/
    spiritual.service.ts
  store/
    usePrayerFlowStore.ts
    useMeditationSessionStore.ts
    useSpiritualPrefsStore.ts
  types/
    spiritual.ts
```

## State Yonetimi Dagilimi

### TanStack Query (server state)

- `daily/prayers`
- `daily/asma`
- `daily/meditation`
- `prayer detail`
- `logs`
- `weekly stats`
- `preferences`

### Zustand (local etkileşim state)

- Dua sayaç akisi (`active item`, `countsByPrayerId`, `mood`, `note`)
- Meditasyon seansi (`running`, `phase`, `elapsed`, `cycles`, `moodBefore`)
- UI toggles (okuma modu gecici kontrolleri)

### Local storage / offline

- Query cache (`offlineFirst`) - mevcut altyapi ile
- Pending log queue (retry)
- Local preferences fallback

## Query Keys (onerilen ekler)

```ts
export const queryKeys = {
  spiritualDailyPrayers: (date?: string) => ['spiritual', 'daily-prayers', date ?? 'today'] as const,
  spiritualDailyAsma: (date?: string) => ['spiritual', 'daily-asma', date ?? 'today'] as const,
  spiritualDailyMeditation: (date?: string) => ['spiritual', 'daily-meditation', date ?? 'today'] as const,
  spiritualPrayerDetail: (id: number) => ['spiritual', 'prayer', id] as const,
  spiritualPrayerLog: (from: string, to: string) => ['spiritual', 'prayer-log', from, to] as const,
  spiritualWeeklyStats: (week: string) => ['spiritual', 'weekly-stats', week] as const,
  spiritualPrefs: () => ['spiritual', 'prefs'] as const,
};
```

## Service Skeleton (`src/services/spiritual.service.ts`)

```ts
import api from './api';

export type Mood = 'MUTLU' | 'SAKIN' | 'GERGIN' | 'YORGUN' | 'ODAKLI' | 'SUKURLU' | 'DIGER';

export interface DailyPrayerItem {
  order: number;
  prayerId: number;
  title: string;
  category: string;
  recommendedRepeatCount: number;
  estimatedReadSeconds: number;
  userProgressCount: number;
  isCompletedToday: boolean;
}

export interface DailyPrayerSetResponse {
  date: string;
  scope: 'GLOBAL' | 'PER_USER';
  setId: number;
  variant: '3_DUA' | '5_DUA';
  items: DailyPrayerItem[];
}

export const spiritualService = {
  getDailyPrayers: async (date?: string) =>
    (await api.get<DailyPrayerSetResponse>('/api/v1/spiritual/daily/prayers', { params: { date } })).data,

  getPrayerById: async (id: number) =>
    (await api.get(`/api/v1/spiritual/prayers/${id}`)).data,

  logPrayer: async (payload: { date: string; prayerId: number; count: number; note?: string; mood?: Mood }) =>
    (await api.post('/api/v1/spiritual/log/prayer', payload)).data,

  getDailyAsma: async (date?: string) =>
    (await api.get('/api/v1/spiritual/daily/asma', { params: { date } })).data,

  logAsma: async (payload: { date: string; asmaId: number; count: number; note?: string; mood?: Mood }) =>
    (await api.post('/api/v1/spiritual/log/asma', payload)).data,

  getDailyMeditation: async (date?: string) =>
    (await api.get('/api/v1/spiritual/daily/meditation', { params: { date } })).data,

  logMeditation: async (payload: {
    date: string;
    exerciseId: number;
    durationSec: number;
    moodBefore?: Mood;
    moodAfter?: Mood;
    note?: string;
    completedCycles?: number;
  }) => (await api.post('/api/v1/spiritual/log/meditation', payload)).data,
};
```

## Hook Skeleton (`src/hooks/useSpiritualQueries.ts`)

```ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { spiritualService } from '../services/spiritual.service';

export function useDailySpiritual(date?: string) {
  const prayers = useQuery({
    queryKey: queryKeys.spiritualDailyPrayers(date),
    queryFn: () => spiritualService.getDailyPrayers(date),
    staleTime: 1000 * 60 * 30,
  });

  const asma = useQuery({
    queryKey: queryKeys.spiritualDailyAsma(date),
    queryFn: () => spiritualService.getDailyAsma(date),
    staleTime: 1000 * 60 * 60,
  });

  const meditation = useQuery({
    queryKey: queryKeys.spiritualDailyMeditation(date),
    queryFn: () => spiritualService.getDailyMeditation(date),
    staleTime: 1000 * 60 * 60,
  });

  return { prayers, asma, meditation };
}
```

## Zustand Store Skeleton - Dua Akisi (`usePrayerFlowStore.ts`)

```ts
import { create } from 'zustand';

interface PrayerFlowState {
  setId: number | null;
  currentIndex: number;
  countsByPrayerId: Record<number, number>;
  mood?: string;
  note?: string;
  isSaving: boolean;
  saveError?: string | null;
  startSet: (setId: number) => void;
  increment: (prayerId: number, by?: number) => void;
  setCount: (prayerId: number, value: number) => void;
  next: () => void;
  setMood: (mood?: string) => void;
  setNote: (note?: string) => void;
  reset: () => void;
}

export const usePrayerFlowStore = create<PrayerFlowState>((set) => ({
  setId: null,
  currentIndex: 0,
  countsByPrayerId: {},
  isSaving: false,
  saveError: null,
  startSet: (setId) => set({ setId, currentIndex: 0, countsByPrayerId: {}, mood: undefined, note: undefined }),
  increment: (prayerId, by = 1) => set((s) => ({
    countsByPrayerId: { ...s.countsByPrayerId, [prayerId]: Math.max(0, (s.countsByPrayerId[prayerId] ?? 0) + by) }
  })),
  setCount: (prayerId, value) => set((s) => ({
    countsByPrayerId: { ...s.countsByPrayerId, [prayerId]: Math.max(0, value) }
  })),
  next: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),
  setMood: (mood) => set({ mood }),
  setNote: (note) => set({ note }),
  reset: () => set({ setId: null, currentIndex: 0, countsByPrayerId: {}, mood: undefined, note: undefined, isSaving: false, saveError: null }),
}));
```

## Home Entegrasyonu (MVP) - Component Skeleton

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useDailySpiritual } from '../../hooks/useSpiritualQueries';
import { Skeleton } from '../ui/Skeleton';
import ErrorStateCard from '../ui/ErrorStateCard';
import { useTheme } from '../../context/ThemeContext';

export function SpiritualDailySection() {
  const { colors } = useTheme();
  const { prayers, asma, meditation } = useDailySpiritual();

  if (prayers.isLoading || asma.isLoading || meditation.isLoading) {
    return (
      <View style={{ gap: 12 }}>
        <Skeleton height={96} borderRadius={16} />
        <Skeleton height={96} borderRadius={16} />
        <Skeleton height={96} borderRadius={16} />
      </View>
    );
  }

  if (prayers.isError || asma.isError || meditation.isError) {
    return (
      <ErrorStateCard
        title="Ruhsal icerikler yuklenemedi"
        subtitle="Baglantinizi kontrol edip tekrar deneyin."
        onRetry={() => { prayers.refetch(); asma.refetch(); meditation.refetch(); }}
      />
    );
  }

  return (
    <View style={styles(colors).section}>
      <Text style={styles(colors).title}>Ruhsal Pratikler</Text>
      <Pressable style={styles(colors).card} onPress={() => router.push('/spiritual/prayers')}>
        <Text style={styles(colors).cardTitle}>Bugunun Duasi</Text>
        <Text style={styles(colors).cardSub}>{prayers.data?.items?.length ?? 0} dua</Text>
      </Pressable>
      <Pressable style={styles(colors).card} onPress={() => router.push('/spiritual/asma')}>
        <Text style={styles(colors).cardTitle}>Bugunun Esmasi</Text>
        <Text style={styles(colors).cardSub}>{asma.data?.transliterationTr ?? 'Goruntule'}</Text>
      </Pressable>
      <Pressable style={styles(colors).card} onPress={() => router.push('/spiritual/meditation')}>
        <Text style={styles(colors).cardTitle}>Bugunun Nefesi</Text>
        <Text style={styles(colors).cardSub}>{meditation.data?.title ?? 'Egzersizi baslat'}</Text>
      </Pressable>
    </View>
  );
}

const styles = (C: any) => StyleSheet.create({
  section: { gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  cardSub: { marginTop: 4, fontSize: 12, color: C.subtext },
});
```

## Dua Sayaç Component Skeleton (`PrayerCounter.tsx`)

```tsx
import { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

export function PrayerCounter({
  value,
  target,
  onAdd,
}: {
  value: number;
  target: number;
  onAdd: (by: number) => void;
}) {
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = target > 0 ? Math.min(1, value / target) : 0;

  const startHold = () => {
    onAdd(1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    holdRef.current = setInterval(() => onAdd(1), 90);
  };

  const stopHold = () => {
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = null;
  };

  useEffect(() => stopHold, []);

  return (
    <View style={{ gap: 12 }}>
      <Text>{value} / {target}</Text>
      <View style={{ height: 8, backgroundColor: '#EEE', borderRadius: 999, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${progress * 100}%`, backgroundColor: '#9D4EDD' }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => onAdd(1)} onLongPress={startHold} onPressOut={stopHold}><Text>+1</Text></Pressable>
        <Pressable onPress={() => onAdd(5)}><Text>+5</Text></Pressable>
        <Pressable onPress={() => onAdd(10)}><Text>+10</Text></Pressable>
      </View>
    </View>
  );
}
```

## Dua Akisi Ekrani Skeleton (`/spiritual/prayers/flow.tsx`)

```tsx
import { View, Text, Pressable } from 'react-native';
import { useDailySpiritual } from '../../../hooks/useSpiritualQueries';
import { usePrayerFlowStore } from '../../../store/usePrayerFlowStore';
import { PrayerCounter } from '../../../components/spiritual/PrayerCounter';
import { spiritualService } from '../../../services/spiritual.service';

export default function PrayerFlowScreen() {
  const { prayers } = useDailySpiritual();
  const flow = usePrayerFlowStore();

  if (prayers.isLoading) return <Text>Yukleniyor...</Text>;
  if (prayers.isError || !prayers.data) return <Text>Hata olustu</Text>;
  if (prayers.data.items.length === 0) return <Text>Bugun dua seti yok</Text>;

  const items = prayers.data.items;
  const current = items[flow.currentIndex];
  const count = flow.countsByPrayerId[current.prayerId] ?? 0;
  const done = count >= current.recommendedRepeatCount;

  const saveCurrent = async () => {
    if (count <= 0) return;
    await spiritualService.logPrayer({
      date: prayers.data!.date,
      prayerId: current.prayerId,
      count,
      mood: flow.mood as any,
      note: flow.note,
    });
  };

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Text>{flow.currentIndex + 1} / {items.length}</Text>
      <Text>{current.title}</Text>
      <PrayerCounter
        value={count}
        target={current.recommendedRepeatCount}
        onAdd={(by) => flow.increment(current.prayerId, by)}
      />
      <Pressable
        disabled={!done}
        onPress={async () => {
          await saveCurrent();
          flow.next();
        }}
      >
        <Text>{flow.currentIndex < items.length - 1 ? 'Sonraki Duaya Gec' : 'Seti Tamamla'}</Text>
      </Pressable>
    </View>
  );
}
```

## Nefes Timer Skeleton (`BreathTimer.tsx`)

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';

type Pattern = { inhale: number; hold1?: number; exhale: number; hold2?: number };

export function BreathTimer({
  pattern,
  targetDurationSec,
  onComplete,
}: {
  pattern: Pattern;
  targetDurationSec: number;
  onComplete: (payload: { actualDurationSec: number; cycles: number }) => void;
}) {
  const phases = useMemo(
    () => [
      { key: 'INHALE', sec: pattern.inhale },
      { key: 'HOLD', sec: pattern.hold1 ?? 0 },
      { key: 'EXHALE', sec: pattern.exhale },
      { key: 'HOLD', sec: pattern.hold2 ?? 0 },
    ].filter((p) => p.sec > 0),
    [pattern],
  );

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseRemaining, setPhaseRemaining] = useState(phases[0]?.sec ?? 0);
  const cyclesRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= targetDurationSec) {
          setRunning(false);
          onComplete({ actualDurationSec: next, cycles: cyclesRef.current });
        }
        return next;
      });

      setPhaseRemaining((r) => {
        if (r > 1) return r - 1;
        const nextPhase = (phaseIndex + 1) % phases.length;
        if (nextPhase === 0) cyclesRef.current += 1;
        setPhaseIndex(nextPhase);
        return phases[nextPhase].sec;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [running, phaseIndex, phases, targetDurationSec, onComplete]);

  return (
    <View>
      <Text>{phases[phaseIndex]?.key}</Text>
      <Text>{phaseRemaining}s</Text>
      <Text>{elapsed}/{targetDurationSec}s</Text>
      <Pressable onPress={() => setRunning((v) => !v)}>
        <Text>{running ? 'Duraklat' : 'Baslat'}</Text>
      </Pressable>
    </View>
  );
}
```

## Loading / Error / Empty Durumlari (standart)

- Loading:
  - Skeleton bilesenleri
  - Timer ekraninda `hazirlaniyor` state
- Error:
  - `ErrorStateCard` + retry
  - Log save fail -> toast + local retry queue
- Empty:
  - `Bugun icerik hazirlaniyor`
  - `Henuz gunluk kayit yok`
  - `Aramaya uygun sonuc bulunamadi`

## Offline ve Performans Uygulama Notlari

- Gunun icerikleri `TanStack Query` cache ile tutulur (`offlineFirst`, mevcut projede var)
- Sayaç state tamamen lokal tutulur; her tikta API cagrisi yapilmaz
- Log POST'lari:
  - dua akisi ekranindan cikista
  - dua tamamlandiginda
  - retry queue ile tekrar
- Timer:
  - Production'da `react-native-reanimated` + absolute end timestamp kullan
  - Background/resume durumunda elapsed yeniden hesapla

## Tasarim Uyum Notlari (mor/beyaz tema)

- Mevcut `ThemeContext` renk tokenlari kullanilmali
- Ruhsal kartlarda:
  - daha acik surface
  - yumusak border
  - altin/mor vurgu
- Okuma modu:
  - daha buyuk font
  - daha yuksek satir araligi
  - ekran kararmasini engelleme secenegi

