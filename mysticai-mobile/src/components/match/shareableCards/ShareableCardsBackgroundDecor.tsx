import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function ShareableCardsBackgroundDecor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Base: warm lavender → soft lilac */}
      <LinearGradient
        colors={['#EDE3FA', '#DDD0F4', '#E8DCFA', '#F0E8FF']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Cloud layer 1 — large soft blob top-right */}
      <View style={[styles.cloud, styles.cloudTopRight]} />
      {/* Cloud layer 2 — mid-left soft mass */}
      <View style={[styles.cloud, styles.cloudMidLeft]} />
      {/* Cloud layer 3 — bottom-center atmospheric */}
      <View style={[styles.cloud, styles.cloudBottom]} />
      {/* Cloud layer 4 — subtle pink mist */}
      <View style={[styles.cloud, styles.cloudPinkMist]} />

      {/* Subtle shimmer highlights */}
      <View style={[styles.shimmer, styles.shimmerOne]} />
      <View style={[styles.shimmer, styles.shimmerTwo]} />
      <View style={[styles.shimmer, styles.shimmerThree]} />
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    borderRadius: 999,
  },
  cloudTopRight: {
    width: 340,
    height: 280,
    top: -40,
    right: -80,
    backgroundColor: 'rgba(200, 175, 240, 0.45)',
  },
  cloudMidLeft: {
    width: 300,
    height: 260,
    top: 180,
    left: -100,
    backgroundColor: 'rgba(215, 190, 250, 0.38)',
  },
  cloudBottom: {
    width: 380,
    height: 300,
    bottom: 40,
    right: -60,
    backgroundColor: 'rgba(195, 170, 235, 0.32)',
  },
  cloudPinkMist: {
    width: 260,
    height: 220,
    bottom: 200,
    left: -50,
    backgroundColor: 'rgba(240, 200, 235, 0.28)',
  },
  shimmer: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  shimmerOne: {
    top: 130,
    left: 60,
  },
  shimmerTwo: {
    top: 280,
    right: 70,
  },
  shimmerThree: {
    bottom: 240,
    left: 120,
  },
});
