import { supabase } from '../supabase';

/**
 * Sistem referral.
 * - Link: https://<domain>/?ref=<id pengundang>
 * - Kode ref disimpan di localStorage sampai akun baru dibuat (bertahan melewati redirect login Google).
 * - Akun baru menyimpan `pengguna.referred_by = <id pengundang>`.
 * - Setiap tugas user undangan yang di-set "paid" oleh admin → saldo pengundang + REFERRAL_REWARD.
 *
 * Membutuhkan kolom `referred_by` dan `referral_earnings` (lihat supabase/migrations/*_referral.sql).
 * Semua fungsi di sini aman dipanggil sebelum migrasi: jika kolom belum ada, referral dilewati.
 */
export const REFERRAL_REWARD = 50;
const STORAGE_KEY = 'jg_ref';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Panggil sekali saat aplikasi dimuat: simpan ?ref= dari URL. */
export function captureReferralFromUrl() {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && UUID_RE.test(ref)) localStorage.setItem(STORAGE_KEY, ref.toLowerCase());
  } catch { /* storage diblokir */ }
}

export function getStoredReferral(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && UUID_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function clearStoredReferral() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* abaikan */ }
}

export const buildReferralLink = (userId: string) => `${window.location.origin}/?ref=${userId}`;

/** Kolom referral belum ada di database (migrasi belum dijalankan) */
export const isMissingColumnError = (err: any) =>
  !!err && (err.code === '42703' || err.code === 'PGRST204' || /column .* does not exist|could not find the .* column/i.test(err.message || ''));

/**
 * Dipanggil admin setelah tugas user `refereeId` berubah menjadi "paid".
 * Mengembalikan email pengundang yang menerima bonus, atau null jika tidak ada.
 */
export async function creditReferralReward(refereeId: string): Promise<string | null> {
  try {
    const { data: referee, error: e1 } = await supabase
      .from('pengguna').select('referred_by').eq('id', refereeId).single();
    if (e1 || !referee?.referred_by || referee.referred_by === refereeId) return null;

    const referrerId = referee.referred_by as string;
    const { data: referrer, error: e2 } = await supabase
      .from('pengguna').select('saldo, email, referral_earnings').eq('id', referrerId).single();
    if (e2 || !referrer) return null;

    const { error: e3 } = await supabase
      .from('pengguna')
      .update({
        saldo: (referrer.saldo || 0) + REFERRAL_REWARD,
        referral_earnings: (referrer.referral_earnings || 0) + REFERRAL_REWARD,
      })
      .eq('id', referrerId);
    if (e3) {
      console.error('Gagal memberi bonus referral:', e3);
      return null;
    }
    return referrer.email || referrerId;
  } catch (err) {
    console.error('Gagal memberi bonus referral:', err);
    return null;
  }
}

export interface ReferralSummary {
  invitees: { email: string; paidTasks: number }[];
  earnings: number;
  /** false jika kolom/fungsi referral belum tersedia di database */
  available: boolean;
}

/** Statistik referral untuk user yang sedang login. */
export async function fetchReferralSummary(userId: string): Promise<ReferralSummary> {
  let invitees: { email: string; paidTasks: number }[] = [];
  let available = true;

  // 1) Fungsi RPC (SECURITY DEFINER) — aman walau RLS membatasi baca baris user lain
  const rpc = await supabase.rpc('get_my_referrals');
  if (!rpc.error && Array.isArray(rpc.data)) {
    invitees = rpc.data.map((r: any) => ({ email: r.email || '-', paidTasks: Number(r.paid_tasks) || 0 }));
  } else {
    // 2) Fallback: query langsung (berhasil jika RLS mengizinkan)
    const q = await supabase.from('pengguna').select('email, history').eq('referred_by', userId);
    if (q.error) {
      if (isMissingColumnError(q.error)) available = false;
    } else {
      invitees = (q.data || []).map((u: any) => ({
        email: u.email || '-',
        paidTasks: (u.history || []).filter((t: any) => t.status === 'paid').length,
      }));
    }
  }

  // Total bonus yang benar-benar sudah dikreditkan
  let earnings = invitees.reduce((sum, i) => sum + i.paidTasks * REFERRAL_REWARD, 0);
  const own = await supabase.from('pengguna').select('referral_earnings').eq('id', userId).single();
  if (!own.error && own.data && typeof own.data.referral_earnings === 'number') {
    earnings = own.data.referral_earnings;
  } else if (own.error && isMissingColumnError(own.error)) {
    available = false;
  }

  return { invitees, earnings, available };
}

export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const head = name.slice(0, Math.min(3, name.length));
  return `${head}${'*'.repeat(Math.max(2, name.length - head.length))}@${domain}`;
};
