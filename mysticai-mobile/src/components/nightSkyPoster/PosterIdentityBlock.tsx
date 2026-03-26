import React, { memo, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';

type Props = {
  displayName?: string | null;
};

const displaySerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});

function PosterIdentityBlock({ displayName }: Props) {
  const normalizedName = (displayName ?? '').trim();
  if (!normalizedName) return null;

  const titleSize = useMemo(() => {
    const length = normalizedName.length;
    if (length > 28) return 27;
    if (length > 22) return 29;
    if (length > 16) return 31;
    return posterTokens.typography.titleSize;
  }, [normalizedName]);

  return (
    <View style={styles.root}>
      <Text
        style={[
          styles.title,
          {
            fontSize: titleSize,
            lineHeight: titleSize * 1.1,
          },
        ]}
        numberOfLines={2}
      >
        {normalizedName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: posterTokens.spacing.xs,
    paddingHorizontal: posterTokens.spacing.lg,
  },
  title: {
    color: posterTokens.colors.textPrimary,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
    fontFamily: displaySerif,
    textAlign: 'center',
    maxWidth: 300,
    letterSpacing: 0.2,
  },
});

export default memo(PosterIdentityBlock);
