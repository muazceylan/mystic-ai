import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckCircle2, ChevronDown, Globe2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';

type LocaleCode = 'tr' | 'en';

type LanguageSwitcherProps = {
  style?: ViewStyle;
};

const LANGUAGES: Array<{ code: LocaleCode; labelKey: string }> = [
  { code: 'tr', labelKey: 'language.turkish' },
  { code: 'en', labelKey: 'language.english' },
];

const LANGUAGE_PILL_PURPLE = '#7B3FF2';

function normalizeLocale(language?: string): LocaleCode {
  return language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export function LanguageSwitcher({ style }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [savingCode, setSavingCode] = useState<LocaleCode | null>(null);
  const currentLocale = normalizeLocale(i18n.language);
  const s = useMemo(
    () => makeStyles(colors, Math.max(insets.bottom, 16)),
    [colors, insets.bottom],
  );

  const handleSelect = async (code: LocaleCode) => {
    if (savingCode || code === currentLocale) {
      setVisible(false);
      return;
    }

    setSavingCode(code);
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      setVisible(false);
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[s.button, style]}
        onPress={() => setVisible(true)}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={t('language.changeA11y')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Globe2 size={22} color={LANGUAGE_PILL_PURPLE} strokeWidth={2} />
        <Text style={s.buttonText}>{currentLocale.toUpperCase()}</Text>
        <ChevronDown size={16} color={LANGUAGE_PILL_PURPLE} strokeWidth={2.2} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
        accessibilityViewIsModal
      >
        <View style={s.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.title}>{t('language.sheetTitle')}</Text>

            {LANGUAGES.map((language) => {
              const isActive = currentLocale === language.code;
              return (
                <TouchableOpacity
                  key={language.code}
                  style={[s.option, isActive && s.optionActive]}
                  onPress={() => handleSelect(language.code)}
                  accessibilityRole="button"
                  accessibilityLabel={t('language.selectAccessibility', {
                    language: t(language.labelKey),
                  })}
                  activeOpacity={0.76}
                  disabled={savingCode !== null}
                >
                  <View style={s.optionLeft}>
                    <View style={[s.optionIcon, isActive && s.optionIconActive]}>
                      <Text style={[s.optionCode, isActive && s.optionCodeActive]}>
                        {language.code.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[s.optionText, isActive && s.optionTextActive]}>
                      {t(language.labelKey)}
                    </Text>
                  </View>
                  {isActive ? (
                    <CheckCircle2 size={22} color={colors.primary} strokeWidth={2} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors'], bottomPadding: number) {
  return StyleSheet.create({
    button: {
      width: 94,
      height: 46,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(209,190,244,0.62)',
      backgroundColor: 'rgba(255,255,255,0.84)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 9 },
      shadowOpacity: 0.1,
      shadowRadius: 17,
      elevation: 5,
    },
    buttonText: {
      color: LANGUAGE_PILL_PURPLE,
      fontSize: 18,
      lineHeight: 24,
      fontFamily: 'MysticInter-SemiBold',
      letterSpacing: 0,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(19, 12, 43, 0.32)',
    },
    sheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: bottomPadding,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: -12 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 8,
    },
    handle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    title: {
      color: C.text,
      fontSize: 18,
      lineHeight: 24,
      fontFamily: 'MysticInter-SemiBold',
      marginBottom: 12,
    },
    option: {
      minHeight: 56,
      borderRadius: 18,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    optionActive: {
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    optionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.border,
    },
    optionIconActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    optionCode: {
      color: C.primary,
      fontSize: 12,
      fontFamily: 'MysticInter-SemiBold',
    },
    optionCodeActive: {
      color: C.white,
    },
    optionText: {
      color: C.text,
      fontSize: 15,
      fontFamily: 'MysticInter-SemiBold',
    },
    optionTextActive: {
      color: C.primary,
    },
  });
}
