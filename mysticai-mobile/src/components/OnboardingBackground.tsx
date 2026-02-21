import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function OnboardingBackground() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View pointerEvents="none" style={styles.background}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
    </View>
  );
}

function createStyles(C: { glowTop: string; glowBottom: string }) {
  return StyleSheet.create({
    background: { ...StyleSheet.absoluteFillObject },
    glowTop: {
      position: 'absolute',
      top: -140,
      left: -120,
      width: 280,
      height: 280,
      borderRadius: 999,
      backgroundColor: C.glowTop,
      opacity: 0.6,
    },
    glowBottom: {
      position: 'absolute',
      bottom: -180,
      right: -120,
      width: 320,
      height: 320,
      borderRadius: 999,
      backgroundColor: C.glowBottom,
      opacity: 0.55,
    },
  });
}
