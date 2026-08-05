import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useApi } from '@/lib/useApi';
import type { Enrollment, Lead } from '@/types';

export default function EnrollmentScreen() {
  const { data: enrollments, loading, refetch } = useApi<Enrollment[]>('/enrollments');
  const { data: leads } = useApi<Lead[]>('/leads');

  const items = [
    ...(enrollments ?? []).map((e) => ({ kind: 'enrollment' as const, item: e })),
    ...(leads ?? []).map((l) => ({ kind: 'lead' as const, item: l })),
  ];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(row) => `${row.kind}-${row.item.id}`}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      ListEmptyComponent={<Text style={styles.empty}>No enrollment or waitlist records yet</Text>}
      renderItem={({ item: row }) => {
        if (row.kind === 'enrollment') {
          const e = row.item as Enrollment;
          return (
            <View style={styles.card}>
              <Text style={styles.name}>{e.child?.name}</Text>
              <Text style={styles.meta}>{e.program?.name} — {e.program?.ageGroup}</Text>
              <StatusBadge status={e.status} />
            </View>
          );
        }
        const l = row.item as Lead;
        return (
          <View style={styles.card}>
            <Text style={styles.name}>{l.childName}</Text>
            {l.waitlistPosition != null && (
              <Text style={styles.meta}>Waitlist position #{l.waitlistPosition}</Text>
            )}
            <StatusBadge status={l.status} />
          </View>
        );
      }}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  badge: { backgroundColor: '#f0f9f0', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  badgeText: { color: '#2E7D32', fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
