import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  type ImageStyle,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import { MATCH_AVATAR_FALLBACK_ASSETS } from '../../constants/matchDesignTokens';
import { useTheme } from '../../context/ThemeContext';

interface PersonAvatarProps {
  uri?: string | null;
  name: string;
  side?: 'left' | 'right';
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '•';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function PersonAvatar({
  uri,
  name,
  side = 'left',
  size = 52,
  style,
  imageStyle,
}: PersonAvatarProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [uriFailed, setUriFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  const normalizedUri = useMemo(() => {
    if (typeof uri !== 'string') return null;
    const trimmed = uri.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [uri]);

  useEffect(() => {
    setUriFailed(false);
    setFallbackFailed(false);
  }, [normalizedUri, side]);

  const hasRemote = Boolean(normalizedUri) && !uriFailed;
  const source = hasRemote
    ? { uri: normalizedUri! }
    : MATCH_AVATAR_FALLBACK_ASSETS[side];

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {!fallbackFailed ? (
        <Image
          source={source}
          style={[
            styles.image,
            {
              borderRadius: size / 2,
            },
            imageStyle,
          ]}
          resizeMode="cover"
          onError={() => {
            if (hasRemote) {
              setUriFailed(true);
              return;
            }
            setFallbackFailed(true);
          }}
        />
      ) : null}

      {fallbackFailed ? (
        <View style={styles.initialWrap}>
          <AccessibleText
            style={[styles.initialText, { fontSize: Math.max(12, Math.round(size * 0.35)) }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {initials(name)}
          </AccessibleText>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
) => StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initialWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  initialText: {
    color: isDark ? colors.primaryLight : '#4C1D95',
    fontWeight: '900',
  },
});
