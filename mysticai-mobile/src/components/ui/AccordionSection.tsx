import React, { useEffect, useState } from 'react';
import { InteractionManager, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
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
  const { colors } = useTheme();
  const [bodyReady, setBodyReady] = useState(!lazy);
  const progress = useSharedValue(expanded ? 1 : 0);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (!onLayout) return;
    const { y, height } = e.nativeEvent.layout;
    onLayout(id, y, height);
  };

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: expanded ? 180 : 120 });
  }, [expanded, progress]);

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

  const animatedBodyStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 6 }],
  }));

  return (
    <Reanimated.View
      layout={Layout.springify().damping(18).stiffness(180)}
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
        accessibilityLabel={`${title} bölümünü ${expanded ? 'daralt' : 'genişlet'}`}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: colors.violetBg }]}>
            <Ionicons name={icon} size={15} color={colors.violet} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={2} ellipsizeMode="tail">
                {subtitle}
              </Text>
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
        <Reanimated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={[styles.body, animatedBodyStyle]}
        >
          {lazy && !bodyReady ? (
            placeholder ?? (
              <View style={[styles.placeholder, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>İçerik hazırlanıyor…</Text>
              </View>
            )
          ) : children}
        </Reanimated.View>
      ) : null}
    </Reanimated.View>
  );
}

export default React.memo(AccordionSection);

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  header: {
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },
  headerMetaWrap: {
    marginTop: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  placeholder: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
