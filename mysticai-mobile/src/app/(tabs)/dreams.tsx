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
import { ErrorStateCard, SafeScreen } from '../../components/ui';
import { dreamService } from '../../services/dream.service';
import DreamDictionary from '../../components/DreamDictionary';
import type { DreamEntryResponse } from '../../services/dream.service';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../constants/colors';

const MONTHS_TR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

type Tab      = 'journal' | 'compose' | 'dictionary' | 'book';
type RecState = 'idle' | 'recording' | 'transcribing' | 'done';

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
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      return {
        interpretation: typeof parsed.interpretation === 'string' ? parsed.interpretation : raw,
        opportunities:  Array.isArray(parsed.opportunities) ? parsed.opportunities : (dream.opportunities ?? []),
        warnings:       Array.isArray(parsed.warnings)      ? parsed.warnings      : (dream.warnings ?? []),
      };
    } catch { /* fall through to safe default */ }
  }
  return {
    interpretation: raw,
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

  // ── Mic animation ─────────────────────────────────────────────────
  const micScale = useSharedValue(1);
  const micGlow  = useSharedValue(0);

  const userId = user?.id ?? 0;

  useEffect(() => {
    if (userId) { fetchDreams(userId); fetchSymbols(userId); }
  }, [userId]);

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
  const yearMonthLabel = `${MONTHS_TR[bookMonth]} ${bookYear}`;
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

  // ─── Dream card ───────────────────────────────────────────────────
  const renderCard = (dream: DreamEntryResponse) => {
    const expanded = expandedId === dream.id;
    const pending  = dream.interpretationStatus === 'PENDING';
    const speaking = speakingId === dream.id;
    const deleting = deletingId === dream.id;
    const recurring = dream.recurringSymbols ?? [];
    const { interpretation, opportunities, warnings } = parseInterpretation(dream);

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
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              {dream.title ? (
                <Text style={styles.cardTitle}>{dream.title}</Text>
              ) : null}
              <Text style={styles.cardDate}>{fmtCardDate(dream.dreamDate)}</Text>
              <Text style={styles.cardPreview} numberOfLines={expanded ? undefined : 2}>
                {dream.text}
              </Text>
            </View>
            <View style={styles.cardActions}>
              {deleting
                ? <ActivityIndicator size="small" color={colors.red} />
                : <TouchableOpacity
                    onPress={() => handleDelete(dream.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Rüyayı sil"
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
              <Text style={styles.pendingPillText}>Kozmik şifre çözülüyor…</Text>
            </View>
          )}

          {/* Expanded interpretation */}
          {expanded && !pending && interpretation && (
            <Animated.View entering={FadeIn.duration(260)} style={styles.interp}>

              {/* Speak button */}
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={() => handleSpeak(dream)}
                accessibilityLabel={speaking ? 'Sesli okumayı durdur' : 'Sesli oku'}
                accessibilityRole="button"
              >
                <Ionicons name={speaking ? 'stop-circle' : 'volume-high'} size={17} color={colors.accent} />
                <Text style={styles.speakText}>{speaking ? 'Durdur' : 'Sesli Oku'}</Text>
              </TouchableOpacity>

              {/* 🌙 Yorum */}
              <View style={styles.section}>
                <Text style={styles.sectionHead}>🌙 Rüyanın Kozmik Şifresi</Text>
                <Text style={styles.interpText}>{interpretation}</Text>
              </View>

              {/* ✨ Fırsatlar */}
              {opportunities.length > 0 && (
                <View style={[styles.section, styles.sectionGreen]}>
                  <Text style={[styles.sectionHead, {color: colors.green}]}>✨ Fırsatlar</Text>
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
                  <Text style={[styles.sectionHead, {color: colors.orange}]}>⚠️ Dikkat Edilmesi Gerekenler</Text>
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
      {/* ── Date picker ── */}
      <View style={styles.datePicker}>
        <TouchableOpacity
          onPress={() => changeDate(-1)}
          style={styles.dateArrow}
          accessibilityLabel="Önceki gün"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSoft} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateMain}>{fmtDate(selectedDate)}</Text>
          {!isToday(selectedDate) && (
            <TouchableOpacity
              onPress={() => setSelectedDate(new Date())}
              accessibilityLabel="Bugüne dön"
              accessibilityRole="button"
            >
              <Text style={styles.dateTodayBtn}>Bugüne dön</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => changeDate(1)}
          style={[styles.dateArrow, isToday(selectedDate) && styles.dateArrowDisabled]}
          disabled={isToday(selectedDate)}
          accessibilityLabel="Sonraki gün"
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
          placeholder="Rüyaya başlık ekle (opsiyonel)"
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
            <Text style={styles.liveWordsLabel}>🎙 Dinleniyor…</Text>
          </Animated.View>
        )}

        {/* Transcribing indicator */}
        {recState === 'transcribing' && (
          <Animated.View entering={FadeIn} style={styles.transcribingBox}>
            <ActivityIndicator size="small" color={colors.goldDark} />
            <Text style={styles.transcribingText}>Ses metne çevriliyor…</Text>
          </Animated.View>
        )}

        {/* Mic button */}
        {(recState === 'idle' || recState === 'recording') && (
          <View style={styles.micRow}>
            <Text style={styles.micHint}>
              {recState === 'idle' ? 'Sesle anlat' : `⏺ ${fmtDur(recDuration)}`}
            </Text>
            <TouchableOpacity
              onPress={() => recState === 'idle' ? startRec() : stopRec()}
              activeOpacity={0.8}
              accessibilityLabel={recState === 'recording' ? 'Kaydı durdur' : 'Sesle kaydet'}
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
          <Text style={styles.divText}>{recState === 'done' ? 'düzenle' : 'ya da yaz'}</Text>
          <View style={styles.divLine} />
        </View>
      )}

      {/* Text area */}
      {(recState === 'idle' || recState === 'done') && (
        <View style={styles.textBox}>
          <TextInput
            style={styles.textInput}
            placeholder={recState === 'done'
              ? 'Transkripsiyon tamamlandı — dilediğin gibi düzenleyebilirsin…'
              : 'Bu gece gördüğün rüyayı anlat…'}
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
            accessibilityLabel="Vazgeç"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.subtext} />
            <Text style={styles.cancelBtnText}>Vazgeç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (!dreamText.trim() || submitting) && styles.saveBtnOff]}
            onPress={handleSave}
            disabled={!dreamText.trim() || submitting}
            accessibilityLabel="Kaydet ve yorumla"
            accessibilityRole="button"
          >
            {submitting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <><Ionicons name="sparkles" size={17} color={colors.white} />
                 <Text style={styles.saveBtnText}>Kaydet ve Yorumla</Text></>
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
        <TouchableOpacity onPress={prevBookMonth} style={styles.monthArrow} accessibilityLabel="Önceki ay" accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.goldDark} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{yearMonthLabel}</Text>
        <TouchableOpacity
          onPress={nextBookMonth}
          style={[styles.monthArrow, !isCurrentOrPastBook && styles.monthArrowDisabled]}
          disabled={!isCurrentOrPastBook}
          accessibilityLabel="Sonraki ay"
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
            accessibilityLabel="Aylık hikâyeyi tekrar yükle"
          />
        ) : storyLoading || generating ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{generating ? 'Hikâye yazılıyor...' : 'Yükleniyor...'}</Text>
            <Text style={styles.loadingSubText}>Ay mevsiminizin hikâyesi kalemle şekilleniyor...</Text>
          </View>
        ) : isPending ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={colors.goldDark} />
            <Text style={styles.loadingText}>Yapay zeka yazıyor...</Text>
            <Text style={styles.loadingSubText}>Birkaç saniye daha, bilinçaltı imgeleriniz sıraya diziliyor...</Text>
          </View>
        ) : isCompleted && monthlyStory?.story ? (
          <>
            {monthlyStory.dominantSymbols?.length > 0 && (
              <View style={styles.symbolsSection}>
                <Text style={styles.sectionLabel}>✦ Dönemin Sembolleri</Text>
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
                accessibilityLabel="Hikâyeyi yenile"
                accessibilityRole="button"
              >
                {bookRefreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={18} color={colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, { flex: 1 }]}
                onPress={handleExportPdf}
                disabled={pdfExporting}
                accessibilityLabel="PDF olarak indir"
                accessibilityRole="button"
              >
                {pdfExporting ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="download-outline" size={16} color={colors.white} />}
                <Text style={styles.exportBtnText}>{pdfExporting ? 'PDF Hazırlanıyor...' : 'PDF Olarak İndir'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : isEmpty ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyIcon}>🌑</Text>
            <Text style={styles.emptyTitle}>{yearMonthLabel} henüz boş</Text>
            <Text style={styles.emptySub}>Bu aya ait rüyalar kaydedildiğinde aylık hikâyen yazılabilir.</Text>
            <TouchableOpacity style={styles.generateBtn} onPress={handleBookGenerate} disabled={storyLoading} accessibilityLabel="Hikâyeyi oluştur" accessibilityRole="button">
              <Ionicons name="sparkles" size={15} color={colors.white} />
              <Text style={styles.generateBtnText}>Hikâyeyi Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>Hikâye hazır değil</Text>
            <Text style={styles.emptySub}>{yearMonthLabel} ayının rüya yolculuğunu yapay zeka ile anlat.</Text>
            <TouchableOpacity style={styles.generateBtn} onPress={handleBookGenerate} disabled={generating || storyLoading} accessibilityLabel="Hikâyeyi oluştur" accessibilityRole="button">
              {generating ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="sparkles" size={15} color={colors.white} />}
              <Text style={styles.generateBtnText}>Hikâyeyi Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={15} color={colors.subtext} />
        <Text style={styles.infoText}>
          Her ay sonunda yapay zeka, rüyalarını Jungçu psikoloji ve astroloji perspektifiyle şiirsel bir hikâyeye dönüştürür. PDF'i indirebilir veya paylaşabilirsin.
        </Text>
      </View>
    </ScrollView>
  );

  // ─── Screen ───────────────────────────────────────────────────────
  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <LinearGradient colors={[colors.background, colors.surfaceMuted, colors.background]} style={styles.container}>
        {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('tabs.dream')}</Text>
          <Text style={styles.headerSub}>{t('dreams.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, tab === 'compose' && styles.addBtnClose]}
          onPress={() => {
            if (tab === 'compose') { resetCompose(); setTab('journal'); }
            else setTab('compose');
          }}
          accessibilityLabel={tab === 'compose' ? 'Yazmayı kapat' : 'Yeni rüya ekle'}
          accessibilityRole="button"
        >
          <Ionicons name={tab === 'compose' ? 'close' : 'add'} size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      {tab !== 'compose' && (
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
      )}

      {/* Recurring symbols strip (journal only) */}
      {tab === 'journal' && symbols.filter(s => s.recurring).length > 0 && (
        <Animated.View entering={FadeIn} style={styles.strip}>
          <Text style={styles.stripLabel}>Tekrar eden semboller</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {symbols.filter(s => s.recurring).map((s, i) => (
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.journalContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.centerText}>Rüyalar yükleniyor…</Text>
            </View>
          )}
          {!loading && error && (
            <View style={styles.centerBox}>
              <ErrorStateCard
                message={error}
                onRetry={() => fetchDreams(userId)}
                accessibilityLabel="Rüyaları tekrar yükle"
              />
            </View>
          )}
          {!loading && !error && dreams.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🌙</Text>
              <Text style={styles.emptyTitle}>Henüz rüya kaydın yok</Text>
              <Text style={styles.emptySub}>İlk rüyanı kaydetmek için + butonuna dokun</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setTab('compose')}
                accessibilityLabel="İlk rüyamı ekle"
                accessibilityRole="button"
              >
                <Text style={styles.emptyBtnText}>İlk Rüyamı Ekle</Text>
              </TouchableOpacity>
            </View>
          )}
          {!loading && !error && dreams.map(d => renderCard(d))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </LinearGradient>
    </SafeScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 56 : 32 },

  // Header
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                 paddingHorizontal:20, paddingBottom:14 },
  headerTitle: { fontSize:25, fontWeight:'700', color:C.text, letterSpacing:0.3 },
  headerSub:   { fontSize:12, color:C.subtext, marginTop:2 },
  addBtn:      { width:38, height:38, borderRadius:19, backgroundColor:C.primary,
                 alignItems:'center', justifyContent:'center' },
  addBtnClose: { backgroundColor: C.overlayDark },

  // Symbol strip
  strip:      { paddingHorizontal:20, marginBottom:10 },
  stripLabel: { fontSize:10, color:C.dim, marginBottom:7, textTransform:'uppercase', letterSpacing:0.8 },
  chip:       { flexDirection:'row', alignItems:'center', backgroundColor:C.surfaceAlt,
                borderRadius:18, paddingHorizontal:11, paddingVertical:5, marginRight:8,
                borderWidth:1, borderColor:C.border },
  chipText:   { fontSize:12, color:C.textSoft },
  chipBubble: { marginLeft:5, backgroundColor:C.primary, borderRadius:9,
                paddingHorizontal:5, paddingVertical:1 },
  chipCount:  { fontSize:9, color:C.white, fontWeight:'700' },

  // Compose
  composeContent: { paddingHorizontal:20, paddingTop:6, paddingBottom:48 },

  // Date picker
  datePicker: { flexDirection:'row', alignItems:'center', backgroundColor:C.surface,
                borderRadius:14, borderWidth:1, borderColor:C.border,
                marginBottom:20, paddingVertical:12 },
  dateArrow:  { paddingHorizontal:14 },
  dateArrowDisabled: { opacity:0.3 },
  dateCenter: { flex:1, alignItems:'center' },
  dateMain:   { fontSize:16, fontWeight:'600', color:C.text },
  dateTodayBtn: { fontSize:11, color:C.primary, marginTop:4 },

  // Title input
  titleBox:   { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.surface,
                borderRadius:12, borderWidth:1, borderColor:C.border,
                paddingHorizontal:14, paddingVertical:10, marginBottom:14 },
  titleInput: { flex:1, color:C.text, fontSize:14 },

  // Mic
  micSection:       { alignItems:'center', marginBottom:10 },
  micRow:           { alignItems:'center', gap:10 },
  micHint:          { fontSize:13, color:C.subtext },
  micRing:          { width:86, height:86, borderRadius:43, alignItems:'center',
                      justifyContent:'center', shadowColor:C.primary,
                      shadowOffset:{width:0,height:0}, shadowRadius:18, elevation:10 },
  micRingRec:       { shadowColor:C.red },
  micCore:          { width:78, height:78, borderRadius:39, alignItems:'center', justifyContent:'center' },

  // Live words
  liveWords:     { backgroundColor:C.surfaceAlt, borderRadius:12, padding:12,
                   borderWidth:1, borderColor:C.border, marginBottom:12, minHeight:58,
                   width:'100%' },
  liveWordsLabel:{ fontSize:11, color:C.primary, fontWeight:'600', marginBottom:5 },
  liveWordsText: { fontSize:15, color:C.textSoft, letterSpacing:1.5, fontStyle:'italic' },

  // Transcribing
  transcribingBox: { flexDirection:'row', alignItems:'center', gap:8,
                     backgroundColor:C.surfaceAlt, borderRadius:12, padding:14,
                     borderWidth:1, borderColor:C.goldDark, marginBottom:16, width:'100%' },
  transcribingText:{ fontSize:14, color:C.goldDark },

  // Divider
  divider: { flexDirection:'row', alignItems:'center', marginVertical:16, gap:10 },
  divLine: { flex:1, height:1, backgroundColor:C.border },
  divText:  { color:C.dim, fontSize:12 },

  // Text area
  textBox:   { backgroundColor:C.surface, borderRadius:14, borderWidth:1, borderColor:C.border,
               padding:14, marginBottom:14, minHeight:130 },
  textInput: { color:C.text, fontSize:15, lineHeight:22, minHeight:95 },
  charCount: { textAlign:'right', color:C.dim, fontSize:10, marginTop:6 },

  // Action buttons
  actionRow:   { flexDirection:'row', gap:10 },
  cancelBtn:   { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
                 gap:6, backgroundColor:C.surfaceAlt, borderRadius:14, paddingVertical:14,
                 borderWidth:1, borderColor:C.border },
  cancelBtnText:{ color:C.subtext, fontWeight:'600', fontSize:14 },
  saveBtn:     { flex:2, flexDirection:'row', alignItems:'center', justifyContent:'center',
                 gap:7, backgroundColor:C.primary, borderRadius:14, paddingVertical:14 },
  saveBtnOff:  { opacity:0.38 },
  saveBtnText: { color:C.white, fontWeight:'700', fontSize:15 },

  // Journal
  journalContent: { paddingHorizontal:14, paddingTop:4 },
  centerBox:      { alignItems:'center', paddingTop:55, gap:10 },
  centerText:     { color:C.subtext, fontSize:13 },
  emptyBox:       { alignItems:'center', paddingTop:55, paddingHorizontal:32 },
  emptyEmoji:     { fontSize:58, marginBottom:14 },
  emptyTitle:     { fontSize:19, fontWeight:'600', color:C.text, marginBottom:7, textAlign:'center' },
  emptySub:       { fontSize:13, color:C.subtext, textAlign:'center', lineHeight:19, marginBottom:22 },
  emptyBtn:       { backgroundColor:C.primary, borderRadius:22, paddingHorizontal:26, paddingVertical:11 },
  emptyBtnText:   { color:C.white, fontWeight:'600', fontSize:14 },

  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 6,
    marginTop: 4,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: C.background,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: C.subtext },
  tabBtnTextActive: { color: C.primary },

  // Dream book tab
  bookScroll: { paddingTop: 24, paddingBottom: 40 },
  bookHeaderBlock: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  bookMoonGlyph: { fontSize: 44, marginBottom: 8 },
  bookHeaderTitle: { fontSize: 26, fontWeight: '800', color: C.goldDark, letterSpacing: 1.5, textAlign: 'center' },
  bookHeaderSub: { fontSize: 13, color: C.subtext, marginTop: 4, fontStyle: 'italic', textAlign: 'center' },
  monthPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginHorizontal: 20, marginBottom: 16, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  monthArrow: { padding: 6 },
  monthArrowDisabled: { opacity: 0.3 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: C.text, minWidth: 140, textAlign: 'center' },
  storyCard: { marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, shadowColor: C.primary, shadowOpacity: 0.2, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 4, minHeight: 200 },
  loadingBlock: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  loadingText: { fontSize: 16, fontWeight: '600', color: C.text },
  loadingSubText: { fontSize: 12, color: C.subtext, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 20 },
  symbolsSection: { marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: C.goldDark, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  symbolsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  symChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(200,168,75,0.12)', borderWidth: 1, borderColor: 'rgba(200,168,75,0.3)' },
  symChipText: { fontSize: 12, color: C.goldDark, fontWeight: '600' },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  countText: { fontSize: 12, color: C.subtext, fontStyle: 'italic' },
  storyText: { fontSize: 15, lineHeight: 26, color: C.text, marginBottom: 20 },
  exportRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
  refreshBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(157,78,221,0.07)' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  exportBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
  emptyBlock: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 12, color: C.subtext, textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 22, marginTop: 6 },
  generateBtnText: { color: C.text, fontSize: 14, fontWeight: '800' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginTop: 14, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  infoText: { flex: 1, fontSize: 12, color: C.subtext, lineHeight: 18 },

  // Card
  card:       { backgroundColor:C.surface, borderRadius:16, padding:15,
                marginBottom:11, borderWidth:1, borderColor:C.border },
  cardActive: { borderColor:C.primary, borderWidth:1.5 },
  cardRow:    { flexDirection:'row', alignItems:'flex-start', gap:8 },
  cardActions:{ alignItems:'center', gap:8 },
  cardTitle:  { fontSize:14, fontWeight:'700', color:C.primary, marginBottom:2 },
  cardDate:   { fontSize:11, color:C.subtext, marginBottom:4 },
  cardPreview:{ fontSize:14, color:C.textSoft, lineHeight:20 },
  badgeRow:   { flexDirection:'row', flexWrap:'wrap', gap:5, marginTop:9 },
  badge:      { backgroundColor:C.surfaceAlt, borderRadius:11, paddingHorizontal:9,
                paddingVertical:3, borderWidth:1, borderColor:C.primary },
  badgeText:  { fontSize:11, color:C.primaryLight, fontWeight:'600' },
  // Insight badges (opportunity / warning counts on collapsed card)
  insightRow:       { flexDirection:'row', gap:6, marginTop:8, flexWrap:'wrap' },
  insightBadge:     { flexDirection:'row', alignItems:'center', borderRadius:12,
                      paddingHorizontal:10, paddingVertical:4 },
  insightGreen:     { backgroundColor:C.greenBg, borderWidth:1, borderColor:C.green },
  insightOrange:    { backgroundColor:C.orangeBg, borderWidth:1, borderColor:C.orange },
  insightBadgeText: { fontSize:11, fontWeight:'700' },
  pendingPill:{ flexDirection:'row', alignItems:'center', backgroundColor:C.surfaceAlt,
                borderRadius:20, paddingHorizontal:12, paddingVertical:7,
                alignSelf:'flex-start', marginTop:10, borderWidth:1, borderColor:C.border },
  pendingPillText:{ color:C.subtext, fontSize:12, fontStyle:'italic' },

  // Interpretation
  interp:       { marginTop:14, gap:12, borderTopWidth:1, borderTopColor:C.border, paddingTop:14 },
  speakBtn:     { flexDirection:'row', alignItems:'center', gap:5, alignSelf:'flex-end',
                  backgroundColor:C.surfaceAlt, borderRadius:18, paddingHorizontal:12,
                  paddingVertical:7, borderWidth:1, borderColor:C.accent },
  speakText:    { color:C.accent, fontSize:12, fontWeight:'600' },
  section:      { gap:7 },
  sectionGreen: { backgroundColor:C.greenBg, borderRadius:10, padding:10 },
  sectionOrange:{ backgroundColor:C.orangeBg, borderRadius:10, padding:10 },
  sectionHead:  { fontSize:13, fontWeight:'700', color:C.text, marginBottom:3 },
  interpText:   { fontSize:14, color:C.textSoft, lineHeight:21 },
  bulletRow:    { flexDirection:'row', gap:7, alignItems:'flex-start' },
  bulletText:   { flex:1, fontSize:13, lineHeight:20 },
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
  <div class="footer">Mystic AI tarafından oluşturuldu • ${period}</div>
</body>
</html>`;
}
