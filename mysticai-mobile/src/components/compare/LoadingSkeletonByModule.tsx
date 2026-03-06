import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function LoadingSkeletonByModule() {
  return (
    <View style={styles.wrap}>
      <View style={[styles.block, styles.hero]} />
      <View style={[styles.block, styles.card]} />
      <View style={styles.grid}>
        <View style={[styles.block, styles.metric]} />
        <View style={[styles.block, styles.metric]} />
        <View style={[styles.block, styles.metric]} />
        <View style={[styles.block, styles.metric]} />
      </View>
      <View style={[styles.block, styles.card]} />
      <View style={[styles.block, styles.card]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  block: {
    borderRadius: 14,
    backgroundColor: '#EEE8F8',
    borderWidth: 1,
    borderColor: '#E4DCF0',
  },
  hero: {
    height: 130,
  },
  card: {
    height: 88,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    width: '48.7%',
    height: 108,
  },
});
