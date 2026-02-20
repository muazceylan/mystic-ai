import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OnboardingBackground from '../components/OnboardingBackground';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  primarySoft: '#F1E8FD',
};

const SECTIONS = [
  {
    title: 'Topladığımız Veriler',
    body: 'Mystic AI; doğum tarihi, saati ve konumu, rüya kayıtları ve uygulama kullanım istatistiklerini toplar. Bu veriler yalnızca kişiselleştirilmiş astroloji ve rüya yorumları sunmak için kullanılır.',
  },
  {
    title: 'Veri Saklama ve Güvenlik',
    body: 'Tüm verileriniz şifreli bağlantılar (TLS) üzerinden iletilir ve güvenli sunucularda saklanır. Şifreler asla düz metin olarak tutulmaz; bcrypt ile hashlenir.',
  },
  {
    title: 'Üçüncü Taraf Paylaşımı',
    body: 'Verileriniz üçüncü taraflara satılmaz. AI yorumları üretmek amacıyla kullanılan modele yalnızca anonim içerik gönderilir.',
  },
  {
    title: 'Verilerinizin Kontrolü',
    body: 'Hesabınızı ve tüm verilerinizi istediğiniz zaman silebilirsiniz. Veri erişim ve silme talepleri için destek@mystic.ai adresine yazabilirsiniz.',
  },
  {
    title: 'Çerezler ve İzleme',
    body: 'Mobil uygulama, analitik amaçlı yalnızca anonim oturum verisi kullanır. Herhangi bir reklam izleme çerezi kullanılmaz.',
  },
];

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <OnboardingBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBadge}>
          <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
          <Text style={styles.topBadgeText}>Verileriniz sizin kontrolünüzde</Text>
        </View>

        <Text style={styles.updated}>Son güncelleme: Şubat 2026</Text>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => Linking.openURL('mailto:destek@mystic.ai')}
        >
          <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
          <Text style={styles.linkBtnText}>destek@mystic.ai</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  topBadgeText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  updated: { fontSize: 12, color: COLORS.subtext, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  sectionBody: { fontSize: 13, color: COLORS.subtext, lineHeight: 20 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    marginTop: 8,
  },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
