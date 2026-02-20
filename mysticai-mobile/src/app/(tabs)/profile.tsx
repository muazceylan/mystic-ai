import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import OnboardingBackground from '../../components/OnboardingBackground';
import { getZodiacSign } from '../../constants/index';
import { dreamService } from '../../services/dream.service';
import { fetchLuckyDatesByUser } from '../../services/lucky-dates.service';

interface UserStats {
  plannedDays: number;
  dreamCount: number;
  dailyYorum: number;
}

const SETTINGS_ITEMS = [
  { id: 'birth_info',    titleKey: 'profile.menu.birthInfo',    icon: 'calendar-outline',      route: '/edit-birth-info' },
  { id: 'notifications', titleKey: 'profile.menu.notifications', icon: 'notifications-outline', route: '/notifications-settings' },
  { id: 'theme',         titleKey: 'profile.menu.theme',         icon: 'moon-outline',          route: '/theme-settings' },
  { id: 'language',      titleKey: 'profile.menu.language',      icon: 'globe-outline',         route: '/language-settings' },
  { id: 'privacy',       titleKey: 'profile.menu.privacy',       icon: 'lock-closed-outline',   route: '/privacy' },
  { id: 'help',          titleKey: 'profile.menu.help',          icon: 'help-circle-outline',   route: '/help' },
] as const;

function StatSkeleton() {
  return <View style={{ width: 36, height: 24, borderRadius: 6, backgroundColor: '#EDE8F5', marginBottom: 4 }} />;
}

function getZodiacFromBirthDate(birthDate?: string): string {
  if (!birthDate) return '';
  try {
    const d = new Date(birthDate);
    return getZodiacSign(d.getMonth() + 1, d.getDate()) || '';
  } catch {
    return '';
  }
}

function isPremium(roles?: string[]): boolean {
  return roles?.some((r) => r === 'PREMIUM' || r === 'ROLE_PREMIUM') ?? false;
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const initials = `${user?.firstName ? user.firstName[0] : '?'}${
    user?.lastName ? user.lastName[0] : ''
  }`.toUpperCase();

  const zodiac = user?.zodiacSign || getZodiacFromBirthDate(user?.birthDate);
  const premium = isPremium(user?.roles);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (!user?.id) { setLoadingStats(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoadingStats(true);

    try {
      const [analyticsRes, luckyRes] = await Promise.allSettled([
        dreamService.getAnalytics(user.id),
        fetchLuckyDatesByUser(user.id),
      ]);
      const totalDreams = analyticsRes.status === 'fulfilled' ? analyticsRes.value.totalDreams : 0;
      const plannedDays = luckyRes.status === 'fulfilled' ? luckyRes.value.data.length : 0;
      setStats({ dreamCount: totalDreams, plannedDays, dailyYorum: 0 });
    } catch {
      setStats({ dreamCount: 0, plannedDays: 0, dailyYorum: 0 });
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => { fetchStats(false); }, [fetchStats])
  );

  const handleSettingPress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
    router.replace('/(auth)/welcome');
  };

  const S = makeStyles(colors);

  return (
    <View style={S.container}>
      <OnboardingBackground />
      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStats(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Profile Header ── */}
        <View style={S.profileHeader}>
          <View style={S.avatarContainer}>
            <Text style={S.avatarText}>{initials}</Text>
          </View>
          <Text style={S.userName}>
            {user?.firstName || t('common.unknown')}{user?.lastName ? ` ${user.lastName}` : ''}
          </Text>
          <Text style={S.userEmail}>{user?.email || ''}</Text>
          {zodiac ? (
            <View style={S.zodiacBadge}>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text style={S.zodiacText}>{zodiac}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Stats ── */}
        <View style={S.statsContainer}>
          <View style={[S.statItem, S.statBorderRight]}>
            {loadingStats ? <StatSkeleton /> : <Text style={S.statValue}>{stats?.plannedDays ?? 0}</Text>}
            <Text style={S.statLabel}>{t('profile.stats.plannedDays')}</Text>
          </View>
          <View style={[S.statItem, S.statBorderRight]}>
            {loadingStats ? <StatSkeleton /> : <Text style={S.statValue}>{stats?.dreamCount ?? 0}</Text>}
            <Text style={S.statLabel}>{t('profile.stats.dreamCount')}</Text>
          </View>
          <View style={S.statItem}>
            {loadingStats ? <StatSkeleton /> : <Text style={S.statValue}>{stats?.dailyYorum ?? 0}</Text>}
            <Text style={S.statLabel}>{t('profile.stats.dailyComment')}</Text>
          </View>
        </View>

        {/* ── Premium Card ── */}
        {premium ? (
          <View style={[S.premiumCard, S.premiumCardActive]}>
            <View style={[S.premiumIcon, S.premiumIconActive]}>
              <Ionicons name="sparkles" size={18} color={colors.gold} />
            </View>
            <View style={S.premiumContent}>
              <Text style={S.premiumTitle}>{t('profile.premium.active')}</Text>
              <Text style={S.premiumDescription}>{t('profile.premium.activeDesc')}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.gold} />
          </View>
        ) : (
          <View style={S.premiumCard}>
            <View style={S.premiumIcon}>
              <Ionicons name="sparkles" size={18} color={colors.gold} />
            </View>
            <View style={S.premiumContent}>
              <Text style={S.premiumTitle}>{t('profile.premium.upgrade')}</Text>
              <Text style={S.premiumDescription}>{t('profile.premium.upgradeDesc')}</Text>
            </View>
            <TouchableOpacity
              style={S.upgradeButton}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/premium' as any); }}
            >
              <Text style={S.upgradeButtonText}>{t('profile.premium.upgradeBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Settings ── */}
        <Text style={S.sectionTitle}>{t('profile.settings')}</Text>
        <View style={S.settingsCard}>
          {SETTINGS_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[S.settingsItem, index > 0 && S.settingsItemBorder]}
              onPress={() => handleSettingPress(item.route)}
              activeOpacity={0.7}
            >
              <View style={S.settingsRow}>
                <View style={S.iconContainer}>
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={S.settingsTitle}>{t(item.titleKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={S.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={S.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        <Text style={S.versionText}>{t('profile.version')}</Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
    // Header
    profileHeader: { alignItems: 'center', marginBottom: 20 },
    avatarContainer: {
      width: 84, height: 84, borderRadius: 42,
      backgroundColor: C.primarySoft,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, borderWidth: 1, borderColor: C.border,
    },
    avatarText: { color: C.primary, fontSize: 28, fontWeight: '700' },
    userName: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
    userEmail: { color: C.subtext, fontSize: 13, marginBottom: 8 },
    zodiacBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: C.surfaceAlt,
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    },
    zodiacText: { color: C.gold, fontSize: 12, fontWeight: '600' },
    // Stats
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: C.surface, borderRadius: 16,
      borderWidth: 1, borderColor: C.border, marginBottom: 16, overflow: 'hidden',
    },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
    statBorderRight: { borderRightWidth: 1, borderRightColor: C.border },
    statValue: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
    statLabel: { color: C.subtext, fontSize: 10, textAlign: 'center' },
    // Settings
    sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
    settingsCard: {
      backgroundColor: C.surface, borderRadius: 16,
      borderWidth: 1, borderColor: C.border, marginBottom: 20, overflow: 'hidden',
    },
    settingsItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 16,
    },
    settingsItemBorder: { borderTopWidth: 1, borderTopColor: C.border },
    settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center',
    },
    settingsTitle: { color: C.text, fontSize: 14, fontWeight: '500' },
    // Premium
    premiumCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: C.border, marginBottom: 20,
    },
    premiumCardActive: { backgroundColor: C.surfaceAlt },
    premiumIcon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.surfaceAlt,
      alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    premiumIconActive: { backgroundColor: C.surfaceAlt },
    premiumContent: { flex: 1 },
    premiumTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
    premiumDescription: { color: C.subtext, fontSize: 12, marginTop: 2 },
    upgradeButton: {
      backgroundColor: C.gold, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    upgradeButtonText: { color: '#1E1E1E', fontSize: 12, fontWeight: '700' },
    // Logout
    logoutButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 12, borderWidth: 1,
      borderColor: C.border, backgroundColor: C.surface, marginBottom: 12,
    },
    logoutText: { color: C.danger, fontSize: 14, fontWeight: '600' },
    versionText: { color: C.subtext, fontSize: 11, textAlign: 'center', marginTop: 4 },
  });
}
