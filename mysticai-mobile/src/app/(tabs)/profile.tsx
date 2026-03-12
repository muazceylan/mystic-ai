import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from '../../utils/haptics';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { getZodiacSign } from '../../constants/index';
import { SafeScreen, TabHeader } from '../../components/ui';
import { TabSwipeGesture } from '../../components/ui/TabSwipeGesture';
import { useTabHeaderActions } from '../../hooks/useTabHeaderActions';
import { dreamService } from '../../services/dream.service';
import { fetchLuckyDatesByUser } from '../../services/lucky-dates.service';
import {
  PROFILE_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../../features/tutorial';

interface UserStats {
  plannedDays: number;
  dreamCount: number;
}

const SETTINGS_ITEMS = [
  { id: 'name_info',     titleKey: 'profile.menu.nameInfo',     icon: 'person-outline',        route: '/edit-profile-name' },
  { id: 'birth_info',    titleKey: 'profile.menu.birthInfo',    icon: 'calendar-outline',      route: '/edit-birth-info' },
  { id: 'notifications', titleKey: 'profile.menu.notifications', icon: 'notifications-outline', route: '/notifications' },
  { id: 'theme',         titleKey: 'profile.menu.theme',         icon: 'moon-outline',          route: '/theme-settings' },
  { id: 'language',      titleKey: 'profile.menu.language',      icon: 'globe-outline',         route: '/language-settings' },
  { id: 'security',      titleKey: 'profile.menu.security',      icon: 'shield-checkmark-outline', route: '/security' },
  { id: 'privacy',       titleKey: 'profile.menu.privacy',       icon: 'lock-closed-outline',   route: '/privacy' },
  { id: 'tutorial_center', titleKey: 'Rehber Merkezi', icon: 'albums-outline', route: '/tutorial-center' },
  { id: 'help',          titleKey: 'profile.menu.help',          icon: 'help-circle-outline',   route: '/help' },
] as const;

function StatSkeleton({ colors }: { colors: { surfaceAlt: string } }) {
  return <View style={{ width: 36, height: 24, borderRadius: 6, backgroundColor: colors.surfaceAlt, marginBottom: 4 }} />;
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
  const tabBarHeight = useBottomTabBarHeight();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.PROFILE);
  const tutorialBootstrapRef = useRef<string | null>(null);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectingAvatar, setSelectingAvatar] = useState(false);

  const initials = `${user?.firstName ? user.firstName[0] : '?'}${
    user?.lastName ? user.lastName[0] : ''
  }`.toUpperCase();

  const zodiac = user?.zodiacSign || getZodiacFromBirthDate(user?.birthDate);
  const premium = isPremium(user?.roles);
  const avatarUri = user?.avatarUri || user?.avatarUrl || null;

  useEffect(() => {
    const scope = user?.id ? String(user.id) : 'guest';
    if (tutorialBootstrapRef.current === scope) {
      return;
    }

    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
  }, [triggerInitialTutorials, user?.id]);

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
      setStats({ dreamCount: totalDreams, plannedDays });
    } catch {
      setStats({ dreamCount: 0, plannedDays: 0 });
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

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.PROFILE_FOUNDATION, 'profile');
  }, [reopenTutorialById]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
    router.replace('/(auth)/welcome');
  };

  const handlePickAvatar = async () => {
    if (!user) return;

    Haptics.selectionAsync();

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('profile.avatar.permissionDenied'));
      return;
    }

    setSelectingAvatar(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const selected = result.assets[0];
      if (!selected?.uri) return;

      setUser({
        ...user,
        avatarUri: selected.uri,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(t('common.error'), t('profile.avatar.pickerError'));
    } finally {
      setSelectingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    if (!user) return;

    setUser({
      ...user,
      avatarUri: null,
    });
    Haptics.selectionAsync();
  };

  const S = makeStyles(colors);

  return (
    <TabSwipeGesture tab="profile">
      <SafeScreen edges={['top', 'left', 'right']}>
        <View style={S.container}>
        <TabHeader
          title={t('profile.title')}
          showAvatar={false}
          rightActions={(
            <SpotlightTarget targetKey={PROFILE_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
              <TouchableOpacity
                style={S.helpBtn}
                onPress={handlePressTutorialHelp}
                accessibilityRole="button"
                accessibilityLabel="Profil rehberini tekrar aç"
              >
                <Ionicons name="help-circle-outline" size={18} color={colors.text} />
              </TouchableOpacity>
            </SpotlightTarget>
          )}
          {...useTabHeaderActions()}
        />
        <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.scrollContent, { paddingBottom: tabBarHeight + 28 }]}
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
        <SpotlightTarget targetKey={PROFILE_TUTORIAL_TARGET_KEYS.PERSONAL_INFO}>
          <View style={S.profileHeader}>
          <TouchableOpacity
            style={S.avatarButton}
            onPress={handlePickAvatar}
            accessibilityLabel={t('profile.avatar.change')}
            accessibilityRole="button"
            disabled={selectingAvatar}
            activeOpacity={0.85}
          >
            <View style={S.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={S.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={S.avatarText}>{initials}</Text>
              )}
              <View style={S.avatarEditBadge}>
                <Ionicons
                  name={selectingAvatar ? 'hourglass-outline' : 'camera-outline'}
                  size={14}
                  color="#FFFFFF"
                />
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.avatarActionButton, selectingAvatar && S.avatarActionButtonDisabled]}
            onPress={handlePickAvatar}
            accessibilityLabel={t('profile.avatar.change')}
            accessibilityRole="button"
            disabled={selectingAvatar}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={14} color={colors.primary} />
            <Text style={S.avatarActionText}>
              {selectingAvatar ? t('profile.avatar.loading') : t('profile.avatar.change')}
            </Text>
          </TouchableOpacity>
          {avatarUri ? (
            <TouchableOpacity
              style={S.avatarRemoveButton}
              onPress={handleRemoveAvatar}
              accessibilityLabel={t('profile.avatar.remove')}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={12} color={colors.subtext} />
              <Text style={S.avatarRemoveText}>{t('profile.avatar.remove')}</Text>
            </TouchableOpacity>
          ) : null}
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
        </SpotlightTarget>

        {/* ── Stats ── */}
        <View style={S.statsContainer}>
          <View style={[S.statItem, S.statBorderRight]}>
            {loadingStats ? <StatSkeleton colors={colors} /> : <Text style={S.statValue}>{stats?.plannedDays ?? 0}</Text>}
            <Text style={S.statLabel}>{t('profile.stats.plannedDays')}</Text>
          </View>
          <View style={S.statItem}>
            {loadingStats ? <StatSkeleton colors={colors} /> : <Text style={S.statValue}>{stats?.dreamCount ?? 0}</Text>}
            <Text style={S.statLabel}>{t('profile.stats.dreamCount')}</Text>
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
              accessibilityLabel={t('profile.premium.upgrade')}
              accessibilityRole="button"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/premium' as any); }}
            >
              <Text style={S.upgradeButtonText}>{t('profile.premium.upgradeBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Settings ── */}
        <Text style={S.sectionTitle}>{t('profile.settings')}</Text>
        <SpotlightTarget targetKey={PROFILE_TUTORIAL_TARGET_KEYS.PREFERENCES}>
          <View style={S.settingsCard}>
          {SETTINGS_ITEMS.map((item, index) => (
            <SpotlightTarget
              key={item.id}
              targetKey={item.id === 'tutorial_center'
                ? PROFILE_TUTORIAL_TARGET_KEYS.TUTORIAL_CENTER_ENTRY
                : `${item.id}.noop`}
              disabled={item.id !== 'tutorial_center'}
            >
              <TouchableOpacity
                style={[S.settingsItem, index > 0 && S.settingsItemBorder]}
                onPress={() => handleSettingPress(item.route)}
                accessibilityLabel={item.id === 'tutorial_center' ? 'Rehber Merkezi' : t(item.titleKey as any)}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <View style={S.settingsRow}>
                  <View style={S.iconContainer}>
                    <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                  </View>
                  <Text style={S.settingsTitle}>
                    {item.id === 'tutorial_center' ? 'Rehber Merkezi' : t(item.titleKey as any)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
              </TouchableOpacity>
            </SpotlightTarget>
          ))}
          </View>
        </SpotlightTarget>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={S.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
          accessibilityLabel={t('profile.logout')}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={S.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        <Text style={S.versionText}>{t('profile.version')}</Text>
        </ScrollView>
      </View>
      </SafeScreen>
    </TabSwipeGesture>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 28 },
    // Header
    profileHeader: { alignItems: 'center', marginBottom: 20 },
    avatarButton: {
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    avatarContainer: {
      width: 84, height: 84, borderRadius: 42,
      backgroundColor: C.primarySoft,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: C.primary, fontSize: 28, fontWeight: '700' },
    avatarEditBadge: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primary,
      borderWidth: 1.5,
      borderColor: C.surface,
    },
    avatarActionButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      marginBottom: 6,
    },
    avatarActionButtonDisabled: {
      opacity: 0.6,
    },
    avatarActionText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    avatarRemoveButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      marginBottom: 10,
    },
    avatarRemoveText: {
      color: C.subtext,
      fontSize: 11,
      fontWeight: '600',
    },
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
    helpBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    upgradeButtonText: { color: C.text, fontSize: 12, fontWeight: '700' },
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
