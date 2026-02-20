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
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
  Easing, FadeIn, FadeInDown, SlideInDown,
  interpolate,
} from 'react-native-reanimated';
import { useDreamStore } from '../../store/useDreamStore';
import { useAuthStore } from '../../store/useAuthStore';
import { dreamService } from '../../services/dream.service';
import DreamDictionary from '../../components/DreamDictionary';
import type { DreamEntryResponse } from '../../services/dream.service';

// ─── Light palette ───────────────────────────────────────────────────
const C = {
  bg:          '#F9F7FB',
  bgGrad1:     '#EDE9F5',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F3EFF9',
  border:      '#E6E1EA',
  primary:     '#9D4EDD',
  primaryLight:'#C784F7',
  accent:      '#2E4A9C',
  gold:        '#8C6F1A',
  green:       '#3FA46A',
  greenBg:     'rgba(63,164,106,0.12)',
  orange:      '#C86400',
  orangeBg:    'rgba(200,100,0,0.12)',
  red:         '#C04A4A',
  text:        '#1E1E1E',
  textSoft:    '#4A4A5A',
  subtext:     '#7A7A7A',
  dim:         'rgba(0,0,0,0.3)',
  white:       '#FFFFFF',
};
// ─────────────────────────────────────────────────────────────────────

type Tab      = 'journal' | 'compose' | 'dictionary';
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
  const { user }        = useAuthStore();
  const {
    dreams, symbols, loading, submitting, transcribing,
    fetchDreams, fetchSymbols, submitDream, transcribeAudio,
    deleteDream, pollUntilComplete,
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
      if (!granted) { Alert.alert('İzin Gerekli', 'Mikrofon izni veriniz.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordingUri.current = null;
      setRecState('recording');
    } catch { Alert.alert('Hata', 'Ses kaydı başlatılamadı.'); }
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
      Alert.alert('Çözümleme Hatası', e.message ?? 'Ses metne çevrilemedi.');
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
    } catch { Alert.alert('Hata', 'Rüya kaydedilemedi.'); }
  };

  // ─── Delete dream ─────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    Alert.alert('Rüyayı Sil', 'Bu rüya kaydını silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try { await deleteDream(id); } catch { Alert.alert('Hata', 'Silinemedi.'); }
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
    if (interpretation)        parts.push('Kozmik yorum: ' + interpretation);
    if (opportunities.length)  parts.push('Fırsatlar: ' + opportunities.join('. '));
    if (warnings.length)       parts.push('Dikkat: '    + warnings.join('. '));
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
                ? <ActivityIndicator size="small" color={C.red} />
                : <TouchableOpacity onPress={() => handleDelete(dream.id)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                    <Ionicons name="trash-outline" size={17} color={C.dim} />
                  </TouchableOpacity>
              }
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16} color={C.subtext} style={{ marginTop: 4 }}
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
                  <Text style={[styles.insightBadgeText, { color: C.green }]}>
                    ✨ {opportunities.length} fırsat
                  </Text>
                </View>
              )}
              {warnings.length > 0 && (
                <View style={[styles.insightBadge, styles.insightOrange]}>
                  <Text style={[styles.insightBadgeText, { color: C.orange }]}>
                    ⚠️ {warnings.length} uyarı
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Status pill */}
          {pending && (
            <View style={styles.pendingPill}>
              <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 6 }} />
              <Text style={styles.pendingPillText}>Kozmik şifre çözülüyor…</Text>
            </View>
          )}

          {/* Expanded interpretation */}
          {expanded && !pending && interpretation && (
            <Animated.View entering={FadeIn.duration(260)} style={styles.interp}>

              {/* Speak button */}
              <TouchableOpacity style={styles.speakBtn} onPress={() => handleSpeak(dream)}>
                <Ionicons name={speaking ? 'stop-circle' : 'volume-high'} size={17} color={C.accent} />
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
                  <Text style={[styles.sectionHead, {color: C.green}]}>✨ Fırsatlar</Text>
                  {opportunities.map((op, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons name="checkmark-circle" size={15} color={C.green} style={{marginTop:3}} />
                      <Text style={[styles.bulletText, {color: C.green}]}>{op}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* ⚠️ Uyarılar */}
              {warnings.length > 0 && (
                <View style={[styles.section, styles.sectionOrange]}>
                  <Text style={[styles.sectionHead, {color: C.orange}]}>⚠️ Dikkat Edilmesi Gerekenler</Text>
                  {warnings.map((w, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons name="alert-circle" size={15} color={C.orange} style={{marginTop:3}} />
                      <Text style={[styles.bulletText, {color: C.orange}]}>{w}</Text>
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
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateMain}>{fmtDate(selectedDate)}</Text>
          {!isToday(selectedDate) && (
            <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
              <Text style={styles.dateTodayBtn}>Bugüne dön</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => changeDate(1)}
          style={[styles.dateArrow, isToday(selectedDate) && styles.dateArrowDisabled]}
          disabled={isToday(selectedDate)}
        >
          <Ionicons name="chevron-forward" size={20}
            color={isToday(selectedDate) ? C.dim : C.textSoft} />
        </TouchableOpacity>
      </View>

      {/* ── Title input ── */}
      <View style={styles.titleBox}>
        <Ionicons name="bookmark-outline" size={15} color={C.subtext} style={{ marginTop: 2 }} />
        <TextInput
          style={styles.titleInput}
          placeholder="Rüyaya başlık ekle (opsiyonel)"
          placeholderTextColor={C.dim}
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
            <ActivityIndicator size="small" color={C.gold} />
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
            >
              <Animated.View style={[styles.micRing, micStyle,
                recState === 'recording' && styles.micRingRec]}>
                <LinearGradient
                  colors={recState === 'recording' ? ['#E05555','#A02020'] : [C.primary,'#5E42BB']}
                  style={styles.micCore}
                >
                  <Ionicons name={recState === 'recording' ? 'stop' : 'mic'} size={32} color={C.white} />
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
            placeholderTextColor={C.dim}
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
          <TouchableOpacity style={styles.cancelBtn} onPress={resetCompose}>
            <Ionicons name="close-circle-outline" size={18} color={C.subtext} />
            <Text style={styles.cancelBtnText}>Vazgeç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (!dreamText.trim() || submitting) && styles.saveBtnOff]}
            onPress={handleSave}
            disabled={!dreamText.trim() || submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color={C.white} />
              : <><Ionicons name="sparkles" size={17} color={C.white} />
                 <Text style={styles.saveBtnText}>Kaydet ve Yorumla</Text></>
            }
          </TouchableOpacity>
        </View>
      )}
    </Animated.ScrollView>
  );

  // ─── Screen ───────────────────────────────────────────────────────
  return (
    <LinearGradient colors={[C.bg, C.bgGrad1, C.bg]} style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rüya Günlüğü</Text>
          <Text style={styles.headerSub}>Bilinçaltının kozmik şifresi</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, tab === 'compose' && styles.addBtnClose]}
          onPress={() => {
            if (tab === 'compose') { resetCompose(); setTab('journal'); }
            else setTab('compose');
          }}
        >
          <Ionicons name={tab === 'compose' ? 'close' : 'add'} size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      {tab !== 'compose' && (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'journal' && styles.tabBtnActive]}
            onPress={() => setTab('journal')}
          >
            <Ionicons name="book-outline" size={14} color={tab === 'journal' ? C.primary : C.subtext} />
            <Text style={[styles.tabBtnText, tab === 'journal' && styles.tabBtnTextActive]}>Günlük</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'dictionary' && styles.tabBtnActive]}
            onPress={() => setTab('dictionary')}
          >
            <Ionicons name="library-outline" size={14} color={tab === 'dictionary' ? C.primary : C.subtext} />
            <Text style={[styles.tabBtnText, tab === 'dictionary' && styles.tabBtnTextActive]}>Sözlük</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
        >
          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.centerText}>Rüyalar yükleniyor…</Text>
            </View>
          )}
          {!loading && dreams.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🌙</Text>
              <Text style={styles.emptyTitle}>Henüz rüya kaydın yok</Text>
              <Text style={styles.emptySub}>İlk rüyanı kaydetmek için + butonuna dokun</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('compose')}>
                <Text style={styles.emptyBtnText}>İlk Rüyamı Ekle</Text>
              </TouchableOpacity>
            </View>
          )}
          {!loading && dreams.map(d => renderCard(d))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 56 : 32 },

  // Header
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                 paddingHorizontal:20, paddingBottom:14 },
  headerTitle: { fontSize:25, fontWeight:'700', color:C.text, letterSpacing:0.3 },
  headerSub:   { fontSize:12, color:C.subtext, marginTop:2 },
  addBtn:      { width:38, height:38, borderRadius:19, backgroundColor:C.primary,
                 alignItems:'center', justifyContent:'center' },
  addBtnClose: { backgroundColor:'#4A1818' },

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
                     borderWidth:1, borderColor:C.gold, marginBottom:16, width:'100%' },
  transcribingText:{ fontSize:14, color:C.gold },

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
    backgroundColor: C.bg,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: C.subtext },
  tabBtnTextActive: { color: C.primary },

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
