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
    gap: 7,
    alignItems: 'center',
  },
  rootCompact: {
    gap: 5,
  },
  eyebrow: {
    color: 'rgba(230,213,180,0.92)',
    fontSize: 13.2,
    fontWeight: '600',
    letterSpacing: 4.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: displaySerif,
    textShadowColor: 'rgba(255,240,205,0.16)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 9,
  },
});

export default memo(NightSkyPosterHeader);
