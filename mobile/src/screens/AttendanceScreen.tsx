import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert } from 'react-native';
import { useApi } from '@/lib/useApi';
import { api, ApiError } from '@/lib/api';
import type { AttendanceRecord, Child } from '@/types';

export default function AttendanceScreen() {
  const { data: children } = useApi<Child[]>('/children');
  const { data: records, loading, refetch } = useApi<AttendanceRecord[]>('/attendance');
  const [busyChildId, setBusyChildId] = useState<string | null>(null);

  const openRecordByChild = new Map<string, AttendanceRecord>();
  (records ?? []).forEach((r) => {
    if (!r.checkOutTime) openRecordByChild.set(r.childId, r);
  });

  async function checkIn(childId: string) {
    setBusyChildId(childId);
    try {
      await api.post('/attendance/check-in', { childId });
      refetch();
    } catch (err) {
      Alert.alert('Check-in failed', err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusyChildId(null);
    }
  }

  async function checkOut(childId: string) {
    setBusyChildId(childId);
    try {
      await api.post('/attendance/check-out', { childId });
      refetch();
    } catch (err) {
      Alert.alert('Check-out failed', err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusyChildId(null);
    }
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={children ?? []}
      keyExtractor={(c) => c.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      ListEmptyComponent={<Text style={styles.empty}>No children on file</Text>}
      ListHeaderComponent={<Text style={styles.sectionTitle}>Self check-in / check-out</Text>}
      renderItem={({ item: child }) => {
        const present = openRecordByChild.has(child.id);
        const busy = busyChildId === child.id;
        return (
          <View style={styles.card}>
            <Text style={styles.name}>{child.name}</Text>
            <Text style={present ? styles.present : styles.absent}>{present ? 'Currently checked in' : 'Not checked in'}</Text>
            <Pressable
              style={[styles.button, present ? styles.buttonOut : styles.buttonIn]}
              disabled={busy}
              onPress={() => (present ? checkOut(child.id) : checkIn(child.id))}
            >
              <Text style={styles.buttonText}>{busy ? '...' : present ? 'Check Out' : 'Check In'}</Text>
            </Pressable>
          </View>
        );
      }}
      ListFooterComponent={
        <>
          <Text style={styles.sectionTitle}>Recent history</Text>
          {(records ?? []).slice(0, 10).map((r) => (
            <View key={r.id} style={styles.historyRow}>
              <Text style={styles.historyName}>{r.child?.name}</Text>
              <Text style={styles.historyTime}>
                {new Date(r.checkInTime).toLocaleString()} {r.checkOutTime ? `→ ${new Date(r.checkOutTime).toLocaleTimeString()}` : '(present)'}
              </Text>
            </View>
          ))}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginVertical: 10 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontSize: 16, fontWeight: '600' },
  present: { color: '#16a34a', fontSize: 13, marginTop: 2, fontWeight: '600' },
  absent: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  button: { borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  buttonIn: { backgroundColor: '#2E7D32' },
  buttonOut: { backgroundColor: '#374151' },
  buttonText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  historyRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  historyName: { fontWeight: '600', fontSize: 13 },
  historyTime: { color: '#6b7280', fontSize: 12 },
});
