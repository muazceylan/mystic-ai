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
    gap: 1,
  },
  dateTime: {
    color: 'rgba(230,220,195,0.8)',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  location: {
    color: 'rgba(220,210,190,0.6)',
    fontSize: 11.5,
    textAlign: 'center',
    letterSpacing: 0.3,
    maxWidth: 260,
  },
  coordinates: {
    color: 'rgba(200,180,130,0.45)',
    fontSize: 10.5,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});

export default memo(PosterMetaRow);
