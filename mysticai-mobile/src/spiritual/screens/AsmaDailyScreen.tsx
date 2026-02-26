import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useSpiritualDaily } from '../hooks/useSpiritualDaily';
import { spiritualApi } from '../api/spiritual.api';

export default function AsmaDailyScreen() {
  const { asma } = useSpiritualDaily();
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  if (asma.isLoading) return <View style={styles.center}><Text>Gunun esmasi yukleniyor...</Text></View>;
  if (asma.isError || !asma.data) return <View style={styles.center}><Text>Esma yuklenemedi.</Text></View>;

  const target = asma.data.recommendedDhikrCount ?? 33;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Gunun Esmasi</Text>
      <View style={styles.card}>
        <Text style={styles.arabic}>{asma.data.arabicName}</Text>
        <Text style={styles.name}>{asma.data.transliterationTr}</Text>
        <Text style={styles.meaning}>{asma.data.meaningTr}</Text>
        <Text style={styles.note}>{asma.data.reflectionTextTr}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.counter}>{count} / {target}</Text>
        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={() => setCount((v) => v + 1)}><Text style={styles.btnText}>+1</Text></Pressable>
          <Pressable style={styles.btn} onPress={() => setCount((v) => v + 11)}><Text style={styles.btnText}>+11</Text></Pressable>
          <Pressable style={styles.btn} onPress={() => setCount((v) => v + 33)}><Text style={styles.btnText}>+33</Text></Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
        disabled={saving || count <= 0}
        onPress={async () => {
          setSaving(true);
          try {
            await spiritualApi.logAsma({
              date: asma.data!.date,
              asmaId: asma.data!.asmaId,
              count,
            });
          } finally {
            setSaving(false);
          }
        }}
      >
        <Text style={styles.primaryBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
      </Pressable>

      <Text style={styles.disclaimer}>Bu icerikler bilgilendirme amaclidir.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  container: { padding: 16, gap: 12, backgroundColor: '#F9FAFB', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, gap: 8 },
  arabic: { fontSize: 24, fontWeight: '700', color: '#111827' },
  name: { fontSize: 16, fontWeight: '700', color: '#6D28D9' },
  meaning: { color: '#374151' },
  note: { color: '#6B7280', lineHeight: 18 },
  counter: { fontSize: 18, fontWeight: '700', color: '#111827' },
  row: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: '#F5F3FF', borderRadius: 10, borderWidth: 1, borderColor: '#DDD6FE', paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { color: '#6D28D9', fontWeight: '700' },
  primaryBtn: { backgroundColor: '#7C3AED', borderRadius: 14, alignItems: 'center', paddingVertical: 12 },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
});

