import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../store/useAuthStore';
import { useDreamStore } from '../../store/useDreamStore';
import type { DreamEntryResponse } from '../../services/dream.service';
import { COLORS } from '../../constants/colors';

const MONTHS_TR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export default function DreamBookScreen() {
  const user = useAuthStore(s => s.user);
  const { dreams, monthlyStory, storyLoading, generateMonthlyStory, fetchMonthlyStory, pollStoryUntilComplete } =
    useDreamStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [generating, setGenerating] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const glowAnim = useSharedValue(0.6);

  useEffect(() => {
    glowAnim.value = withRepeat(withTiming(1, { duration: 2200 }), -1, true);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const userId = user?.id;
  const yearMonthLabel = `${MONTHS_TR[month]} ${year}`;

  useEffect(() => {
    if (!userId) return;
    fetchMonthlyStory(userId, year, month);
  }, [userId, year, month]);

  const handleGenerate = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      await generateMonthlyStory(userId, year, month);
      // If PENDING start polling
      if (monthlyStory?.status === 'PENDING') {
        pollStoryUntilComplete(userId, year, month);
      }
    } catch {
      Alert.alert('Hata', 'Hikâye oluşturulamadı, tekrar dene.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      // Force re-generation: backend deletes the old story and re-analyses all dreams for the month
      await generateMonthlyStory(userId, year, month, true);
      // If the new story is still PENDING (AI processing), start polling
      pollStoryUntilComplete(userId, year, month);
    } catch {
      Alert.alert('Hata', 'Hikâye yenilenemedi, tekrar dene.');
    } finally {
      setRefreshing(false);
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
        Alert.alert('PDF Hazır', 'PDF dosyası oluşturuldu.');
      }
    } catch {
      Alert.alert('Hata', 'PDF oluşturulamadı.');
    } finally {
      setPdfExporting(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? year + 1 : year;
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth() + 1)) return;
    setMonth(nextM);
    if (month === 12) setYear(y => y + 1);
  };

  const isCurrentOrPast = !(year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1));

  const isPending = monthlyStory?.status === 'PENDING';
  const isCompleted = monthlyStory?.status === 'COMPLETED';
  const isEmpty = !monthlyStory || monthlyStory.status === 'EMPTY';

  // Filter store dreams for the current year/month for the PDF
  const monthDreams = dreams.filter(d => {
    if (!d.dreamDate) return false;
    const [y, m] = d.dreamDate.split('-').map(Number);
    return y === year && m === month;
  });

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surfaceMuted]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.headerBlock}>
          <Animated.Text style={[styles.moonGlyph, glowStyle]}>📖</Animated.Text>
          <Text style={styles.headerTitle}>Rüya Kitabım</Text>
          <Text style={styles.headerSub}>Bilinçaltı yolculuğunun aylık destanı</Text>
        </Animated.View>

        {/* Month Picker */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.monthPicker}>
          <TouchableOpacity
            onPress={prevMonth}
            style={styles.monthArrow}
            accessibilityLabel="Önceki ay"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.goldDark} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{yearMonthLabel}</Text>
          <TouchableOpacity
            onPress={nextMonth}
            style={[styles.monthArrow, !isCurrentOrPast && styles.monthArrowDisabled]}
            accessibilityLabel="Sonraki ay"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isCurrentOrPast ? COLORS.goldDark : COLORS.subtext}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Story Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.storyCard}>
          {storyLoading || generating ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {generating ? 'Hikâye yazılıyor...' : 'Yükleniyor...'}
              </Text>
              <Text style={styles.loadingSubText}>
                Ay mevsiminizin hikâyesi kalemle şekilleniyor...
              </Text>
            </View>
          ) : isPending ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={COLORS.goldDark} />
              <Text style={styles.loadingText}>Yapay zeka yazıyor...</Text>
              <Text style={styles.loadingSubText}>
                Birkaç saniye daha, bilinçaltı imgeleriniz sıraya diziliyor...
              </Text>
            </View>
          ) : isCompleted && monthlyStory?.story ? (
            <>
              {/* Dominant symbols */}
              {monthlyStory.dominantSymbols.length > 0 && (
                <View style={styles.symbolsSection}>
                  <Text style={styles.sectionLabel}>✦ Dönemin Sembolleri</Text>
                  <View style={styles.symbolsRow}>
                    {monthlyStory.dominantSymbols.slice(0, 6).map(sym => (
                      <View key={sym} style={styles.symChip}>
                        <Text style={styles.symChipText}>{capitalize(sym)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Dream count badge */}
              <View style={styles.countBadge}>
                <Ionicons name="moon-outline" size={13} color={COLORS.goldDark} />
                <Text style={styles.countText}>{monthlyStory.dreamCount} rüya • {yearMonthLabel}</Text>
              </View>

              {/* Story text */}
              <Text style={styles.storyText}>{monthlyStory.story}</Text>

              {/* Export + Refresh buttons */}
              <View style={styles.exportRow}>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={handleRefresh}
                  disabled={refreshing}
                  accessibilityLabel="Hikâyeyi yenile"
                  accessibilityRole="button"
                >
                  {refreshing
                    ? <ActivityIndicator size="small" color={COLORS.primary} />
                    : <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportBtn, { flex: 1 }]}
                  onPress={handleExportPdf}
                  disabled={pdfExporting}
                  accessibilityLabel="PDF olarak indir"
                  accessibilityRole="button"
                >
                  {pdfExporting
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Ionicons name="download-outline" size={16} color={COLORS.white} />}
                  <Text style={styles.exportBtnText}>
                    {pdfExporting ? 'PDF Hazırlanıyor...' : 'PDF Olarak İndir'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : isEmpty ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyIcon}>🌑</Text>
              <Text style={styles.emptyTitle}>{yearMonthLabel} henüz boş</Text>
              <Text style={styles.emptySub}>
                Bu aya ait rüyalar kaydedildiğinde aylık hikâyen yazılabilir.
              </Text>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGenerate}
                disabled={storyLoading}
                accessibilityLabel="Hikâyeyi oluştur"
                accessibilityRole="button"
              >
                <Ionicons name="sparkles" size={15} color={COLORS.white} />
                <Text style={styles.generateBtnText}>Hikâyeyi Oluştur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Not yet generated
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>Hikâye hazır değil</Text>
              <Text style={styles.emptySub}>
                {yearMonthLabel} ayının rüya yolculuğunu yapay zeka ile anlat.
              </Text>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGenerate}
                disabled={generating || storyLoading}
                accessibilityLabel="Hikâyeyi oluştur"
                accessibilityRole="button"
              >
                {generating
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Ionicons name="sparkles" size={15} color={COLORS.white} />}
                <Text style={styles.generateBtnText}>Hikâyeyi Oluştur</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Info card */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={15} color={COLORS.subtext} />
          <Text style={styles.infoText}>
            Her ay sonunda yapay zeka, rüyalarını Jungçu psikoloji ve astroloji perspektifiyle
            şiirsel bir hikâyeye dönüştürür. PDF'i indirebilir veya paylaşabilirsin.
          </Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildPdfHtml(story: string, period: string, symbols: string[], entries: DreamEntryResponse[]): string {
  const symbolBadges = symbols
    .map(s => `<span class="badge">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`)
    .join(' ');

  const dreamRows = entries
    .sort((a, b) => a.dreamDate.localeCompare(b.dreamDate))
    .map((d, i) => {
      const dateLabel = new Date(d.dreamDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
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
  .header {
    text-align: center;
    margin-bottom: 36px;
    border-bottom: 1px solid rgba(200,168,75,0.4);
    padding-bottom: 24px;
  }
  .title {
    font-family: 'Cinzel', serif;
    font-size: 32px;
    color: ${COLORS.pdfGold};
    letter-spacing: 3px;
    text-transform: uppercase;
  }
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
  .section-label {
    font-family: 'Cinzel', serif;
    font-size: 11px;
    color: ${COLORS.pdfSection};
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
    margin-bottom: 10px;
  }
  .story {
    font-size: 16px;
    line-height: 2;
    color: ${COLORS.pdfStory};
    text-align: justify;
    margin: 24px 0;
    background: rgba(255,255,255,0.03);
    border-left: 3px solid ${COLORS.pdfGold};
    padding: 20px 24px;
    border-radius: 4px;
  }
  .dreams-section { margin-top: 40px; }
  .dreams-title {
    font-family: 'Cinzel', serif;
    font-size: 14px;
    color: ${COLORS.pdfGold};
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(200,168,75,0.25);
    padding-bottom: 8px;
  }
  .dream-entry {
    margin-bottom: 18px;
    padding: 14px 18px;
    background: rgba(255,255,255,0.04);
    border-left: 2px solid rgba(124,77,255,0.5);
    border-radius: 4px;
  }
  .dream-date {
    font-size: 11px;
    color: ${COLORS.pdfDreamDate};
    font-family: 'Cinzel', serif;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .dream-text {
    font-size: 14px;
    line-height: 1.8;
    color: ${COLORS.pdfDreamText};
  }
  .footer {
    text-align: center;
    margin-top: 40px;
    font-size: 12px;
    color: ${COLORS.pdfFooter};
    font-style: italic;
    border-top: 1px solid rgba(200,168,75,0.2);
    padding-top: 16px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="glyph">📖</div>
    <div class="title">Rüya Kitabım</div>
    <div class="period">${period} — Bilinçaltı Yolculuğu</div>
  </div>
  ${symbolBadges ? `
  <div class="section-label">✦ Dönemin Sembolleri</div>
  <div class="symbols">${symbolBadges}</div>` : ''}
  <div class="section-label" style="margin-top:24px">✦ Kozmik Yorum</div>
  <div class="story">${story.replace(/\n/g, '<br/>')}</div>
  ${dreamRows ? `
  <div class="dreams-section">
    <div class="dreams-title">📋 Bu Aydaki Rüyalarım (${entries.length} Adet)</div>
    ${dreamRows}
  </div>` : ''}
  <div class="footer">Mystic AI tarafından oluşturuldu • ${period}</div>
</body>
</html>`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 56, paddingBottom: 40 },
  headerBlock: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  moonGlyph: { fontSize: 44, marginBottom: 8 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.subtext,
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthArrow: { padding: 6 },
  monthArrowDisabled: { opacity: 0.3 },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 140,
    textAlign: 'center',
  },
  storyCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
    minHeight: 200,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  loadingSubText: {
    fontSize: 12,
    color: COLORS.subtext,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  symbolsSection: { marginBottom: 12 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.goldDark,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  symbolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  symChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(200,168,75,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.3)',
  },
  symChipText: { fontSize: 12, color: COLORS.goldDark, fontWeight: '600' },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  countText: { fontSize: 12, color: COLORS.subtext, fontStyle: 'italic' },
  storyText: {
    fontSize: 15,
    lineHeight: 26,
    color: COLORS.text,
    marginBottom: 20,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    alignItems: 'center',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(157,78,221,0.07)',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  exportBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  emptyBlock: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: {
    fontSize: 12,
    color: COLORS.subtext,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 22,
    marginTop: 6,
  },
  generateBtnText: { color: COLORS.black, fontSize: 14, fontWeight: '800' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.subtext, lineHeight: 18 },
});
