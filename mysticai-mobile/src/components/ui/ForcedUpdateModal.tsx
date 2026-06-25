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
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { AppVersionResponse, openStore } from '../../services/appVersionCheck';

interface ForcedUpdateModalProps {
  visible: boolean;
  versionInfo: AppVersionResponse;
}

export function ForcedUpdateModal({ visible, versionInfo }: ForcedUpdateModalProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);

  // Block Android hardware back button when update is required
  React.useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  const handleUpdate = () => {
    void openStore(versionInfo);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Intentionally blocking close — do not dismiss
      }}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconWrapper}>
            <Ionicons name="arrow-up-circle" size={48} color={colors.primary} />
          </View>
          <Text style={s.title}>Yeni bir sürüm mevcut</Text>
          <Text style={s.body}>Lütfen uygulamayı güncelleyiniz.</Text>
          <TouchableOpacity
            style={s.button}
            onPress={handleUpdate}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Güncelle"
          >
            <Text style={s.buttonText}>Güncelle</Text>
          </TouchableOpacity>
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
  });
}
