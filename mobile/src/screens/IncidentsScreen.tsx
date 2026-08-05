import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import type { IncidentLog } from '@/types';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#6b7280',
  MEDIUM: '#d97706',
  HIGH: '#ea580c',
  CRITICAL: '#dc2626',
};

export default function IncidentsScreen() {
  const { data, loading, refetch } = useApi<IncidentLog[]>('/incidents');

  async function acknowledge(id: string) {
    await api.patch(`/incidents/${id}/acknowledge`, {});
    refetch();
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={data ?? []}
      keyExtractor={(inc) => inc.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      ListEmptyComponent={<Text style={styles.empty}>No incidents on file</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.child?.name} — {item.type.replace(/_/g, ' ')}</Text>
            <Text style={[styles.severity, { color: SEVERITY_COLORS[item.severity] }]}>{item.severity}</Text>
          </View>
          <Text style={styles.desc}>{item.description}</Text>
          <Text style={styles.meta}>{new Date(item.timestamp).toLocaleString()}</Text>
          {!item.parentAck ? (
            <Pressable style={styles.ackButton} onPress={() => acknowledge(item.id)}>
              <Text style={styles.ackButtonText}>Acknowledge</Text>
            </Pressable>
          ) : (
            <Text style={styles.acked}>✓ Acknowledged</Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  severity: { fontSize: 12, fontWeight: '700' },
  desc: { color: '#374151', fontSize: 13, marginTop: 6 },
  meta: { color: '#9ca3af', fontSize: 12, marginTop: 6 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  ackButton: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 10 },
  ackButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  acked: { color: '#16a34a', fontWeight: '600', fontSize: 12, marginTop: 10 },
});
