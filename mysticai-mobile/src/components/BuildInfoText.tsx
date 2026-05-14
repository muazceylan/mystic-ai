import { useMemo, useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getBuildInfo, formatBuildInfoCompact, formatBuildInfoFull } from '../services/buildInfo';

interface BuildInfoTextProps {
  expanded?: boolean;
  style?: object;
}

export default function BuildInfoText({ expanded = false, style }: BuildInfoTextProps) {
  const { colors } = useTheme();
  const [pressCount, setPressCount] = useState(0);
  const info = useMemo(() => getBuildInfo(), []);
  const compact = formatBuildInfoCompact(info);
  const full = formatBuildInfoFull(info);

  const handlePress = () => {
    setPressCount((n) => n + 1);
    Alert.alert('Build Info', full, [{ text: 'OK' }]);
  };

  const S = makeStyles(colors);

  if (expanded) {
    return (
      <View style={[S.expandedContainer, style]}>
        {full.split('\n').map((line) => (
          <Text key={line} style={S.expandedLine} accessibilityRole="text">
            {line}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Build info: ${compact}`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={style}
    >
      <Text style={S.compactText}>{compact}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    compactText: {
      color: C.subtext,
      fontSize: 11,
      textAlign: 'center',
      opacity: 0.7,
    },
    expandedContainer: {
      alignItems: 'flex-start',
      gap: 2,
    },
    expandedLine: {
      color: C.subtext,
      fontSize: 11,
      lineHeight: 17,
      opacity: 0.75,
    },
  });
}
