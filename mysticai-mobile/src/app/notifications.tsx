import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

type NotificationItem = {
  id: string;
  title: string;
  summary: string;
  time: string;
  unread?: boolean;
};

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Günün yorumu hazır',
    summary: 'Bugünkü burç yorumun yayınlandı, hemen göz at.',
    time: '2 dk önce',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Transit uyarısı',
    summary: 'Ay burcu etkisi arttı, mini aksiyonlarını güncelle.',
    time: '1 sa önce',
  },
  {
    id: 'n3',
    title: 'Haftalık özet güncellendi',
    summary: 'Bu hafta için yeni içgörüler eklendi.',
    time: 'Dün',
  },
];

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 10,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '700',
      color: colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 10,
    },
    listCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    row: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    rowTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      marginRight: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.violet,
    },
    rowTitle: {
      flexShrink: 1,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '700',
      color: colors.text,
    },
    rowTime: {
      fontSize: 11,
      lineHeight: 14,
      color: colors.subtext,
    },
    rowSummary: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.subtext,
    },
    settingsBtn: {
      marginTop: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 11,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    settingsBtnText: {
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '600',
      color: colors.text,
    },
  });
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <SafeScreen>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Bildirimler</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.listCard}>
            {MOCK_NOTIFICATIONS.map((item, index) => (
              <View key={item.id} style={[styles.row, index === MOCK_NOTIFICATIONS.length - 1 && styles.rowLast]}>
                <View style={styles.rowTop}>
                  <View style={styles.rowTitleWrap}>
                    {item.unread ? <View style={styles.dot} /> : null}
                    <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.rowTime}>{item.time}</Text>
                </View>
                <Text style={styles.rowSummary}>{item.summary}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => router.push('/notifications-settings')}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel="Bildirim ayarlarını aç"
          >
            <Ionicons name="settings-outline" size={15} color={colors.text} />
            <Text style={styles.settingsBtnText}>Bildirim ayarları</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
