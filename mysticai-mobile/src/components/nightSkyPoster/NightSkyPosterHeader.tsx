import React, { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { NightSkyPosterModel } from '../../features/nightSkyPoster/poster.types';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';
import PosterIdentityBlock from './PosterIdentityBlock';
import PosterMetaRow from './PosterMetaRow';

const displaySerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});

type Props = {
  model: NightSkyPosterModel;
};

/**
 * Header matching the reference poster:
 * DOĞDUĞUN GECE GÖKYÜZÜ (gold, spaced, small)
 * 1994-10-03 · 15:00 (cream)
 * Türkiye, Afyonkarahisar (lighter)
 * 38.7507, 30.5567 (subtlest)
 */
function NightSkyPosterHeader({ model }: Props) {
  const hasIdentity = Boolean(model.displayName?.trim());

  return (
    <View style={[styles.root, !hasIdentity && styles.rootCompact]}>
      <Text style={styles.eyebrow}>{model.titleLabel}</Text>
      {hasIdentity ? <PosterIdentityBlock displayName={model.displayName} /> : null}
      <PosterMetaRow
        birthDateTimeLabel={model.birthDateTimeLabel}
        locationLabel={model.locationLabel}
        coordinatesLabel={model.coordinatesLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 3,
    alignItems: 'center',
  },
  rootCompact: {
    gap: 2,
  },
  eyebrow: {
    color: 'rgba(215,190,120,0.85)',
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: displaySerif,
  },
});

export default memo(NightSkyPosterHeader);
