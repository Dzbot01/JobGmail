/**
 * Jeda wajib antar pengiriman tugas (setoran).
 *
 * - Pengiriman ke-1 hari ini : bebas
 * - Pengiriman ke-2          : 10 menit setelah pengiriman sebelumnya
 * - Pengiriman ke-3          : 30 menit setelah pengiriman sebelumnya
 * - Pengiriman ke-4 dst.     : 7 jam setelah pengiriman sebelumnya
 *
 * Hitungan direset tiap hari kalender (zona waktu perangkat, WIB).
 * Satu "pengiriman" = sekumpulan setoran yang dikirim berdekatan (≤ 2 menit),
 * sehingga setoran bulk 10 akun dihitung 1 kali pengiriman.
 */
export const COOLDOWN_STEPS_MS = [10 * 60 * 1000, 30 * 60 * 1000, 7 * 60 * 60 * 1000];
const SAME_SUBMISSION_GAP_MS = 2 * 60 * 1000;

export interface CooldownState {
  /** jumlah pengiriman hari ini */
  submissionsToday: number;
  /** pengiriman berikutnya adalah ke-n hari ini */
  nextNumber: number;
  /** jeda yang berlaku untuk pengiriman berikutnya (ms), 0 jika bebas */
  requiredGapMs: number;
  /** waktu paling cepat boleh kirim lagi (epoch ms), null jika bebas */
  nextAllowedAt: number | null;
  /** sisa waktu tunggu (ms) */
  waitMs: number;
}

const startOfToday = (now: number) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function getSubmitCooldown(history: Array<{ timestamp?: string }>, now = Date.now()): CooldownState {
  const dayStart = startOfToday(now);
  const times = history
    .map(h => new Date(h.timestamp || '').getTime())
    .filter(t => !isNaN(t) && t >= dayStart && t <= now + 60_000)
    .sort((a, b) => a - b);

  // Kelompokkan setoran berdekatan menjadi satu pengiriman; simpan waktu item terakhir tiap kelompok
  const submissions: number[] = [];
  for (const t of times) {
    const last = submissions[submissions.length - 1];
    if (last !== undefined && t - last <= SAME_SUBMISSION_GAP_MS) submissions[submissions.length - 1] = t;
    else submissions.push(t);
  }

  const n = submissions.length;
  if (n === 0) {
    return { submissionsToday: 0, nextNumber: 1, requiredGapMs: 0, nextAllowedAt: null, waitMs: 0 };
  }
  const requiredGapMs = COOLDOWN_STEPS_MS[Math.min(n - 1, COOLDOWN_STEPS_MS.length - 1)];
  const nextAllowedAt = submissions[n - 1] + requiredGapMs;
  return {
    submissionsToday: n,
    nextNumber: n + 1,
    requiredGapMs,
    nextAllowedAt,
    waitMs: Math.max(0, nextAllowedAt - now),
  };
}

export const formatDuration = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const formatGap = (ms: number) =>
  ms >= 60 * 60 * 1000 ? `${ms / (60 * 60 * 1000)} jam` : `${ms / (60 * 1000)} menit`;
