import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { checkOracleHealth } from '../services/oracle.service';

interface Props {
  onStatusChange?: (online: boolean) => void;
}

export default function ServiceStatus({ onStatusChange }: Props) {
  const [online, setOnline] = useState<boolean | null>(null);

  const check = async () => {
    const result = await checkOracleHealth();
    setOnline(result);
    onStatusChange?.(result);
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (online === null) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, online ? styles.dotOnline : styles.dotOffline]} />
      <Text style={styles.label}>{online ? 'Oracle aktif' : 'Oracle ulasilamyor'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: COLORS.success,
  },
  dotOffline: {
    backgroundColor: COLORS.error,
  },
  label: {
    fontSize: 10,
    color: COLORS.subtext,
    fontWeight: '500',
  },
});
