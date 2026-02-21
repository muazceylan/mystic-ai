import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import OnboardingBackground from '../components/OnboardingBackground';
import { COLORS } from '../constants/colors';

const FAQ = [
  {
    q: 'Natal haritam neden yanlış hesaplandı?',
    a: 'Harita hesabı doğum tarihi, saati ve konumunuza bağlıdır. Doğum bilgilerinizi Profil → Doğum Bilgileri bölümünden güncelleyebilirsiniz.',
  },
  {
    q: 'Rüya yorumum neden tamamlanmadı?',
    a: 'AI yorumları birkaç dakika alabilir. Rüyalar sekmesinden ilgili kaydı açarak durumu kontrol edebilirsiniz. Sorun devam ederse uygulamayı yeniden başlatın.',
  },
  {
    q: 'Ses kaydım neden yüklenmedi?',
    a: 'Mikrofon izni verilmiş mi kontrol edin. Kayıt 30 saniyeyi aşmamalıdır. İnternet bağlantınızı kontrol edin.',
  },
  {
    q: 'Premium\'u nasıl iptal edebilirim?',
    a: 'iOS: Ayarlar → Apple ID → Abonelikler → Mystic AI. Android: Play Store → Hesap → Abonelikler → Mystic AI.',
  },
  {
    q: 'Verilerimi nasıl silebilirim?',
    a: 'Hesap ve tüm veriler için destek@mystic.ai adresine "Hesap Silme Talebi" konusuyla e-posta gönderin.',
  },
];

const QUICK_ACTIONS = [
  { id: 'email', title: 'Destek E-postası', icon: 'mail-outline', action: () => Linking.openURL('mailto:destek@mystic.ai') },
  { id: 'feedback', title: 'Geri Bildirim Gönder', icon: 'chatbubble-outline', action: () => Alert.alert('Teşekkürler', 'Geri bildirim formu yakında eklenecek.') },
  { id: 'rate', title: 'Uygulamayı Değerlendir', icon: 'star-outline', action: () => Alert.alert('Yakında', 'App Store bağlantısı yakında eklenecek.') },
];

export default function HelpScreen() {
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const toggle = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => (prev === i ? null : i));
  };

  return (
    <View style={styles.container}>
      <OnboardingBackground />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yardım</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
        <View style={styles.card}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.actionRow, i > 0 && styles.rowBorder]}
              accessibilityLabel={a.label}
              accessibilityRole={a.url ? 'link' : 'button'}
              onPress={a.action}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name={a.icon as any} size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.actionTitle}>{a.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.subtext} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Sık Sorulan Sorular</Text>
        <View style={styles.card}>
          {FAQ.map((item, i) => (
            <View key={i} style={i > 0 ? styles.rowBorder : undefined}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggle(i)}
                accessibilityLabel={expanded === i ? `${item.q} kapat` : `${item.q} genişlet`}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Text style={styles.faqQ}>{item.q}</Text>
                <Ionicons
                  name={expanded === i ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.subtext}
                />
              </TouchableOpacity>
              {expanded === i && (
                <Text style={styles.faqA}>{item.a}</Text>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.version}>Mystic AI v1.0.0 · destek@mystic.ai</Text>
      </ScrollView>
    </View>
  );
}

import React from 'react';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12, marginTop: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  faqQ: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  faqA: { fontSize: 13, color: COLORS.subtext, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },
  version: { fontSize: 12, color: COLORS.subtext, textAlign: 'center', marginTop: 24 },
});
