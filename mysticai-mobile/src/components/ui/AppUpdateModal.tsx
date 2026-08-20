import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { AppVersionResponse, openStore } from '../../services/appVersionCheck';
import { trackEvent } from '../../services/analytics';

interface AppUpdateModalProps {
  visible: boolean;
  versionInfo: AppVersionResponse;
  /** 'force' blocks the app entirely; 'optional' can be dismissed for this release. */
  mode: 'force' | 'optional';
  onDismiss?: () => void;
}

export function AppUpdateModal({ visible, versionInfo, mode, onDismiss }: AppUpdateModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = createStyles(colors);
  const isForced = mode === 'force';

  // Admin-authored copy wins; the bundled strings keep the modal readable if it is blank.
  const title = versionInfo.title?.trim()
    ? versionInfo.title
    : t(isForced ? 'appUpdate.forcedTitle' : 'appUpdate.optionalTitle');
  const body = versionInfo.message?.trim()
    ? versionInfo.message
    : t(isForced ? 'appUpdate.forcedBody' : 'appUpdate.optionalBody');

  // Block the Android hardware back button only while an update is mandatory.
  React.useEffect(() => {
    if (!visible || !isForced || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible, isForced]);

  React.useEffect(() => {
    if (!visible) return;
    trackEvent('app_update_prompt_shown', {
      update_status: isForced ? 'FORCE_UPDATE' : 'OPTIONAL_UPDATE',
      platform: Platform.OS,
      latest_build: versionInfo.latestBuild ?? null,
      latest_version: versionInfo.latestVersion ?? null,
    });
  }, [visible, isForced, versionInfo.latestBuild, versionInfo.latestVersion]);

  const handleUpdate = () => {
    trackEvent('app_update_cta_tapped', {
      update_status: isForced ? 'FORCE_UPDATE' : 'OPTIONAL_UPDATE',
      platform: Platform.OS,
      latest_build: versionInfo.latestBuild ?? null,
    });
    void openStore(versionInfo);
  };

  const handleDismiss = () => {
    trackEvent('app_update_dismissed', {
      platform: Platform.OS,
      latest_build: versionInfo.latestBuild ?? null,
    });
    onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isForced) handleDismiss();
      }}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconWrapper}>
            <Ionicons name="arrow-up-circle" size={48} color={colors.primary} />
          </View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.body}>{body}</Text>
          <TouchableOpacity
            style={s.button}
            onPress={handleUpdate}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('appUpdate.updateCta')}
          >
            <Text style={s.buttonText}>{t('appUpdate.updateCta')}</Text>
          </TouchableOpacity>
          {!isForced && (
            <TouchableOpacity
              style={s.secondaryButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('appUpdate.laterCta')}
            >
              <Text style={s.secondaryButtonText}>{t('appUpdate.laterCta')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 12,
    },
    iconWrapper: {
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 10,
      lineHeight: 28,
    },
    body: {
      fontSize: 15,
      color: colors.subtext,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 40,
      alignItems: 'center',
      width: '100%',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    secondaryButton: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 24,
      alignItems: 'center',
      width: '100%',
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.subtext,
    },
  });
}
