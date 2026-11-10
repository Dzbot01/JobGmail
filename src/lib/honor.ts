import { supabase } from '../supabase';

/**
 * Honor Score: aturan yang sama dengan trigger server `pengguna_honor_guard`
 * (supabase/migrations/20261110_honor_score.sql). Server adalah sumber kebenaran;
 * nilai di sini dipakai untuk tampilan & pembatasan di formulir.
 */
export const HONOR_DEFAULT = 100;
export const HONOR_MAX = 100;
export const HONOR_PENALTY_REJECT = 40;
export const HONOR_RECOVER_ACCEPT = 10;
/** >= nilai ini = biru (aman) */
export const HONOR_BLUE_MIN = 70;
/** >= nilai ini = kuning (dibatasi); di bawahnya = merah (blokir otomatis) */
export const HONOR_YELLOW_MIN = 30;

export type HonorTier = 'blue' | 'yellow' | 'red';

export const clampHonor = (n: number) => Math.max(0, Math.min(HONOR_MAX, Math.round(n)));

export function honorTier(score: number): HonorTier {
  if (score >= HONOR_BLUE_MIN) return 'blue';
  if (score >= HONOR_YELLOW_MIN) return 'yellow';
  return 'red';
}

/** Hitung perubahan honor dari perubahan status (meniru trigger server, untuk tampilan optimistis admin). */
export function applyHonorChange(score: number, from: string | undefined, to: string) {
  if (to === 'rejected' && from !== 'rejected') return clampHonor(score - HONOR_PENALTY_REJECT);
  if (to === 'paid' && from !== 'paid') return clampHonor(score + HONOR_RECOVER_ACCEPT);
  return score;
}

export const HONOR_INFO: Record<HonorTier, { label: string; desc: string; text: string; bg: string; bar: string; border: string }> = {
  blue: {
    label: 'Aman',
    desc: 'Semua fitur setoran tersedia.',
    text: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500', border: 'border-blue-200',
  },
  yellow: {
    label: 'Dibatasi',
    desc: 'Hanya 1 kali kirim tugas per hari dan setor bulk tidak tersedia.',
    text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-400', border: 'border-amber-200',
  },
  red: {
    label: 'Diblokir',
    desc: 'Akun otomatis diblokir. Hubungi admin lewat Tiket Bantuan.',
    text: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500', border: 'border-red-200',
  },
};

/** Tanggal (YYYY-MM-DD) zona WIB, untuk aturan "1 kali per hari". */
export const wibDay = (d: string | number | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));

/** Sudah mengirim setoran hari ini (WIB)? */
export function submittedToday(submissions: { timestamp?: string }[], now = Date.now()) {
  const today = wibDay(now);
  return submissions.some(s => {
    if (!s?.timestamp) return false;
    const t = new Date(s.timestamp);
    return !isNaN(t.getTime()) && wibDay(t) === today;
  });
}

/**
 * Ambil honor score user. Query terpisah agar profil tetap termuat walau migrasi belum dijalankan
 * (kolom belum ada → kembali ke nilai default 100).
 */
export async function fetchHonorScore(userId: string): Promise<number> {
  if (!userId) return HONOR_DEFAULT;
  const { data, error } = await supabase.from('pengguna').select('honor_score').eq('id', userId).single();
  if (error || typeof data?.honor_score !== 'number') return HONOR_DEFAULT;
  return clampHonor(data.honor_score);
}
