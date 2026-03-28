import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  birthDateTimeLabel: string;
  locationLabel: string;
  coordinatesLabel?: string;
};

/**
 * Meta row matching the reference poster:
 * date · time (cream/gold)
 * location (lighter)
 * coordinates (subtlest gold)
 */
function PosterMetaRow({ birthDateTimeLabel, locationLabel, coordinatesLabel }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.dateTime} numberOfLines={1} ellipsizeMode="tail">
        {birthDateTimeLabel}
      </Text>
      <Text style={styles.location} numberOfLines={2} ellipsizeMode="tail">
        {locationLabel}
      </Text>
      {coordinatesLabel ? (
        <Text style={styles.coordinates} numberOfLines={1} ellipsizeMode="tail">
          {coordinatesLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 4,
  },
  dateTime: {
    color: 'rgba(239,229,206,0.9)',
    fontSize: 18.5,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  location: {
    color: 'rgba(231,220,198,0.82)',
    fontSize: 14.5,
    textAlign: 'center',
    letterSpacing: 0.35,
    maxWidth: 288,
  },
  coordinates: {
    color: 'rgba(220,204,170,0.72)',
    fontSize: 13.6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default memo(PosterMetaRow);
