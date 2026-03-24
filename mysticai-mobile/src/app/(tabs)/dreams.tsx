import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
  Easing, FadeIn, FadeInDown, SlideInDown,
  interpolate,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useDreamStore } from '../../store/useDreamStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ErrorStateCard, SafeScreen, TabHeader } from '../../components/ui';
import { useTabHeaderActions } from '../../hooks/useTabHeaderActions';
import { dreamService } from '../../services/dream.service';
import DreamDictionary from '../../components/DreamDictionary';
import type { DreamEntryResponse } from '../../services/dream.service';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../constants/colors';
import {
  DREAMS_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../../features/tutorial';


type Tab      = 'journal' | 'compose' | 'dictionary' | 'book';
type RecState = 'idle' | 'recording' | 'transcribing' | 'done';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const DREAM_INTERPRETATION_KEYS = [
  'interpretation',
  'yorum',
  'analysis',
  'message',
  'cosmicInterpretation',
  'dreamInterpretation',
] as const;

const DREAM_OPPORTUNITY_KEYS = [
  'opportunities',
  'firsatlar',
  'fırsatlar',
  'actions',
  'guidance',
] as const;

const DREAM_WARNING_KEYS = [
  'warnings',
  'uyarilar',
  'uyarılar',
  'cautions',
] as const;

const stripMarkdownFence = (raw: string) => {
  let normalized = raw.trim();
  if (normalized.startsWith('```')) {
    const firstNewLine = normalized.indexOf('\n');
    normalized = firstNewLine >= 0
      ? normalized.slice(firstNewLine + 1).trim()
      : normalized.slice(3).trim();
  }
  if (normalized.endsWith('```')) {
    normalized = normalized.slice(0, normalized.lastIndexOf('```')).trim();
  }
  return normalized;
};

const extractJsonBlock = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return raw.slice(start, end + 1).trim();
  return raw.trim();
};

const normalizeLooseJson = (raw: string) =>
  raw
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, '\'')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g, '$1"$2"$3')
    .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(\s*[,}\]])/g, ': "$1"$2');

const unwrapStringifiedJson = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed.trim() : '';
  } catch {
    return '';
  }
};

const addParseCandidate = (target: string[], value: string) => {
  const trimmed = value.trim();
  if (trimmed && !target.includes(trimmed)) target.push(trimmed);
};

const normalizeText = (value: unknown) =>
  typeof value === 'string'
    ? stripMarkdownFence(value).replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim()
    : '';

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeText(item))
      .filter(Boolean);
  }

  const rawText = typeof value === 'string'
    ? stripMarkdownFence(value).replace(/\\n/g, '\n').trim()
    : '';
  if (!rawText) return [];

  if (rawText.startsWith('[') && rawText.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => normalizeText(item))
          .filter(Boolean);
      }
    } catch {
      // Fall back to plain-text splitting below.
    }
  }

  return rawText
    .split(/\r?\n|\s*[•;]\s*/)
    .map(item => item.replace(/^[\-\•*\d.)\s]+/, '').trim())
    .filter(Boolean);
};

const pickFirstText = (parsed: Record<string, unknown>, keys: readonly string[]) => {
  for (const key of keys) {
    const value = normalizeText(parsed[key]);
    if (value) return value;
  }

  let longest = '';
  for (const [key, value] of Object.entries(parsed)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('warning') ||
      lowerKey.includes('uyarı') ||
      lowerKey.includes('uyari') ||
      lowerKey.includes('opportun') ||
      lowerKey.includes('fırsat') ||
      lowerKey.includes('firsat') ||
      lowerKey.includes('action') ||
      lowerKey.includes('guidance') ||
      lowerKey.includes('caution')
    ) {
      continue;
    }

    const candidate = normalizeText(value);
    if (candidate.length > longest.length) {
      longest = candidate;
    }
  }

  return longest;
};

const pickFirstArray = (parsed: Record<string, unknown>, keys: readonly string[]) => {
  for (const key of keys) {
    const values = toStringArray(parsed[key]);
    if (values.length > 0) return values;
  }
  return [];
};

// ─── JSON-leak guard ──────────────────────────────────────────────
// The backend stores parsed fields separately, but if the AI returned a
// markdown-wrapped JSON string and parsing failed, the raw JSON may land
// in `interpretation`. This function detects and recovers from that.
function parseInterpretation(dream: DreamEntryResponse): {
  interpretation: string;
  opportunities: string[];
  warnings: string[];
} {
  const raw = (dream.interpretation ?? '').trim();
  const markdownStripped = stripMarkdownFence(raw);
  const extracted = extractJsonBlock(markdownStripped);
  const candidates: string[] = [];

  addParseCandidate(candidates, raw);
  addParseCandidate(candidates, markdownStripped);
  addParseCandidate(candidates, extracted);
  addParseCandidate(candidates, normalizeLooseJson(extracted || markdownStripped));

  const stringified = unwrapStringifiedJson(markdownStripped);
  if (stringified) {
    addParseCandidate(candidates, stringified);
    addParseCandidate(candidates, extractJsonBlock(stringified));
    addParseCandidate(candidates, normalizeLooseJson(extractJsonBlock(stringified)));
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const interpretation = pickFirstText(parsed, DREAM_INTERPRETATION_KEYS);
      const opportunities = pickFirstArray(parsed, DREAM_OPPORTUNITY_KEYS);
      const warnings = pickFirstArray(parsed, DREAM_WARNING_KEYS);

      if (interpretation || opportunities.length > 0 || warnings.length > 0) {
        return {
          interpretation,
          opportunities: opportunities.length > 0 ? opportunities : (dream.opportunities ?? []),
          warnings: warnings.length > 0 ? warnings : (dream.warnings ?? []),
        };
      }
    } catch {
      // Fall through to the persisted fields below.
    }
  }
  return {
    interpretation: markdownStripped,
    opportunities:  dream.opportunities ?? [],
    warnings:       dream.warnings ?? [],
  };
}
// ─────────────────────────────────────────────────────────────────────

// ─── Date helpers ────────────────────────────────────────────────────
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (d: Date) =>
  d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'long' });
const isToday = (d: Date) =>
  toIso(d) === toIso(new Date());
// ─────────────────────────────────────────────────────────────────────

export default function DreamsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user }        = useAuthStore();
  const {
    dreams, symbols, loading, submitting, transcribing, error,
    fetchDreams, fetchSymbols, submitDream, transcribeAudio,
    deleteDream, pollUntilComplete,
    monthlyStory, storyLoading, storyError, generateMonthlyStory,
    fetchMonthlyStory, pollStoryUntilComplete,
  } = useDreamStore();

  // ── Tab / compose state ───────────────────────────────────────────
  const [tab, setTab]               = useState<Tab>('journal');
  const [dreamText, setDreamText]   = useState('');
  const [dreamTitle, setDreamTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ── Recording state machine ───────────────────────────────────────
  const [recState, setRecState]     = useState<RecState>('idle');
  const [recDuration, setRecDuration] = useState(0);

  // ── Journal state ─────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Dream book state ─────────────────────────────────────────────
  const now = new Date();
  const [bookYear, setBookYear] = useState(now.getFullYear());
  const [bookMonth, setBookMonth] = useState(now.getMonth() + 1);
  const [generating, setGenerating] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [bookRefreshing, setBookRefreshing] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────
  const recordingRef  = useRef<Audio.Recording | null>(null);
  const recordingUri  = useRef<string | null>(null);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const journalAutoExpandedRef = useRef(false);

  // ── Mic animation ─────────────────────────────────────────────────
  const micScale = useSharedValue(1);
  const micGlow  = useSharedValue(0);

  const userId = user?.id ?? 0;
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.DREAMS);
  const tutorialBootstrapRef = useRef<string | null>(null);

  useEffect(() => {
    if (userId) { fetchDreams(userId); fetchSymbols(userId); }
  }, [userId]);

  useEffect(() => {
    if (dreams.length === 0) {
      journalAutoExpandedRef.current = false;
      return;
    }

    if (tab !== 'journal' || expandedId !== null || journalAutoExpandedRef.current) {
      return;
    }

    setExpandedId(dreams[0].id);
    journalAutoExpandedRef.current = true;
  }, [dreams, expandedId, tab]);

  useEffect(() => {
    const scope = userId ? String(userId) : 'guest';
    if (tutorialBootstrapRef.current === scope) {
      return;
    }

    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
  }, [triggerInitialTutorials, userId]);

  // Register push notifications on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const platform = Platform.OS;
        await dreamService.registerPushToken(userId, tokenData.data, platform);
      } catch {
        // push registration is non-critical — silently ignore
      }
    })();
  }, [userId]);

  // mic pulse
  useEffect(() => {
    if (recState === 'recording') {
      micScale.value = withRepeat(
        withSequence(
          withTiming(1.22, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0,  { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ), -1);
      micGlow.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);

      // Timer
      durationTimer.current = setInterval(() => setRecDuration(d => d + 1), 1000);
    } else {
      micScale.value = withTiming(1,  { duration: 250 });
      micGlow.value  = withTiming(0,  { duration: 250 });
      if (durationTimer.current) { clearInterval(durationTimer.current); setRecDuration(0); }
    }
    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
    };
  }, [recState]);

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
    shadowOpacity: interpolate(micGlow.value, [0, 1], [0.2, 0.85]),
  }));

  // ─── Date picker ─────────────────────────────────────────────────
  const changeDate = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    if (next <= new Date()) setSelectedDate(next);
  };

  // ─── Recording controls ──────────────────────────────────────────
  const startRec = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert(t('dreams.micPermissionTitle'), t('dreams.micPermissionRequired')); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordingUri.current = null;
      setRecState('recording');
    } catch { Alert.alert(t('common.error'), t('dreams.voiceStartError')); }
  };

  const stopRec = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      recordingUri.current = uri;
      setRecState('transcribing');

      // Immediately transcribe
      const text = await transcribeAudio(uri!);
      // Typewriter effect: set text in 10-char chunks
      setDreamText('');
      let i = 0;
      const speed = 25;
      const chunk = 8;
      const iv = setInterval(() => {
        i += chunk;
        if (i >= text.length) { setDreamText(text); clearInterval(iv); }
        else setDreamText(text.substring(0, i));
      }, speed);
      setRecState('done');
    } catch (e: any) {
      setRecState('idle');
      Alert.alert(t('dreams.analysisError'), e.message ?? t('dreams.transcriptionError'));
    }
  };

  // ─── Reset compose ────────────────────────────────────────────────
  const resetCompose = () => {
    setDreamText('');
    setDreamTitle('');
    setSelectedDate(new Date());
    setRecState('idle');
    recordingUri.current = null;
  };

  // ─── Save dream ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!dreamText.trim() || submitting) return;
    try {
      const title = dreamTitle.trim() || undefined;
      const result = await submitDream(userId, dreamText.trim(), toIso(selectedDate), title);
      resetCompose();
      setExpandedId(result.id);
      setTab('journal');
      if (result.id) pollUntilComplete(result.id);
    } catch { Alert.alert(t('common.error'), t('dreams.saveError')); }
  };

  // ─── Delete dream ─────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    Alert.alert(t('dreams.deleteDreamTitle'), t('dreams.deleteDreamMessage'), [
      { text: t('dreams.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try { await deleteDream(id); } catch { Alert.alert(t('common.error'), t('dreams.deleteError')); }
          setDeletingId(null);
        },
      },
    ]);
  };

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.DREAMS_FOUNDATION, 'dreams');
  }, [reopenTutorialById]);

  // ─── TTS ─────────────────────────────────────────────────────────
  const handleSpeak = (dream: DreamEntryResponse) => {
    if (speakingId === dream.id) { Speech.stop(); setSpeakingId(null); return; }
    setSpeakingId(dream.id);
    const { interpretation, opportunities, warnings } = parseInterpretation(dream);
    const parts: string[] = [];
    if (interpretation)        parts.push(t('dreams.cosmicInterpretation') + ': ' + interpretation);
    if (opportunities.length)  parts.push(t('dreams.opportunitiesSection') + ': ' + opportunities.join('. '));
    if (warnings.length)       parts.push(t('dreams.warningsSection') + ': ' + warnings.join('. '));
    Speech.speak(parts.join('\n\n'), {
      language: 'tr-TR', rate: 0.88,
      onDone: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  // ─── Helpers ─────────────────────────────────────────────────────
  const fmtDur = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const fmtCardDate = (ds: string) =>
    new Date(ds).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDreams(userId), fetchSymbols(userId)]);
    setRefreshing(false);
  }, [userId]);

  // ─── Dream book handlers ──────────────────────────────────────────
  const months = t('calendar.months').split(',');
  const yearMonthLabel = `${months[bookMonth - 1] || ''} ${bookYear}`;
  const monthDreams = dreams.filter(d => {
    if (!d.dreamDate) return false;
    const [y, m] = d.dreamDate.split('-').map(Number);
    return y === bookYear && m === bookMonth;
  });

  useEffect(() => {
    if (userId && tab === 'book') {
      fetchMonthlyStory(userId, bookYear, bookMonth);
    }
  }, [userId, tab, bookYear, bookMonth]);

  const handleBookGenerate = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      await generateMonthlyStory(userId, bookYear, bookMonth);
      pollStoryUntilComplete(userId, bookYear, bookMonth);
    } catch {
      Alert.alert(t('common.error'), t('dreams.storyError'));
    } finally {
      setGenerating(false);
    }
  };

  const handleBookRefresh = async () => {
    if (!userId) return;
    setBookRefreshing(true);
    try {
      await generateMonthlyStory(userId, bookYear, bookMonth, true);
      pollStoryUntilComplete(userId, bookYear, bookMonth);
    } catch {
      Alert.alert(t('common.error'), t('dreams.storyRefreshError'));
    } finally {
      setBookRefreshing(false);
    }
  };

  const handleExportPdf = async () => {
    if (!monthlyStory?.story) return;
    setPdfExporting(true);
    try {
      const html = buildPdfHtml(monthlyStory.story, yearMonthLabel, monthlyStory.dominantSymbols, monthDreams);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Rüya Kitabım – ${yearMonthLabel}`,
        });
      } else {
        Alert.alert(t('dreams.pdfReady'), t('dreams.pdfReadyMessage'));
      }
    } catch {
      Alert.alert(t('common.error'), t('dreams.pdfError'));
    } finally {
      setPdfExporting(false);
    }
  };

  const prevBookMonth = () => {
    if (bookMonth === 1) { setBookMonth(12); setBookYear(y => y - 1); }
    else setBookMonth(m => m - 1);
  };
  const nextBookMonth = () => {
    const nextM = bookMonth === 12 ? 1 : bookMonth + 1;
    const nextY = bookMonth === 12 ? bookYear + 1 : bookYear;
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth() + 1)) return;
    setBookMonth(nextM);
    if (bookMonth === 12) setBookYear(y => y + 1);
  };
  const isCurrentOrPastBook = !(bookYear > now.getFullYear() ||
    (bookYear === now.getFullYear() && bookMonth > now.getMonth() + 1));
  const isPending = monthlyStory?.status === 'PENDING';
  const isCompleted = monthlyStory?.status === 'COMPLETED';
  const isEmpty = !monthlyStory || monthlyStory.status === 'EMPTY';
  const recurringSymbols = symbols.filter(s => s.recurring);
  const completedDreamCount = dreams.filter(d => d.interpretationStatus === 'COMPLETED').length;
  const pendingDreamCount = dreams.filter(d => d.interpretationStatus === 'PENDING').length;
  const latestDream = dreams[0] ?? null;

  const renderOverviewMetric = (icon: IoniconName, value: string, label: string) => (
    <View key={`${icon}-${label}-${value}`} style={styles.overviewMetricCard}>
      <View style={styles.overviewMetricIcon}>
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>
      <Text style={styles.overviewMetricValue}>{value}</Text>
      <Text style={styles.overviewMetricLabel}>{label}</Text>
    </View>
  );

  const renderOverviewPanel = () => {
    if (tab === 'compose') {
      return null;
    }

    let eyebrow = t('dreams.journal');
    let title = 'Gecenin atlasin';
    let subtitle = latestDream?.dreamDate ? fmtCardDate(latestDream.dreamDate) : t('dreams.subtitle');
    let icon: IoniconName = 'moon-outline';
    let excerptLabel = latestDream ? 'Son kayit' : 'Rüya akisi';
    let excerptBody = latestDream?.text?.trim()
      ? latestDream.text.trim()
      : 'Kozmik yorumlarin, tekrar eden sembollerin ve bilinçalti izlerin burada birikir.';
    let metrics: Array<{ icon: IoniconName; value: string; label: string }> = [
      { icon: 'book-outline', value: String(dreams.length), label: 'Kayit' },
      { icon: 'sparkles', value: String(completedDreamCount), label: 'Yorum' },
      { icon: 'time-outline', value: String(pendingDreamCount), label: 'Bekleyen' },
    ];

    if (tab === 'dictionary') {
      eyebrow = t('dreams.dictionary');
      title = 'Sembollerin arsivi';
      subtitle = recurringSymbols.length > 0
        ? 'Tekrar eden imgeleri hizla takip et.'
        : 'Her imgenin arkasindaki anlama daha zarif bir yüzeyden ulas.';
      icon = 'library-outline';
      excerptLabel = recurringSymbols.length > 0 ? 'En güçlü tema' : 'Sözlük modu';
      excerptBody = recurringSymbols.length > 0
        ? recurringSymbols
            .slice(0, 3)
            .map(item => `${item.symbolName} ${item.count}x`)
            .join(' • ')
        : 'At, su, gökyüzü ya da kapilar gibi simgeler burada birer rehbere dönüsür.';
      metrics = [
        { icon: 'library-outline', value: String(symbols.length), label: 'Simge' },
        { icon: 'layers-outline', value: String(recurringSymbols.length), label: 'Tekrar' },
        { icon: 'moon-outline', value: String(dreams.length), label: 'Rüya' },
      ];
    }

    if (tab === 'book') {
      eyebrow = t('dreams.book');
      title = 'Aylik rüya kitabin';
      subtitle = yearMonthLabel;
      icon = 'journal-outline';
      excerptLabel = isCompleted ? 'Kozmik hikaye hazir' : 'Bu ayin izi';
      excerptBody = monthlyStory?.story?.trim()
        ? monthlyStory.story.trim()
        : `${monthDreams.length} rüya bu dönemin kitabini besliyor. Yorumu hazir oldugunda burada premium bir anlatida toplanacak.`;
      metrics = [
        { icon: 'calendar-outline', value: yearMonthLabel, label: 'Dönem' },
        { icon: 'book-outline', value: String(monthDreams.length), label: 'Rüya' },
        { icon: 'sparkles', value: isCompleted ? 'Hazir' : (isPending ? 'Yaziliyor' : 'Bekliyor'), label: 'Durum' },
      ];
    }

    return (
      <View style={styles.overviewPanel}>
        <LinearGradient
          colors={[colors.surfaceGlass, colors.primarySoftBg, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overviewGradient}
        >
          <View style={styles.overviewGlowPrimary} pointerEvents="none" />
          <View style={styles.overviewGlowGold} pointerEvents="none" />

          <View style={styles.overviewHeaderRow}>
            <View style={styles.overviewCopy}>
              <View style={styles.overviewBadge}>
                <Text style={styles.overviewBadgeText}>{eyebrow}</Text>
              </View>
              <Text style={styles.overviewTitle}>{title}</Text>
              <Text style={styles.overviewSubtitle}>{subtitle}</Text>
            </View>

            <View style={styles.overviewIconShell}>
              <View style={styles.overviewIconGlow} />
              <Ionicons name={icon} size={24} color={colors.goldDark} />
            </View>
          </View>

          <View style={styles.overviewMetricsRow}>
            {metrics.map(item => renderOverviewMetric(item.icon, item.value, item.label))}
          </View>

          <View style={styles.overviewExcerptCard}>
            <View style={styles.overviewExcerptMeta}>
              <Text style={styles.overviewExcerptLabel}>{excerptLabel}</Text>
              {latestDream?.dreamDate && tab === 'journal' ? (
                <Text style={styles.overviewExcerptDate}>{fmtCardDate(latestDream.dreamDate)}</Text>
              ) : null}
            </View>
            <Text style={styles.overviewExcerptText} numberOfLines={2}>
              {excerptBody}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  // ─── Dream card ───────────────────────────────────────────────────
  const renderCard = (dream: DreamEntryResponse) => {
    const expanded = expandedId === dream.id;
    const pending  = dream.interpretationStatus === 'PENDING';
    const speaking = speakingId === dream.id;
    const deleting = deletingId === dream.id;
    const recurring = dream.recurringSymbols ?? [];
    const { interpretation, opportunities, warnings } = parseInterpretation(dream);
    const hasInsight = Boolean(interpretation) || opportunities.length > 0 || warnings.length > 0;
    const readyLabel = hasInsight ? 'Yorum hazir' : 'Kaydedildi';

    return (
      <Animated.View key={dream.id} entering={FadeInDown.delay(40).springify()}>
        <TouchableOpacity
          style={[styles.card, expanded && styles.cardActive]}
          onPress={() => setExpandedId(expanded ? null : dream.id)}
          activeOpacity={0.87}
          accessibilityLabel={`Rüya: ${dream.title || dream.text.slice(0, 30)}...`}
          accessibilityRole="button"
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardMetaColumn}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardDatePill}>
                  <Ionicons name="moon-outline" size={13} color={colors.primary} />
                  <Text style={styles.cardDate}>{fmtCardDate(dream.dreamDate)}</Text>
                </View>

                <View style={[styles.cardStateBadge, pending ? styles.cardStateBadgePending : styles.cardStateBadgeReady]}>
                  <Ionicons
                    name={pending ? 'time-outline' : 'sparkles'}
                    size={12}
                    color={pending ? colors.goldDark : colors.primary}
                  />
                  <Text
                    style={[
                      styles.cardStateText,
                      { color: pending ? colors.goldDark : colors.primary },
                    ]}
                  >
                    {pending ? t('dreams.pending') : readyLabel}
                  </Text>
                </View>
              </View>

              {dream.title ? (
                <Text style={styles.cardTitle}>{dream.title}</Text>
              ) : null}
            </View>
            <View style={styles.cardActions}>
              {deleting
                ? <ActivityIndicator size="small" color={colors.red} />
                : <TouchableOpacity
                    onPress={() => handleDelete(dream.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel={t('dreams.deleteDream')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.dim} />
                  </TouchableOpacity>
              }
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16} color={colors.subtext} style={{ marginTop: 4 }}
              />
            </View>
          </View>

          <View style={styles.cardPreviewFrame}>
            <Text style={styles.cardPreview} numberOfLines={expanded ? undefined : 3}>
              {dream.text}
            </Text>
          </View>

          {/* Recurring badges */}
          {recurring.length > 0 && (
            <View style={styles.badgeRow}>
              {recurring.slice(0, 4).map((s, i) => (
                <View key={i} style={styles.badge}>
                  <Text style={styles.badgeText}>🔁 {s}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Opportunity / Warning insight badges (visible on collapsed card) */}
          {!pending && !expanded && (opportunities.length > 0 || warnings.length > 0) && (
            <View style={styles.insightRow}>
              {opportunities.length > 0 && (
                <View style={[styles.insightBadge, styles.insightGreen]}>
                  <Text style={[styles.insightBadgeText, { color: colors.green }]}>
                    ✨ {opportunities.length} fırsat
                  </Text>
                </View>
              )}
              {warnings.length > 0 && (
                <View style={[styles.insightBadge, styles.insightOrange]}>
                  <Text style={[styles.insightBadgeText, { color: colors.orange }]}>
                    ⚠️ {warnings.length} uyarı
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Status pill */}
          {pending && (
            <View style={styles.pendingPill}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.pendingPillText}>{t('dreams.pending')}</Text>
            </View>
          )}

          {/* Expanded interpretation */}
          {expanded && !pending && hasInsight && (
            <Animated.View entering={FadeIn.duration(260)} style={styles.interp}>

              {/* Speak button */}
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={() => handleSpeak(dream)}
                accessibilityLabel={speaking ? t('dreams.stop') : t('dreams.speak')}
                accessibilityRole="button"
              >
                <Ionicons name={speaking ? 'stop-circle' : 'volume-high'} size={17} color={colors.accent} />
                <Text style={styles.speakText}>{speaking ? t('dreams.stop') : t('dreams.speak')}</Text>
              </TouchableOpacity>

              {/* 🌙 Yorum */}
              {interpretation ? (
                <View style={styles.section}>
                  <Text style={styles.sectionHead}>🌙 {t('dreams.cosmic')}</Text>
                  <Text style={styles.interpText}>{interpretation}</Text>
                </View>
              ) : null}

              {/* ✨ Fırsatlar */}
              {opportunities.length > 0 && (
                <View style={[styles.section, styles.sectionGreen]}>
                  <Text style={[styles.sectionHead, {color: colors.green}]}>✨ {t('dreams.opportunitiesSection')}</Text>
                  {opportunities.map((op, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons name="checkmark-circle" size={15} color={colors.green} style={{marginTop:3}} />
                      <Text style={[styles.bulletText, {color: colors.green}]}>{op}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* ⚠️ Uyarılar */}
              {warnings.length > 0 && (
                <View style={[styles.section, styles.sectionOrange]}>
                  <Text style={[styles.sectionHead, {color: colors.orange}]}>⚠️ {t('dreams.warningsSection')}</Text>
                  {warnings.map((w, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons name="alert-circle" size={15} color={colors.orange} style={{marginTop:3}} />
                      <Text style={[styles.bulletText, {color: colors.orange}]}>{w}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ─── Compose tab ──────────────────────────────────────────────────
  const renderCompose = () => (
    <Animated.ScrollView
      entering={SlideInDown.springify().damping(18)}
      style={{ flex: 1 }}
      contentContainerStyle={styles.composeContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.composeIntro}>
        <LinearGradient
          colors={[colors.surfaceGlass, colors.primarySoftBg, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.composeIntroGradient}
        >
          <View style={styles.composeIntroTopRow}>
            <View style={styles.composeIntroCopy}>
              <Text style={styles.composeIntroEyebrow}>Yeni kayit</Text>
              <Text style={styles.composeIntroTitle}>Rüyan hala sicakken yakala</Text>
              <Text style={styles.composeIntroSubtitle}>
                Sesinle anlat ya da yaz. Günlügünde premium bir kart olarak islenip yorumuyla birlikte saklanacak.
              </Text>
            </View>

            <View style={styles.composeIntroIcon}>
              <Ionicons name="mic" size={24} color={colors.goldDark} />
            </View>
          </View>

          <View style={styles.composeIntroStats}>
            <View style={styles.composeIntroStat}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.composeIntroStatText}>{fmtDate(selectedDate)}</Text>
            </View>
            <View style={styles.composeIntroStat}>
              <Ionicons
                name={recState === 'idle' ? 'sparkles' : recState === 'recording' ? 'mic' : 'hourglass-outline'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.composeIntroStatText}>
                {recState === 'idle' ? 'Ses veya yazi' : recState === 'recording' ? 'Kayit sürüyor' : 'Isleniyor'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── Date picker ── */}
      <View style={styles.datePicker}>
        <TouchableOpacity
          onPress={() => changeDate(-1)}
          style={styles.dateArrow}
          accessibilityLabel={t('dreams.previousDay')}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSoft} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateMain}>{fmtDate(selectedDate)}</Text>
          {!isToday(selectedDate) && (
            <TouchableOpacity
              onPress={() => setSelectedDate(new Date())}
              accessibilityLabel={t('dreams.backToToday')}
              accessibilityRole="button"
            >
              <Text style={styles.dateTodayBtn}>{t('dreams.backToToday')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => changeDate(1)}
          style={[styles.dateArrow, isToday(selectedDate) && styles.dateArrowDisabled]}
          disabled={isToday(selectedDate)}
          accessibilityLabel={t('dreams.nextDay')}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={20}
            color={isToday(selectedDate) ? colors.dim : colors.textSoft} />
        </TouchableOpacity>
      </View>

      {/* ── Title input ── */}
      <View style={styles.titleBox}>
        <Ionicons name="bookmark-outline" size={15} color={colors.subtext} style={{ marginTop: 2 }} />
        <TextInput
          style={styles.titleInput}
          placeholder={t('dreams.titlePlaceholder')}
          placeholderTextColor={colors.dim}
          value={dreamTitle}
          onChangeText={setDreamTitle}
          maxLength={100}
          returnKeyType="done"
        />
      </View>

      {/* ── Mic section ── */}
      <View style={styles.micSection}>
        {/* Recording indicator */}
        {recState === 'recording' && (
          <Animated.View entering={FadeIn} style={styles.liveWords}>
            <Text style={styles.liveWordsLabel}>🎙 {t('dreams.listening')}</Text>
          </Animated.View>
        )}

        {/* Transcribing indicator */}
        {recState === 'transcribing' && (
          <Animated.View entering={FadeIn} style={styles.transcribingBox}>
            <ActivityIndicator size="small" color={colors.goldDark} />
            <Text style={styles.transcribingText}>{t('dreams.transcribing')}</Text>
          </Animated.View>
        )}

        {/* Mic button */}
        {(recState === 'idle' || recState === 'recording') && (
          <View style={styles.micRow}>
            <Text style={styles.micHint}>
              {recState === 'idle' ? t('dreams.voiceHint') : `⏺ ${fmtDur(recDuration)}`}
            </Text>
            <TouchableOpacity
              onPress={() => recState === 'idle' ? startRec() : stopRec()}
              activeOpacity={0.8}
              accessibilityLabel={recState === 'recording' ? t('dreams.stopRecording') : t('dreams.startRecording')}
              accessibilityRole="button"
            >
              <Animated.View style={[styles.micRing, micStyle,
                recState === 'recording' && styles.micRingRec]}>
                <LinearGradient
                  colors={recState === 'recording' ? [colors.recordingStart, colors.recordingEnd] : [colors.primary, colors.primaryDark]}
                  style={styles.micCore}
                >
                  <Ionicons name={recState === 'recording' ? 'stop' : 'mic'} size={32} color={colors.white} />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Divider (hide during recording/transcribing) */}
      {(recState === 'idle' || recState === 'done') && (
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>{recState === 'done' ? t('dreams.edit') : t('dreams.orWrite')}</Text>
          <View style={styles.divLine} />
        </View>
      )}

      {/* Text area */}
      {(recState === 'idle' || recState === 'done') && (
        <View style={styles.textBox}>
          <TextInput
            style={styles.textInput}
            placeholder={recState === 'done'
              ? t('dreams.transcriptionDonePlaceholder')
              : t('dreams.textPlaceholder')}
            placeholderTextColor={colors.dim}
            value={dreamText}
            onChangeText={setDreamText}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{dreamText.length}/2000</Text>
        </View>
      )}

      {/* Action buttons */}
      {(recState === 'idle' || recState === 'done') && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={resetCompose}
            accessibilityLabel={t('dreams.cancel')}
            accessibilityRole="button"
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.subtext} />
            <Text style={styles.cancelBtnText}>{t('dreams.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (!dreamText.trim() || submitting) && styles.saveBtnOff]}
            onPress={handleSave}
            disabled={!dreamText.trim() || submitting}
            accessibilityLabel={t('dreams.saveAndInterpret')}
            accessibilityRole="button"
          >
            {submitting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <><Ionicons name="sparkles" size={17} color={colors.white} />
                 <Text style={styles.saveBtnText}>{t('dreams.save')}</Text></>
            }
          </TouchableOpacity>
        </View>
      )}
    </Animated.ScrollView>
  );

  // ─── Dream book tab ───────────────────────────────────────────────
  const renderBook = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.bookScroll}>
      <View style={styles.bookHeaderBlock}>
        <Text style={styles.bookMoonGlyph}>📖</Text>
        <Text style={styles.bookHeaderTitle}>{t('dreams.book')}</Text>
        <Text style={styles.bookHeaderSub}>{t('dreams.dreamBookSubtitle')}</Text>
      </View>

      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={prevBookMonth} style={styles.monthArrow} accessibilityLabel={t('dreams.previousMonth')} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.goldDark} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{yearMonthLabel}</Text>
        <TouchableOpacity
          onPress={nextBookMonth}
          style={[styles.monthArrow, !isCurrentOrPastBook && styles.monthArrowDisabled]}
          disabled={!isCurrentOrPastBook}
          accessibilityLabel={t('dreams.nextMonth')}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentOrPastBook ? colors.goldDark : colors.subtext} />
        </TouchableOpacity>
      </View>

      <View style={styles.storyCard}>
        {storyError && !storyLoading ? (
          <ErrorStateCard
            message={storyError}
            onRetry={() => userId && fetchMonthlyStory(userId, bookYear, bookMonth)}
            accessibilityLabel={t('dreams.reloadMonthlyStory')}
          />
        ) : storyLoading || generating ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{generating ? t('dreams.storyWriting') : t('dreams.loading')}</Text>
            <Text style={styles.loadingSubText}>{t('dreams.storyLoadingSub')}</Text>
          </View>
        ) : isPending ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={colors.goldDark} />
            <Text style={styles.loadingText}>{t('dreams.aiWriting')}</Text>
            <Text style={styles.loadingSubText}>{t('dreams.aiWritingSub')}</Text>
          </View>
        ) : isCompleted && monthlyStory?.story ? (
          <>
            {monthlyStory.dominantSymbols?.length > 0 && (
              <View style={styles.symbolsSection}>
                <Text style={styles.sectionLabel}>✦ {t('dreams.periodSymbols')}</Text>
                <View style={styles.symbolsRow}>
                  {monthlyStory.dominantSymbols.slice(0, 6).map(sym => (
                    <View key={sym} style={styles.symChip}>
                      <Text style={styles.symChipText}>{sym.charAt(0).toUpperCase() + sym.slice(1)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.countBadge}>
              <Ionicons name="moon-outline" size={13} color={colors.goldDark} />
              <Text style={styles.countText}>{monthlyStory.dreamCount} rüya • {yearMonthLabel}</Text>
            </View>
            <Text style={styles.storyText}>{monthlyStory.story}</Text>
            <View style={styles.exportRow}>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={handleBookRefresh}
                disabled={bookRefreshing}
                accessibilityLabel={t('dreams.refreshStory')}
                accessibilityRole="button"
              >
                {bookRefreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={18} color={colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, { flex: 1 }]}
                onPress={handleExportPdf}
                disabled={pdfExporting}
                accessibilityLabel={t('dreams.pdfDownload')}
                accessibilityRole="button"
              >
                {pdfExporting ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="download-outline" size={16} color={colors.white} />}
                <Text style={styles.exportBtnText}>{pdfExporting ? t('dreams.pdfPreparing') : t('dreams.pdfDownload')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : isEmpty ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyIcon}>🌑</Text>
            <Text style={styles.emptyTitle}>{t('dreams.monthEmpty', { month: yearMonthLabel })}</Text>
            <Text style={styles.emptySub}>{t('dreams.monthEmptyDesc')}</Text>
            <TouchableOpacity style={styles.generateBtn} onPress={handleBookGenerate} disabled={storyLoading} accessibilityLabel={t('dreams.generateStory')} accessibilityRole="button">
              <Ionicons name="sparkles" size={15} color={colors.white} />
              <Text style={styles.generateBtnText}>{t('dreams.generateStory')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>{t('dreams.storyNotReady')}</Text>
            <Text style={styles.emptySub}>{t('dreams.storyNotReadyDesc', { month: yearMonthLabel })}</Text>
            <TouchableOpacity style={styles.generateBtn} onPress={handleBookGenerate} disabled={generating || storyLoading} accessibilityLabel={t('dreams.generateStory')} accessibilityRole="button">
              {generating ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="sparkles" size={15} color={colors.white} />}
              <Text style={styles.generateBtnText}>{t('dreams.generateStory')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={15} color={colors.subtext} />
        <Text style={styles.infoText}>
          {t('dreams.bookInfo')}
        </Text>
      </View>
    </ScrollView>
  );

  // ─── Screen ───────────────────────────────────────────────────────
  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <LinearGradient colors={[colors.background, colors.surfaceMuted, colors.background]} style={styles.container}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.glowTop, 'transparent']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.ambientTopGlow}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[colors.glowBottom, 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.ambientBottomGlow}
        />
        <View pointerEvents="none" style={styles.ambientOrbPrimary} />
        <View pointerEvents="none" style={styles.ambientOrbGold} />

        {/* Header */}
      <TabHeader
        title={t('tabs.dream')}
        subtitle={t('dreams.subtitle')}
        rightActions={
          <View style={styles.headerActionRow}>
            <SpotlightTarget targetKey={DREAMS_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
              <TouchableOpacity
                style={styles.helpBtn}
                onPress={handlePressTutorialHelp}
                accessibilityLabel="Rüya rehberini tekrar aç"
                accessibilityRole="button"
              >
                <Ionicons name="help-circle-outline" size={19} color={colors.text} />
              </TouchableOpacity>
            </SpotlightTarget>
            <SpotlightTarget targetKey={DREAMS_TUTORIAL_TARGET_KEYS.COMPOSE_ENTRY}>
              <TouchableOpacity
                style={[styles.addBtn, tab === 'compose' && styles.addBtnClose]}
                onPress={() => {
                  if (tab === 'compose') { resetCompose(); setTab('journal'); }
                  else setTab('compose');
                }}
                accessibilityLabel={tab === 'compose' ? t('dreams.closeCompose') : t('dreams.addNewDream')}
                accessibilityRole="button"
              >
                <Ionicons name={tab === 'compose' ? 'close' : 'add'} size={22} color={colors.white} />
              </TouchableOpacity>
            </SpotlightTarget>
          </View>
        }
        {...useTabHeaderActions()}
      />

      {/* Tab switcher */}
      {tab !== 'compose' && (
        <SpotlightTarget targetKey={DREAMS_TUTORIAL_TARGET_KEYS.HISTORY_ENTRY}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'journal' && styles.tabBtnActive]}
              onPress={() => setTab('journal')}
              accessibilityLabel={t('dreams.journal')}
              accessibilityRole="tab"
            >
              <Ionicons name="book-outline" size={14} color={tab === 'journal' ? colors.primary : colors.subtext} />
              <Text style={[styles.tabBtnText, tab === 'journal' && styles.tabBtnTextActive]}>{t('dreams.journal')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'dictionary' && styles.tabBtnActive]}
              onPress={() => setTab('dictionary')}
              accessibilityLabel={t('dreams.dictionary')}
              accessibilityRole="tab"
            >
              <Ionicons name="library-outline" size={14} color={tab === 'dictionary' ? colors.primary : colors.subtext} />
              <Text style={[styles.tabBtnText, tab === 'dictionary' && styles.tabBtnTextActive]}>{t('dreams.dictionary')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'book' && styles.tabBtnActive]}
              onPress={() => setTab('book')}
              accessibilityLabel={t('dreams.book')}
              accessibilityRole="tab"
            >
              <Ionicons name="journal-outline" size={14} color={tab === 'book' ? colors.primary : colors.subtext} />
              <Text style={[styles.tabBtnText, tab === 'book' && styles.tabBtnTextActive]}>{t('dreams.book')}</Text>
            </TouchableOpacity>
          </View>
        </SpotlightTarget>
      )}

      {tab !== 'journal' && renderOverviewPanel()}

      {/* ── COMPOSE TAB ── */}
      {tab === 'compose' && renderCompose()}

      {/* ── BOOK TAB ── */}
      {tab === 'book' && renderBook()}

      {/* ── DICTIONARY TAB ── */}
      {tab === 'dictionary' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}>
          <DreamDictionary userId={userId} />
        </ScrollView>
      )}

      {/* ── JOURNAL TAB ── */}
      {tab === 'journal' && (
        <SpotlightTarget
          targetKey={DREAMS_TUTORIAL_TARGET_KEYS.INTERPRETATION_RESULT}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.journalContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
          >
            {renderOverviewPanel()}

            {recurringSymbols.length > 0 && (
              <Animated.View entering={FadeIn} style={styles.strip}>
                <View style={styles.stripHeader}>
                  <Text style={styles.stripLabel}>{t('dreams.recurringSymbols')}</Text>
                  <Text style={styles.stripCount}>{recurringSymbols.length} tema</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {recurringSymbols.map((s, i) => (
                    <View key={i} style={styles.chip}>
                      <Text style={styles.chipText}>🔁 {s.symbolName}</Text>
                      <View style={styles.chipBubble}>
                        <Text style={styles.chipCount}>{s.count}x</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {loading && (
              <View style={styles.journalBody}>
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.centerText}>{t('dreams.loading')}</Text>
                </View>
              </View>
            )}
            {!loading && error && (
              <View style={styles.journalBody}>
                <View style={styles.centerBox}>
                  <ErrorStateCard
                    message={error}
                    onRetry={() => fetchDreams(userId)}
                    accessibilityLabel={t('dreams.reloadDreams')}
                  />
                </View>
              </View>
            )}
            {!loading && !error && dreams.length === 0 && (
              <View style={styles.journalBody}>
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🌙</Text>
                  <Text style={styles.emptyTitle}>Henüz rüya kaydın yok</Text>
                  <Text style={styles.emptySub}>İlk rüyanı kaydetmek için + butonuna dokun</Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => setTab('compose')}
                    accessibilityLabel={t('dreams.addFirstDream')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.emptyBtnText}>{t('dreams.addDream')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {!loading && !error && dreams.length > 0 && (
              <View style={styles.journalBody}>
                {dreams.map(d => renderCard(d))}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SpotlightTarget>
      )}
    </LinearGradient>
    </SafeScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  const isDark = C.statusBar === 'light';

  return StyleSheet.create({
    container: { flex: 1, position: 'relative' },
    ambientTopGlow: {
      position: 'absolute',
      top: -36,
      left: -12,
      width: 240,
      height: 220,
      borderRadius: 120,
      opacity: isDark ? 0.18 : 0.72,
    },
    ambientBottomGlow: {
      position: 'absolute',
      top: 190,
      right: -44,
      width: 240,
      height: 240,
      borderRadius: 120,
      opacity: isDark ? 0.12 : 0.5,
    },
    ambientOrbPrimary: {
      position: 'absolute',
      top: 96,
      right: -34,
      width: 132,
      height: 132,
      borderRadius: 66,
      backgroundColor: C.primaryTint,
      opacity: isDark ? 0.3 : 0.8,
    },
    ambientOrbGold: {
      position: 'absolute',
      top: 54,
      left: -48,
      width: 154,
      height: 154,
      borderRadius: 77,
      backgroundColor: 'rgba(212,175,55,0.10)',
      opacity: isDark ? 0.15 : 0.5,
    },

    headerActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    helpBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.16 : 0.08,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 18,
      elevation: 5,
    },
    addBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.primary,
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 18,
      elevation: 8,
    },
    addBtnClose: { backgroundColor: C.overlayDark },

    overviewPanel: { paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
    overviewGradient: {
      overflow: 'hidden',
      borderRadius: 26,
      paddingHorizontal: 18,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.2 : 0.1,
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 28,
      elevation: 7,
    },
    overviewGlowPrimary: {
      position: 'absolute',
      top: -22,
      right: -18,
      width: 128,
      height: 128,
      borderRadius: 64,
      backgroundColor: C.primaryTint,
      opacity: isDark ? 0.35 : 0.9,
    },
    overviewGlowGold: {
      position: 'absolute',
      bottom: -28,
      left: -12,
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: 'rgba(212,175,55,0.12)',
      opacity: isDark ? 0.16 : 0.55,
    },
    overviewHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    overviewCopy: { flex: 1, gap: 8 },
    overviewBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: C.primaryTint,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    overviewBadgeText: {
      fontSize: 11,
      color: C.primary,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    overviewTitle: {
      fontSize: 28,
      lineHeight: 32,
      color: C.textDark,
      fontWeight: '800',
      letterSpacing: -0.7,
    },
    overviewSubtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: C.subtext,
      maxWidth: '92%',
    },
    overviewIconShell: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.28)',
      backgroundColor: 'rgba(255,255,255,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    overviewIconGlow: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(212,175,55,0.12)',
    },
    overviewMetricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 16,
    },
    overviewMetricCard: {
      minWidth: '30%',
      flexGrow: 1,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: isDark ? C.surfaceAlt : 'rgba(255,255,255,0.55)',
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      gap: 6,
    },
    overviewMetricIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overviewMetricValue: {
      color: C.textDark,
      fontSize: 15,
      fontWeight: '800',
    },
    overviewMetricLabel: {
      color: C.subtext,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    overviewExcerptCard: {
      marginTop: 16,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: isDark ? C.surfaceAlt : 'rgba(255,255,255,0.58)',
      borderWidth: 1,
      borderColor: C.borderLight,
      gap: 6,
    },
    overviewExcerptMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    overviewExcerptLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: C.goldDark,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    overviewExcerptDate: {
      fontSize: 11,
      color: C.subtext,
      fontWeight: '600',
    },
    overviewExcerptText: {
      fontSize: 14,
      lineHeight: 22,
      color: C.textSoft,
    },

    strip: {
      marginHorizontal: 20,
      marginBottom: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 22,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.14 : 0.06,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 4,
    },
    stripHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    stripLabel: {
      fontSize: 11,
      color: C.primary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    stripCount: {
      fontSize: 11,
      color: C.subtext,
      fontWeight: '600',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? C.surfaceAlt : C.primarySoftBg,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginRight: 8,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    chipText: { fontSize: 12, color: C.textSoft, fontWeight: '600' },
    chipBubble: {
      marginLeft: 7,
      backgroundColor: C.primary,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    chipCount: { fontSize: 10, color: C.white, fontWeight: '800' },

    composeContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 52 },
    composeIntro: { marginBottom: 16 },
    composeIntroGradient: {
      borderRadius: 26,
      paddingHorizontal: 18,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 28,
      elevation: 6,
      gap: 16,
    },
    composeIntroTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    composeIntroCopy: { flex: 1, gap: 8 },
    composeIntroEyebrow: {
      fontSize: 11,
      color: C.primary,
      fontWeight: '700',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    composeIntroTitle: {
      fontSize: 24,
      lineHeight: 28,
      color: C.textDark,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    composeIntroSubtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: C.subtext,
    },
    composeIntroIcon: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(212,175,55,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.28)',
    },
    composeIntroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    composeIntroStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? C.surfaceAlt : 'rgba(255,255,255,0.52)',
      borderWidth: 1,
      borderColor: C.borderLight,
    },
    composeIntroStatText: {
      fontSize: 12,
      color: C.textSoft,
      fontWeight: '600',
    },

    datePicker: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surfaceGlass,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      marginBottom: 18,
      paddingVertical: 14,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.16 : 0.06,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 22,
      elevation: 3,
    },
    dateArrow: { paddingHorizontal: 16 },
    dateArrowDisabled: { opacity: 0.32 },
    dateCenter: { flex: 1, alignItems: 'center' },
    dateMain: { fontSize: 17, fontWeight: '700', color: C.textDark },
    dateTodayBtn: { fontSize: 12, color: C.primary, marginTop: 4, fontWeight: '600' },

    titleBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.surfaceGlass,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      paddingHorizontal: 16,
      paddingVertical: 13,
      marginBottom: 14,
    },
    titleInput: { flex: 1, color: C.text, fontSize: 15 },

    micSection: { alignItems: 'center', marginBottom: 12 },
    micRow: { alignItems: 'center', gap: 12 },
    micHint: { fontSize: 13, color: C.subtext, fontWeight: '600' },
    micRing: {
      width: 98,
      height: 98,
      borderRadius: 49,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.24)',
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 20,
      elevation: 10,
    },
    micRingRec: { shadowColor: C.red },
    micCore: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },

    liveWords: {
      backgroundColor: C.surfaceGlass,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      marginBottom: 12,
      minHeight: 58,
      width: '100%',
    },
    liveWordsLabel: { fontSize: 11, color: C.primary, fontWeight: '700', marginBottom: 5, letterSpacing: 0.5 },
    liveWordsText: { fontSize: 15, color: C.textSoft, letterSpacing: 1.2, fontStyle: 'italic' },

    transcribingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(212,175,55,0.10)',
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.28)',
      marginBottom: 16,
      width: '100%',
    },
    transcribingText: { fontSize: 14, color: C.goldDark, fontWeight: '600' },

    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
    divLine: { flex: 1, height: 1, backgroundColor: C.borderLight },
    divText: { color: C.dim, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },

    textBox: {
      backgroundColor: C.surfaceGlass,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      padding: 16,
      marginBottom: 16,
      minHeight: 154,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.16 : 0.06,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 22,
      elevation: 3,
    },
    textInput: { color: C.text, fontSize: 15, lineHeight: 24, minHeight: 108, maxHeight: 220 },
    charCount: { textAlign: 'right', color: C.dim, fontSize: 11, marginTop: 8, fontWeight: '600' },

    actionRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: C.surfaceGlass,
      borderRadius: 18,
      paddingVertical: 15,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    cancelBtnText: { color: C.subtext, fontWeight: '700', fontSize: 14 },
    saveBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: C.primary,
      borderRadius: 18,
      paddingVertical: 15,
      shadowColor: C.primary,
      shadowOpacity: 0.32,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 18,
      elevation: 6,
    },
    saveBtnOff: { opacity: 0.42 },
    saveBtnText: { color: C.white, fontWeight: '800', fontSize: 15 },

    journalContent: { paddingTop: 2, paddingBottom: 34 },
    journalBody: { paddingHorizontal: 20 },
    centerBox: {
      alignItems: 'center',
      marginTop: 22,
      paddingVertical: 30,
      paddingHorizontal: 24,
      borderRadius: 24,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      gap: 10,
    },
    centerText: { color: C.subtext, fontSize: 13, fontWeight: '600' },
    emptyBox: {
      alignItems: 'center',
      marginTop: 18,
      paddingVertical: 34,
      paddingHorizontal: 28,
      borderRadius: 24,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    emptyEmoji: { fontSize: 58, marginBottom: 16 },
    emptyTitle: { fontSize: 21, fontWeight: '800', color: C.textDark, marginBottom: 8, textAlign: 'center' },
    emptySub: { fontSize: 13, color: C.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
    emptyBtn: {
      backgroundColor: C.primary,
      borderRadius: 999,
      paddingHorizontal: 28,
      paddingVertical: 12,
      shadowColor: C.primary,
      shadowOpacity: 0.28,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 18,
    },
    emptyBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },

    tabRow: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 10,
      marginTop: 6,
      backgroundColor: C.surfaceGlass,
      borderRadius: 18,
      padding: 4,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.16 : 0.05,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 3,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 14,
    },
    tabBtnActive: {
      backgroundColor: isDark ? C.surfaceAlt : 'rgba(255,255,255,0.86)',
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      shadowColor: C.primary,
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 14,
    },
    tabBtnText: { fontSize: 13, fontWeight: '700', color: C.subtext },
    tabBtnTextActive: { color: C.primary },

    bookScroll: { paddingTop: 10, paddingBottom: 40 },
    bookHeaderBlock: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
    bookMoonGlyph: { fontSize: 44, marginBottom: 8 },
    bookHeaderTitle: { fontSize: 27, fontWeight: '800', color: C.goldDark, letterSpacing: 1.2, textAlign: 'center' },
    bookHeaderSub: { fontSize: 13, color: C.subtext, marginTop: 5, fontStyle: 'italic', textAlign: 'center' },
    monthPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: C.surfaceGlass,
      borderRadius: 20,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    monthArrow: { padding: 8 },
    monthArrowDisabled: { opacity: 0.3 },
    monthLabel: { fontSize: 17, fontWeight: '800', color: C.textDark, minWidth: 140, textAlign: 'center' },
    storyCard: {
      marginHorizontal: 20,
      backgroundColor: C.surfaceGlass,
      borderRadius: 26,
      padding: 18,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.2 : 0.09,
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 26,
      elevation: 6,
      minHeight: 220,
    },
    loadingBlock: { alignItems: 'center', paddingVertical: 34, gap: 12 },
    loadingText: { fontSize: 16, fontWeight: '700', color: C.textDark },
    loadingSubText: { fontSize: 12, color: C.subtext, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
    symbolsSection: { marginBottom: 14 },
    sectionLabel: { fontSize: 10, fontWeight: '800', color: C.goldDark, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 8 },
    symbolsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    symChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(212,175,55,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.28)',
    },
    symChipText: { fontSize: 12, color: C.goldDark, fontWeight: '700' },
    countBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    countText: { fontSize: 12, color: C.subtext, fontStyle: 'italic' },
    storyText: { fontSize: 15, lineHeight: 27, color: C.textSoft, marginBottom: 20 },
    exportRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
    refreshBtn: {
      width: 46,
      height: 46,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primaryTint,
    },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.primary,
      borderRadius: 15,
      paddingVertical: 13,
      paddingHorizontal: 20,
    },
    exportBtnText: { color: C.white, fontSize: 14, fontWeight: '800' },
    emptyBlock: { alignItems: 'center', paddingVertical: 28, gap: 10 },
    emptyIcon: { fontSize: 36 },
    storyEmptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
    storyEmptySub: { fontSize: 12, color: C.subtext, textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 },
    generateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.gold,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 22,
      marginTop: 6,
    },
    generateBtnText: { color: C.textDark, fontSize: 14, fontWeight: '800' },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 14,
      backgroundColor: C.surfaceGlass,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    infoText: { flex: 1, fontSize: 12, color: C.subtext, lineHeight: 18 },

    card: {
      backgroundColor: C.surfaceGlass,
      borderRadius: 24,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.18 : 0.06,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      elevation: 4,
    },
    cardActive: {
      borderColor: C.primary,
      shadowColor: C.primary,
      shadowOpacity: 0.18,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    cardMetaColumn: { flex: 1, gap: 8 },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    cardDatePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: C.primaryTint,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      alignSelf: 'flex-start',
    },
    cardStateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    cardStateBadgePending: {
      backgroundColor: 'rgba(212,175,55,0.10)',
      borderColor: 'rgba(212,175,55,0.24)',
    },
    cardStateBadgeReady: {
      backgroundColor: C.primaryTint,
      borderColor: C.surfaceGlassBorder,
    },
    cardStateText: { fontSize: 11, fontWeight: '700' },
    cardActions: { alignItems: 'center', gap: 10, paddingTop: 2 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: C.textDark, letterSpacing: -0.4 },
    cardDate: { fontSize: 11, color: C.subtext, fontWeight: '700' },
    cardPreviewFrame: {
      marginTop: 14,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: isDark ? C.surfaceAlt : 'rgba(255,255,255,0.56)',
      borderWidth: 1,
      borderColor: C.borderLight,
    },
    cardPreview: { fontSize: 15, color: C.textSoft, lineHeight: 23 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    badge: {
      backgroundColor: isDark ? C.surfaceAlt : C.primarySoftBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    badgeText: { fontSize: 11, color: C.primary, fontWeight: '700' },
    insightRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    insightBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderWidth: 1,
    },
    insightGreen: { backgroundColor: C.greenBg, borderColor: 'rgba(63,164,106,0.35)' },
    insightOrange: { backgroundColor: C.orangeBg, borderColor: 'rgba(230,81,0,0.28)' },
    insightBadgeText: { fontSize: 11, fontWeight: '800' },
    pendingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(212,175,55,0.10)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      alignSelf: 'flex-start',
      marginTop: 12,
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.24)',
    },
    pendingPillText: { color: C.goldDark, fontSize: 12, fontWeight: '700' },

    interp: {
      marginTop: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: C.borderLight,
      paddingTop: 16,
    },
    speakBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: C.accentSoft,
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: 'rgba(46,74,156,0.16)',
    },
    speakText: { color: C.accent, fontSize: 12, fontWeight: '700' },
    section: {
      gap: 8,
      borderRadius: 18,
      padding: 14,
      backgroundColor: isDark ? C.surfaceAlt : 'rgba(255,255,255,0.54)',
      borderWidth: 1,
      borderColor: C.borderLight,
    },
    sectionGreen: {
      backgroundColor: C.greenBg,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: 'rgba(63,164,106,0.26)',
    },
    sectionOrange: {
      backgroundColor: C.orangeBg,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: 'rgba(230,81,0,0.24)',
    },
    sectionHead: { fontSize: 13, fontWeight: '800', color: C.textDark, marginBottom: 2, letterSpacing: 0.2 },
    interpText: { fontSize: 14, color: C.textSoft, lineHeight: 22 },
    bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    bulletText: { flex: 1, fontSize: 13, lineHeight: 20 },
  });
}

function buildPdfHtml(story: string, period: string, symbols: string[], entries: DreamEntryResponse[]): string {
  const symbolBadges = (symbols ?? [])
    .map(s => `<span class="badge">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`)
    .join(' ');

  const dreamRows = entries
    .sort((a, b) => (a.dreamDate ?? '').localeCompare(b.dreamDate ?? ''))
    .map((d, i) => {
      const dateLabel = new Date(d.dreamDate ?? '').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      return `<div class="dream-entry">
        <div class="dream-date">📅 ${i + 1}. Rüya — ${dateLabel}</div>
        <div class="dream-text">${(d.text ?? '').replace(/\n/g, '<br/>')}</div>
      </div>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Lora', Georgia, serif;
    background: linear-gradient(135deg, ${COLORS.pdfBgStart} 0%, ${COLORS.pdfBgEnd} 100%);
    color: ${COLORS.pdfText};
    min-height: 100vh;
    padding: 60px 50px;
  }
  .header { text-align: center; margin-bottom: 36px; border-bottom: 1px solid rgba(200,168,75,0.4); padding-bottom: 24px; }
  .title { font-family: 'Cinzel', serif; font-size: 32px; color: ${COLORS.pdfGold}; letter-spacing: 3px; text-transform: uppercase; }
  .period { font-size: 16px; color: ${COLORS.pdfViolet}; margin-top: 8px; font-style: italic; }
  .glyph { font-size: 48px; margin-bottom: 12px; }
  .symbols { margin: 20px 0; text-align: center; }
  .badge {
    display: inline-block;
    background: rgba(200,168,75,0.15);
    border: 1px solid rgba(200,168,75,0.35);
    color: ${COLORS.pdfGold};
    border-radius: 20px;
    padding: 4px 12px;
    margin: 4px;
    font-size: 13px;
  }
  .section-label { font-family: 'Cinzel', serif; font-size: 11px; color: ${COLORS.pdfSection}; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 10px; }
  .story { font-size: 16px; line-height: 2; color: ${COLORS.pdfStory}; text-align: justify; margin: 24px 0; background: rgba(255,255,255,0.03); border-left: 3px solid ${COLORS.pdfGold}; padding: 20px 24px; border-radius: 4px; }
  .dreams-section { margin-top: 40px; }
  .dreams-title { font-family: 'Cinzel', serif; font-size: 14px; color: ${COLORS.pdfGold}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; border-bottom: 1px solid rgba(200,168,75,0.25); padding-bottom: 8px; }
  .dream-entry { margin-bottom: 18px; padding: 14px 18px; background: rgba(255,255,255,0.04); border-left: 2px solid rgba(124,77,255,0.5); border-radius: 4px; }
  .dream-date { font-size: 11px; color: ${COLORS.pdfDreamDate}; font-family: 'Cinzel', serif; letter-spacing: 1px; margin-bottom: 6px; }
  .dream-text { font-size: 14px; line-height: 1.8; color: ${COLORS.pdfDreamText}; }
  .footer { text-align: center; margin-top: 40px; font-size: 12px; color: ${COLORS.pdfFooter}; font-style: italic; border-top: 1px solid rgba(200,168,75,0.2); padding-top: 16px; }
</style>
</head>
<body>
  <div class="header">
    <div class="glyph">📖</div>
    <div class="title">Rüya Kitabım</div>
    <div class="period">${period} — Bilinçaltı Yolculuğu</div>
  </div>
  ${symbolBadges ? `<div class="section-label">✦ Dönemin Sembolleri</div><div class="symbols">${symbolBadges}</div>` : ''}
  <div class="section-label" style="margin-top:24px">✦ Kozmik Yorum</div>
  <div class="story">${story.replace(/\n/g, '<br/>')}</div>
  ${dreamRows ? `<div class="dreams-section"><div class="dreams-title">📋 Bu Aydaki Rüyalarım (${entries.length} Adet)</div>${dreamRows}</div>` : ''}
  <div class="footer">Astro Guru tarafından oluşturuldu • ${period}</div>
</body>
</html>`;
}
