import { useCallback, useEffect, useState } from 'react';
import { fetchPendingEarnings } from './jobs';

/** Saldo pending (masih direview) & saldo didapat (sudah diterima) dari pekerjaan. Aman bila tabel belum dimigrasi (0). */
export function usePendingEarnings(userId: string, refreshKey: unknown = null) {
  const empty = { amount: 0, count: 0, earned: 0, earnedCount: 0 };
  const [pending, setPending] = useState(empty);
  const reload = useCallback(async () => {
    if (!userId) return;
    try { setPending(await fetchPendingEarnings(userId)); } catch { setPending(empty); }
  }, [userId]);
  useEffect(() => { reload(); }, [reload, refreshKey]);
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);
  return { ...pending, reload };
}
