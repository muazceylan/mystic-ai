import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import OnboardingBackground from '../components/OnboardingBackground';
import { SafeScreen } from '../components/ui';
import { dreamService } from '../services/dream.service';
import { useTheme } from '../context/ThemeContext';

const STORAGE_KEY = 'mysticai_notification_prefs';

interface NotifPrefs {
  dailySkyBrief: boolean;
  dreamReminder: boolean;
  cosmicOpportunity: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  dailySkyBrief: true,
  dreamReminder: true,
  cosmicOpportunity: false,
};

const NOTIF_ITEMS = [
  { id: 'dailySkyBrief' as keyof NotifPrefs, titleKey: 'notifications.dailySkyBrief', subKey: 'notifications.dailySkyBriefSub', icon: 'partly-sunny-outline' },
  { id: 'dreamReminder' as keyof NotifPrefs, titleKey: 'notifications.dreamReminder', subKey: 'notifications.dreamReminderSub', icon: 'moon-outline' },
  { id: 'cosmicOpportunity' as keyof NotifPrefs, titleKey: 'notifications.cosmicOpportunity', subKey: 'notifications.cosmicOpportunitySub', icon: 'sparkles-outline' },
];

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
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
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    hint: {
      fontSize: 13,
      color: C.subtext,
      lineHeight: 19,
      marginBottom: 20,
      backgroundColor: C.primarySoft,
      padding: 12,
      borderRadius: 10,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1 },
    rowTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    rowSub: { fontSize: 12, color: C.subtext, marginTop: 2 },
    footnote: { fontSize: 12, color: C.subtext, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  });
}

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const user = useAuthStore((s) => s.user);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const updatePref = async (key: keyof NotifPrefs, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    // Register/update push token when enabling any notification
    if (value && user?.id) {
      try {
        const { default: Notifications } = await import('expo-notifications');
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          await dreamService.registerPushToken(user.id, tokenData.data, Platform.OS);
        }
      } catch {
        // Silently fail — permissions not granted or push unavailable
      }
    }
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.hint}>
          {t('notifications.hint')}
        </Text>

        <View style={styles.card}>
          {NOTIF_ITEMS.map((item, index) => (
            <View
              key={item.id}
              style={[styles.row, index > 0 && styles.rowBorder]}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t(item.titleKey)}</Text>
                  <Text style={styles.rowSub}>{t(item.subKey)}</Text>
                </View>
              </View>
              {loaded && (
                <Switch
                  value={prefs[item.id]}
                  onValueChange={(v) => updatePref(item.id, v)}
                  trackColor={{ false: colors.switchTrack, true: colors.switchThumbActive }}
                  thumbColor={prefs[item.id] ? colors.primary : colors.white}
                  ios_backgroundColor={colors.switchTrack}
                />
              )}
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          {t('notifications.footnote')}
        </Text>
      </ScrollView>
      </View>
    </SafeScreen>
  );
}
