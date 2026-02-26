import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useState } from 'react';

export default function SpiritualSettingsScreen() {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [morningReminder, setMorningReminder] = useState(true);
  const [eveningReminder, setEveningReminder] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ruhsal Ayarlar</Text>

      <View style={styles.card}>
        <Row label="Sabah hatirlatici" value={morningReminder} onChange={setMorningReminder} />
        <Divider />
        <Row label="Aksam hatirlatici" value={eveningReminder} onChange={setEveningReminder} />
      </View>

      <View style={styles.card}>
        <Row label="TTS (varsayilan kapali)" value={ttsEnabled} onChange={setTtsEnabled} />
        <Divider />
        <Row label="Okuma modu (buyuk font)" value={readingMode} onChange={setReadingMode} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Icerik dili</Text>
        <Text style={styles.sectionSub}>TR (future: EN/AR altyapisi desteklenecek)</Text>
      </View>

      <Pressable style={styles.outlineBtn}>
        <Text style={styles.outlineBtnText}>JSON Export (opsiyonel)</Text>
      </Pressable>

      <Pressable style={styles.outlineBtn}>
        <Text style={styles.outlineBtnText}>Hatali icerik bildir</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#F9FAFB', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: '#111827', flex: 1, marginRight: 12 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  sectionTitle: { fontWeight: '700', color: '#111827' },
  sectionSub: { marginTop: 4, color: '#6B7280', fontSize: 12 },
  outlineBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  outlineBtnText: { color: '#374151', fontWeight: '600' },
});

