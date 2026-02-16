import { View, StyleSheet } from 'react-native';

export default function OnboardingBackground() {
  return (
    <View pointerEvents="none" style={styles.background}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    top: -140,
    left: -120,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: '#DCE9FF',
    opacity: 0.6,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -180,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: '#F5D6E8',
    opacity: 0.55,
  },
});
