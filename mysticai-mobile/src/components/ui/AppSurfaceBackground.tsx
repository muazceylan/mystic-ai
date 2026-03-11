import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../../theme';

export function AppSurfaceBackground() {
  return (
    <>
      <LinearGradient
        colors={[colors.bgSoft, colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.blobTopRight} />
      <View pointerEvents="none" style={styles.blobBottomLeft} />
    </>
  );
}

const styles = StyleSheet.create({
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -42,
    width: 230,
    height: 230,
    borderRadius: radius.pill,
    backgroundColor: colors.blobA,
  },
  blobBottomLeft: {
    position: 'absolute',
    left: -92,
    bottom: 140,
    width: 260,
    height: 260,
    borderRadius: radius.pill,
    backgroundColor: colors.blobB,
  },
});
