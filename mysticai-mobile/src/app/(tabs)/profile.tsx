import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import OnboardingBackground from '../../components/OnboardingBackground';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  primarySoft: '#F1E8FD',
  gold: '#D4AF37',
  danger: '#E05454',
};

const SETTINGS_ITEMS = [
  { id: 'birth_info', title: 'Doğum Bilgileri', icon: 'calendar-outline' },
  { id: 'notifications', title: 'Bildirimler', icon: 'notifications-outline' },
  { id: 'privacy', title: 'Gizlilik', icon: 'lock-closed-outline' },
  { id: 'theme', title: 'Tema', icon: 'moon-outline' },
  { id: 'language', title: 'Dil', icon: 'globe-outline' },
  { id: 'help', title: 'Yardım', icon: 'help-circle-outline' },
];

const STATS_ITEMS = [
  { label: 'Tarot Okumaları', value: '12' },
  { label: 'Rüya Kaydı', value: '8' },
  { label: 'Günlük Yorum', value: '24' },
];

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const initials = `${user?.firstName ? user.firstName[0] : '?'}${user?.lastName ? user.lastName[0] : ''}`.toUpperCase();

  return (
    <View style={styles.container}>
      <OnboardingBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.firstName || 'Kullanıcı'} {user?.lastName}</Text>
          <Text style={styles.userEmail}>{user?.email || 'kullanici@mystic.ai'}</Text>
          <View style={styles.zodiacBadge}>
            <Text style={styles.zodiacText}>{user?.zodiacSign || 'Burç belirtilmemiş'}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          {STATS_ITEMS.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Ayarlar</Text>
        <View style={styles.settingsCard}>
          {SETTINGS_ITEMS.map((item, index) => (
            <View
              key={item.id}
              style={[styles.settingsItem, index > 0 && styles.settingsItemBorder]}
            >
              <View style={styles.settingsRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon as any} size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.settingsTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.subtext} />
            </View>
          ))}
        </View>

        <View style={styles.premiumCard}>
          <View style={styles.premiumIcon}>
            <Ionicons name="sparkles" size={18} color={COLORS.gold} />
          </View>
          <View style={styles.premiumContent}>
            <Text style={styles.premiumTitle}>Premium'a Yükselt</Text>
            <Text style={styles.premiumDescription}>Sınırsız Tarot ve Rüya yorumları</Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Yükselt</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Mystic AI v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E3DAF6',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  userName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: COLORS.subtext,
    fontSize: 13,
    marginBottom: 8,
  },
  zodiacBadge: {
    backgroundColor: '#FFF4DF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zodiacText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.subtext,
    fontSize: 11,
    textAlign: 'center',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: {
    color: COLORS.text,
    fontSize: 14,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F4E5C8',
    marginBottom: 20,
  },
  premiumIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF2D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  premiumDescription: {
    color: COLORS.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  upgradeButtonText: {
    color: '#1E1E1E',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1D6D6',
    backgroundColor: '#FFF6F6',
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  versionText: {
    color: COLORS.subtext,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },
});
