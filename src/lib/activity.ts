import { supabase } from '../supabase';
import { toTime } from './datetime';

export type ActivityType = 'setoran' | 'withdraw' | 'spin';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  name: string;
  text: string;
  at: string;
}

/** Hadiah spin terbaru (tabel spin_wins, diisi trigger server). Kosong bila migrasi belum dijalankan. */
export async function fetchRecentSpinWins(limit = 20) {
  const { data, error } = await supabase
    .from('spin_wins')
    .select('id, user_id, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

const rupiah = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

/**
 * Gabungkan aktivitas user terbaru: kirim tugas, request withdraw, menang spin harian.
 * Setoran massal (timestamp sama dari user yang sama) digabung jadi satu baris.
 */
export function buildActivities(
  submissions: any[],
  withdraws: any[],
  spinWins: any[],
  nameOf: (userId?: string, email?: string) => string,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  const groups = new Map<string, { s: any; n: number }>();
  for (const s of submissions || []) {
    if (!s?.timestamp) continue;
    const key = `${s.userId}|${s.timestamp}`;
    const g = groups.get(key);
    if (g) g.n++;
    else groups.set(key, { s, n: 1 });
  }
  groups.forEach(({ s, n }, key) => {
    items.push({
      id: `setoran-${key}`,
      type: 'setoran',
      name: s.userName || nameOf(s.userId, s.userEmail),
      text: n > 1 ? `mengirim ${n} tugas setoran` : `mengirim tugas setoran ${s.email || ''}`.trim(),
      at: s.timestamp,
    });
  });

  for (const w of withdraws || []) {
    if (!w?.date) continue;
    items.push({
      id: `withdraw-${w.id}`,
      type: 'withdraw',
      name: w.userName || nameOf(w.userId, w.userEmail),
      text: `request withdraw ${rupiah(w.amount)}${w.method ? ` via ${w.method}` : ''}`,
      at: w.date,
    });
  }

  for (const r of spinWins || []) {
    items.push({
      id: `spin-${r.id}`,
      type: 'spin',
      name: nameOf(r.user_id),
      text: `memenangkan hadiah ${rupiah(r.amount)} di Spin Harian`,
      at: r.created_at,
    });
  }

  return items.sort((a, b) => toTime(b.at) - toTime(a.at));
}
