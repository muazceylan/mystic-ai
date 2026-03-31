import React, { useEffect, useState } from 'react';
import { InteractionManager, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOW } from '../../constants/tokens';
import { AppText } from './AppText';
import { PremiumIconBadge, type PremiumIconTone } from './PremiumIconBadge';

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconStyle?: 'default' | 'premium';
  iconTone?: PremiumIconTone;
  expanded: boolean;
  onToggle: (id: string) => void;
  onLayout?: (id: string, y: number, height: number) => void;
  headerMeta?: React.ReactNode;
  headerRight?: React.ReactNode;
  lazy?: boolean;
  deferBodyMount?: boolean;
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
};

function AccordionSection({
  id,
  title,
  subtitle,
  icon = 'chevron-down',
  iconStyle = 'default',
  iconTone = 'mystic',
  expanded,
  onToggle,
  onLayout,
  headerMeta,
  headerRight,
  lazy = false,
  deferBodyMount = false,
  placeholder,
  children,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [bodyReady, setBodyReady] = useState(!lazy);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (!onLayout) return;
    const { y, height } = e.nativeEvent.layout;
    onLayout(id, y, height);
  };

  useEffect(() => {
    if (!lazy || !expanded || bodyReady) return;
    if (!deferBodyMount) {
      setBodyReady(true);
      return;
    }

    let settled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (settled) return;
      settled = true;
      setBodyReady(true);
    });
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      task?.cancel?.();
      setBodyReady(true);
    }, 220);

    return () => {
      settled = true;
      clearTimeout(timeout);
      task?.cancel?.();
    };
  }, [lazy, expanded, bodyReady, deferBodyMount]);

  const renderSectionIcon = () => {
    if (iconStyle !== 'premium') {
      return (
        <View style={[styles.iconWrap, { backgroundColor: colors.violetBg }]}>
          <Ionicons name={icon} size={15} color={colors.violet} />
        </View>
      );
    }

    return <PremiumIconBadge icon={icon} tone={iconTone} size={38} iconSize={17} glowSize={50} />;
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: expanded ? colors.violet + '55' : colors.border,
          shadowColor: colors.shadow,
        },
      ]}
      onLayout={handleLayout}
    >
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && { opacity: 0.9 },
        ]}
        onPress={() => onToggle(id)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title} ${expanded ? t('common.collapse') : t('common.expand')}`}
      >
        <View style={styles.headerLeft}>
          {renderSectionIcon()}
          <View style={styles.headerTextCol}>
            <AppText variant="SmallBold" color="primary" numberOfLines={2} ellipsizeMode="tail" weight="800">
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="CaptionSmall" color="secondary" numberOfLines={2} ellipsizeMode="tail" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
            {headerMeta ? <View style={styles.headerMetaWrap}>{headerMeta}</View> : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          {headerRight}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {lazy && !bodyReady ? (
            placeholder ?? (
              <View style={[styles.placeholder, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <AppText variant="Caption" color="muted" weight="600">
                  {t('ui.accordion.loading')}
                </AppText>
              </View>
            )
          ) : children}
        </View>
      ) : null}
    </View>
  );
}

export default React.memo(AccordionSection);

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.xl - 2,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  header: {
    minHeight: 62,
    paddingHorizontal: SPACING.mdLg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.smMd,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.smMd,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 1,
  },
  headerMetaWrap: {
    marginTop: SPACING.xsSm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  body: {
    paddingHorizontal: SPACING.mdLg,
    paddingBottom: SPACING.mdLg,
  },
  placeholder: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smMd,
  },
});
