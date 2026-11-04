import { supabase } from '../supabase';
import type { HistoryItem } from '../components/WithdrawPage';

export const MIN_WITHDRAW = 1000;

export interface WithdrawResult {
  saldo: number;
  history: HistoryItem[];
}

const isMissingFn = (err: any) =>
  !!err && (err.code === 'PGRST202' || /could not find the function|does not exist/i.test(err.message || ''));

const cleanMessage = (err: any) => String(err?.message || err).replace(/^.*?ERROR:\s*/i, '');

/**
 * Ajukan withdraw tanpa kemungkinan saldo minus.
 * 1) RPC `request_withdraw` (atomik di server: kunci baris, cek saldo/jadwal, potong saldo).
 * 2) Cadangan sebelum migrasi: baca saldo TERBARU dari database, tolak jika kurang, lalu update
 *    bersyarat `saldo = <nilai yang dibaca>` (optimistic lock) agar dua permintaan bersamaan
 *    tidak bisa memotong saldo dua kali.
 */
export async function requestWithdraw(params: {
  userId: string;
  amount: number;
  userName: string;
  method: string;
  walletNumber: string;
}): Promise<WithdrawResult> {
  const { userId, amount, userName, method, walletNumber } = params;
  if (!Number.isInteger(amount) || amount < MIN_WITHDRAW) throw new Error(`Minimal penarikan Rp ${MIN_WITHDRAW.toLocaleString('id-ID')}`);

  // 1) Server-side
  const rpc = await supabase.rpc('request_withdraw', { p_amount: amount, p_user_name: userName });
  if (!rpc.error && rpc.data) {
    const fresh = await supabase.from('pengguna').select('saldo, withdraw_history').eq('id', userId).single();
    return {
      saldo: fresh.data?.saldo ?? (rpc.data as any).saldo,
      history: fresh.data?.withdraw_history ?? [(rpc.data as any).item],
    };
  }
  if (rpc.error && !isMissingFn(rpc.error)) throw new Error(cleanMessage(rpc.error));

  // 2) Cadangan (fungsi server belum dimigrasi)
  const { data: row, error: readErr } = await supabase
    .from('pengguna').select('saldo, withdraw_history').eq('id', userId).single();
  if (readErr || !row) throw new Error('Gagal membaca saldo terbaru');
  const current = Number(row.saldo) || 0;
  if (current < amount) {
    throw new Error(`Saldo tidak cukup (saldo Rp ${current.toLocaleString('id-ID')}, diminta Rp ${amount.toLocaleString('id-ID')})`);
  }

  const item: HistoryItem = {
    id: crypto.randomUUID(),
    amount,
    status: 'process',
    date: new Date().toISOString(),
    method,
    walletNumber,
    userName,
  };
  const history = [item, ...((row.withdraw_history as HistoryItem[]) || [])];
  const { data: updated, error: upErr } = await supabase
    .from('pengguna')
    .update({ saldo: current - amount, withdraw_history: history })
    .eq('id', userId)
    .eq('saldo', current) // hanya berhasil jika saldo belum berubah sejak dibaca
    .select('saldo');
  if (upErr) throw new Error(cleanMessage(upErr));
  if (!updated || updated.length === 0) throw new Error('Saldo berubah saat diproses. Silakan coba lagi.');
  return { saldo: current - amount, history };
}
