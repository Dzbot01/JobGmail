import { useCallback, useEffect, useState } from 'react';
import { fetchPendingEarnings } from './jobs';

/** Saldo pending dari pekerjaan yang masih direview. Aman bila tabel belum dimigrasi (0). */
export function usePendingEarnings(userId: string, refreshKey: unknown = null) {
  const [pending, setPending] = useState({ amount: 0, count: 0 });
  const reload = useCallback(async () => {
    if (!userId) return;
    try { setPending(await fetchPendingEarnings(userId)); } catch { setPending({ amount: 0, count: 0 }); }
  }, [userId]);
  useEffect(() => { reload(); }, [reload, refreshKey]);
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);
  return { ...pending, reload };
}
