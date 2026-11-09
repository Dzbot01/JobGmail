/** Format tanggal Indonesia dengan zona waktu WIB (Asia/Jakarta), apa pun zona perangkat. */
const WIB = 'Asia/Jakarta';

const toDate = (value: string | number | Date | null | undefined) => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/** "9 Nov 2026, 10.05 WIB". Nilai lama yang bukan tanggal valid dikembalikan apa adanya. */
export function formatWIB(value: string | number | Date | null | undefined, opts: { seconds?: boolean } = {}) {
  const d = toDate(value);
  if (!d) return value ? String(value) : '-';
  const s = new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(opts.seconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(d);
  return `${s} WIB`;
}

/** "Senin, 9 November 2026" (WIB). */
export function formatDateLongWIB(value: string | number | Date | null | undefined) {
  const d = toDate(value);
  if (!d) return value ? String(value) : '-';
  return new Intl.DateTimeFormat('id-ID', { timeZone: WIB, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** "10.05" (WIB) — untuk gelembung chat. */
export function formatTimeWIB(value: string | number | Date | null | undefined) {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat('id-ID', { timeZone: WIB, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/** "baru saja", "5 menit yang lalu", "2 jam yang lalu", lalu tanggal WIB untuk > 7 hari. */
export function timeAgo(value: string | number | Date | null | undefined, now = Date.now()) {
  const d = toDate(value);
  if (!d) return '-';
  const sec = Math.round((now - d.getTime()) / 1000);
  if (sec < 45) return 'baru saja';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} menit yang lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam yang lalu`;
  const day = Math.round(hr / 24);
  if (day <= 7) return `${day} hari yang lalu`;
  return formatWIB(d);
}

export const toTime = (value: any) => toDate(value)?.getTime() ?? 0;
