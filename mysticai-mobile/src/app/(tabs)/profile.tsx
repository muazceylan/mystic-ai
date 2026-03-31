import { useCallback, useEffect, useRef, useState } from 'react';
import { usePagerReady } from '../../navigation/pagerContext';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from '../../utils/haptics';
import { useTheme } from '../../context/ThemeContext';
import { SETTINGS_ICONS } from '../../constants/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore, isGuestUser } from '../../store/useAuthStore';
import { getZodiacSign } from '../../constants/index';
import { SafeScreen, SurfaceHeaderIconButton, TabHeader, BrandBadge, PremiumIconBadge, type PremiumIconTone } from '../../components/ui';
import { usePagerPageFocused } from '../../navigation/MainTabPager';
import { useTabHeaderActions } from '../../hooks/useTabHeaderActions';
import { trackEvent } from '../../services/analytics';
import { deleteAccount, removeProfileAvatar, uploadProfileAvatar } from '../../services/auth';
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
  { id: 'name_info',        titleKey: 'profile.menu.nameInfo',        icon: SETTINGS_ICONS.name,           route: '/edit-profile-name', tone: 'mystic' },
  { id: 'birth_info',       titleKey: 'profile.menu.birthInfo',       icon: SETTINGS_ICONS.birthInfo,      route: '/edit-birth-info', tone: 'cosmic' },
  { id: 'marital_status',   titleKey: 'profile.menu.maritalStatus',   icon: SETTINGS_ICONS.maritalStatus,  route: '/edit-marital-status', tone: 'rose' },
  { id: 'notifications',    titleKey: 'profile.menu.notifications',   icon: SETTINGS_ICONS.notifications,  route: '/notifications', tone: 'rose' },
  { id: 'theme',            titleKey: 'profile.menu.theme',           icon: SETTINGS_ICONS.theme,          route: '/theme-settings', tone: 'lunar' },
  { id: 'language',         titleKey: 'profile.menu.language',        icon: SETTINGS_ICONS.language,       route: '/language-settings', tone: 'insight' },
  { id: 'security',         titleKey: 'profile.menu.security',        icon: SETTINGS_ICONS.security,       route: '/security', tone: 'sacred' },
  { id: 'privacy',          titleKey: 'profile.menu.privacy',         icon: SETTINGS_ICONS.privacy,        route: '/privacy', tone: 'oracle' },
  { id: 'tutorial_center',  titleKey: 'surfaceTitles.tutorialCenter', icon: SETTINGS_ICONS.tutorialCenter, route: '/tutorial-center', tone: 'cosmic' },
  { id: 'help',             titleKey: 'profile.menu.help',            icon: SETTINGS_ICONS.help,           route: '/help', tone: 'rose' },
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

export function ProfileScreenContent() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isGuest = isGuestUser(user);
  const initials = isGuest
    ? '?'
    : `${user?.firstName ? user.firstName[0] : '?'}${user?.lastName ? user.lastName[0] : ''}`.toUpperCase();

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

  const isProfileFocused = usePagerPageFocused('profile');
  const wasFocusedRef = useRef(false);
  useEffect(() => {
    if (isProfileFocused && !wasFocusedRef.current) {
      fetchStats(false);
    }
    wasFocusedRef.current = isProfileFocused;
  }, [isProfileFocused, fetchStats]);

  const handleSettingPress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const requiresPassword = Boolean(user?.hasPassword);

  const handleDeleteAccountConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteAccount(requiresPassword ? deletePassword : undefined);
      trackEvent('account_deleted', { user_type: isGuest ? 'GUEST' : 'REGISTERED' });
      setShowDeleteModal(false);
      logout();
      router.replace('/(auth)/welcome');
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        setDeleteError(t('profile.deleteAccount.wrongPassword'));
      } else {
        setDeleteError(t('profile.deleteAccount.error'));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.PROFILE_FOUNDATION, 'profile');
  }, [reopenTutorialById]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isGuest) {
      trackEvent('quick_user_logout', {
        user_type: 'GUEST',
        user_id: user?.id ?? null,
        entry_point: 'profile',
      });
    }
    logout();
    router.replace('/(auth)/welcome');
  };

  const applyUserFromServer = useCallback((incomingUser: Record<string, any>) => {
    const resolvedAvatar = incomingUser?.avatarUrl ?? incomingUser?.avatarUri ?? null;
    setUser({
      ...(user ?? {}),
      ...incomingUser,
      avatarUrl: resolvedAvatar,
      avatarUri: resolvedAvatar,
    });
  }, [setUser, user]);

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

      const response = await uploadProfileAvatar(
        selected.uri,
        (selected as any).fileName ?? 'avatar.jpg',
        (selected as any).mimeType ?? null
      );
      applyUserFromServer(response.data as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(t('common.error'), t('profile.avatar.uploadError'));
    } finally {
      setSelectingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || selectingAvatar) return;
    setSelectingAvatar(true);
    try {
      const response = await removeProfileAvatar();
      applyUserFromServer(response.data as any);
      Haptics.selectionAsync();
    } catch {
      Alert.alert(t('common.error'), t('profile.avatar.removeError'));
    } finally {
      setSelectingAvatar(false);
    }
  };

  const S = makeStyles(colors);

  return (
      <SafeScreen edges={['top', 'left', 'right']}>
        <View style={S.container}>
        <TabHeader
          title={t('profile.title')}
          showAvatar={false}
          rightActions={(
            <SpotlightTarget targetKey={PROFILE_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
              <SurfaceHeaderIconButton
                iconName="help-circle-outline"
                onPress={handlePressTutorialHelp}
                accessibilityLabel={t('profile.tutorialHelpA11y')}
              />
            </SpotlightTarget>
          )}
          {...useTabHeaderActions()}
        />
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
        <SpotlightTarget targetKey={PROFILE_TUTORIAL_TARGET_KEYS.PERSONAL_INFO}>
          <View style={S.profileHeader}>
          <TouchableOpacity
            style={S.avatarButton}
            onPress={isGuest ? undefined : handlePickAvatar}
            accessibilityLabel={isGuest ? t('common.guest') : t('profile.avatar.change')}
            accessibilityRole="button"
            disabled={isGuest || selectingAvatar}
            activeOpacity={isGuest ? 1 : 0.85}
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
              style={[S.avatarRemoveButton, selectingAvatar && S.avatarActionButtonDisabled]}
              onPress={handleRemoveAvatar}
              accessibilityLabel={t('profile.avatar.remove')}
              accessibilityRole="button"
              disabled={selectingAvatar}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={12} color={colors.subtext} />
              <Text style={S.avatarRemoveText}>{t('profile.avatar.remove')}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={S.userName}>
            {isGuest
              ? t('common.guest')
              : `${user?.firstName || t('common.unknown')}${user?.lastName ? ` ${user.lastName}` : ''}`}
          </Text>
          {!isGuest && <Text style={S.userEmail}>{user?.email || ''}</Text>}
          {zodiac ? (
            <View style={S.zodiacBadge}>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text style={S.zodiacText}>{zodiac}</Text>
            </View>
          ) : null}
          <BrandBadge variant="icon-transparent" size={20} style={S.profileBrandBadge} />
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

        {/* ── Guest Banner ── */}
        {isGuestUser(user) && (
          <TouchableOpacity
            style={S.guestBanner}
            onPress={() => router.push('/link-account' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('guestBanner.linkButton')}
            activeOpacity={0.85}
          >
            <View style={S.guestBannerContent}>
              <Ionicons name="link-outline" size={20} color={colors.primary} />
              <View style={S.guestBannerText}>
                <Text style={S.guestBannerTitle}>{t('guestBanner.title')}</Text>
                <Text style={S.guestBannerDescription}>{t('guestBanner.description')}</Text>
              </View>
            </View>
            <Text style={S.guestBannerCta}>{t('guestBanner.linkButton')}</Text>
          </TouchableOpacity>
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
                accessibilityLabel={t(item.titleKey as any)}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <View style={S.settingsRow}>
                  <PremiumIconBadge
                    icon={item.icon as any}
                    tone={item.tone as PremiumIconTone}
                    size={36}
                    iconSize={16}
                    glowSize={48}
                    style={S.iconContainer}
                  />
                  <Text style={S.settingsTitle}>
                    {t(item.titleKey as any)}
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

        {/* ── Delete Account ── */}
        <TouchableOpacity
          style={S.deleteAccountButton}
          onPress={() => { setDeletePassword(''); setDeleteError(null); setShowDeleteModal(true); }}
          activeOpacity={0.8}
          accessibilityLabel={t('profile.deleteAccount.button')}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={16} color={colors.subtext} />
          <Text style={S.deleteAccountText}>{t('profile.deleteAccount.button')}</Text>
        </TouchableOpacity>

        <Text style={S.versionText}>{t('profile.version')}</Text>
        </ScrollView>
      </View>

      {/* ── Delete Account Modal ── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!deleteLoading) setShowDeleteModal(false); }}
      >
        <KeyboardAvoidingView
          style={S.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={S.modalCard}>
            <View style={S.modalIconRow}>
              <View style={S.modalIconShell}>
                <Ionicons name="warning-outline" size={28} color={colors.danger} />
              </View>
            </View>
            <Text style={S.modalTitle}>{t('profile.deleteAccount.modalTitle')}</Text>
            <Text style={S.modalWarning}>{t('profile.deleteAccount.modalWarning')}</Text>

            {requiresPassword && (
              <>
                <Text style={S.modalPasswordLabel}>{t('profile.deleteAccount.passwordLabel')}</Text>
                <View style={[S.modalInput, deleteError ? S.modalInputError : undefined]}>
                  <TextInput
                    style={S.modalInputText}
                    placeholder={t('profile.deleteAccount.passwordPlaceholder')}
                    placeholderTextColor={colors.subtext}
                    secureTextEntry
                    value={deletePassword}
                    onChangeText={(v) => { setDeletePassword(v); setDeleteError(null); }}
                    autoCapitalize="none"
                    editable={!deleteLoading}
                  />
                </View>
              </>
            )}

            {deleteError ? <Text style={S.modalError}>{deleteError}</Text> : null}

            <TouchableOpacity
              style={[S.modalConfirmBtn, (deleteLoading || (requiresPassword && !deletePassword)) && S.modalBtnDisabled]}
              onPress={handleDeleteAccountConfirm}
              disabled={deleteLoading || (requiresPassword && deletePassword.length === 0)}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={S.modalConfirmText}>{t('profile.deleteAccount.confirm')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[S.modalCancelBtn, deleteLoading && S.modalBtnDisabled]}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={S.modalCancelText}>{t('profile.deleteAccount.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      </SafeScreen>
  );
}

/**
 * When PagerView is active, content is rendered by MainTabPager.
 * Before PagerView is ready, renders content as a fallback.
 */
export default function ProfileRoute() {
  const pagerReady = usePagerReady();
  if (pagerReady) return null;
  return <ProfileScreenContent />;
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 28 },
    // Header
    profileHeader: { alignItems: 'center', marginBottom: 20 },
    profileBrandBadge: { marginTop: 10, opacity: 0.45 },
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
    iconContainer: {
      marginLeft: -4,
      marginVertical: -4,
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
    // Guest banner
    guestBanner: {
      backgroundColor: C.primarySoft,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: C.primary,
      marginBottom: 20,
    },
    guestBannerContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    guestBannerText: { flex: 1 },
    guestBannerTitle: { color: C.primary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
    guestBannerDescription: { color: C.text, fontSize: 12, lineHeight: 18 },
    guestBannerCta: {
      color: C.white,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingVertical: 10,
      overflow: 'hidden',
    },
    // Logout
    logoutButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 12, borderWidth: 1,
      borderColor: C.border, backgroundColor: C.surface, marginBottom: 10,
    },
    logoutText: { color: C.danger, fontSize: 14, fontWeight: '600' },
    deleteAccountButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 12, marginBottom: 16,
    },
    deleteAccountText: { color: C.subtext, fontSize: 13, fontWeight: '500' },
    versionText: { color: C.subtext, fontSize: 11, textAlign: 'center', marginTop: 4 },
    // Delete modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalCard: {
      width: '100%', backgroundColor: C.surface,
      borderRadius: 20, padding: 24,
      borderWidth: 1, borderColor: C.border,
    },
    modalIconRow: { alignItems: 'center', marginBottom: 16 },
    modalIconShell: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: 'rgba(239,68,68,0.10)',
      alignItems: 'center', justifyContent: 'center',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 10 },
    modalWarning: { fontSize: 14, color: C.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    modalPasswordLabel: { fontSize: 13, color: C.text, fontWeight: '600', marginBottom: 8 },
    modalInput: {
      backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
      borderRadius: 12, marginBottom: 12,
    },
    modalInputError: { borderColor: C.danger },
    modalInputText: { paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: C.text },
    modalError: { fontSize: 13, color: C.danger, marginBottom: 12, textAlign: 'center' },
    modalConfirmBtn: {
      backgroundColor: C.danger, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center', marginBottom: 10,
    },
    modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    modalCancelBtn: {
      backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
      paddingVertical: 14, alignItems: 'center',
    },
    modalCancelText: { color: C.text, fontSize: 15, fontWeight: '500' },
    modalBtnDisabled: { opacity: 0.5 },
  });
}
