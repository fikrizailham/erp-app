import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, TextInput, Alert } from 'react-native';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import type { Invoice } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  PAID: '#16a34a',
  UNPAID: '#d97706',
  OVERDUE: '#dc2626',
};

export default function InvoicesScreen() {
  const { data: invoices, loading, refetch } = useApi<Invoice[]>('/invoices');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={invoices ?? []}
      keyExtractor={(inv) => inv.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      ListEmptyComponent={<Text style={styles.empty}>No invoices yet</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.period}</Text>
            <Text style={[styles.badge, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
          </View>
          <Text style={styles.meta}>${Number(item.total).toFixed(2)} — due {new Date(item.dueDate).toLocaleDateString()}</Text>
          {expandedId === item.id && <InvoiceExpanded invoice={item} onChanged={refetch} />}
        </Pressable>
      )}
    />
  );
}

function InvoiceExpanded({ invoice, onChanged }: { invoice: Invoice; onChanged: () => void }) {
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitProof() {
    if (!proofUrl) return;
    setSubmitting(true);
    try {
      await api.post(`/invoices/${invoice.id}/payment-proof`, { paymentProofUrl: proofUrl });
      setProofUrl('');
      onChanged();
      Alert.alert('Submitted', 'Payment proof submitted — the center will reconcile it shortly.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.expanded}>
      {invoice.lineItems.map((li, i) => (
        <View key={i} style={styles.lineItem}>
          <Text style={styles.lineDesc}>{li.description}</Text>
          <Text style={styles.lineAmount}>${li.amount.toFixed(2)}</Text>
        </View>
      ))}
      {invoice.status !== 'PAID' && (
        <View style={styles.proofRow}>
          <TextInput
            style={styles.proofInput}
            placeholder="Payment proof URL"
            autoCapitalize="none"
            value={proofUrl}
            onChangeText={setProofUrl}
          />
          <Pressable style={styles.smallButton} onPress={submitProof} disabled={submitting}>
            <Text style={styles.smallButtonText}>{submitting ? '...' : 'Submit'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  badge: { fontSize: 12, fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  expanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  lineDesc: { color: '#374151', fontSize: 13 },
  lineAmount: { color: '#111827', fontSize: 13, fontWeight: '600' },
  proofRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  proofInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 8, fontSize: 13 },
  smallButton: { backgroundColor: '#2E7D32', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  smallButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
