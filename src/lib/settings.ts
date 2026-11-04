import { supabase } from '../supabase';

/**
 * Pengaturan sistem global (tabel `app_settings`, satu baris id = 1).
 * Admin menyimpan; semua user membaca + menerima perubahan realtime.
 * Migrasi: supabase/migrations/20261104_settings_and_ban.sql
 */
export type WithdrawSchedule = 'Selalu Buka' | 'Senin - Jumat' | 'Sabtu - Minggu' | 'Kunci';

export interface SystemSettings {
  withdrawSchedule: WithdrawSchedule;
  taskReward: number;
  taskPassword: string;
  taskDescription: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  withdrawSchedule: 'Selalu Buka',
  taskReward: 1600,
  taskPassword: 'Ajax1122*',
  taskDescription: 'Silahkan masukkan data akun Gmail yang baru kamu buat. Pastikan akun dalam keadaan aktif dan belum pernah didaftarkan sebelumnya.',
};

const fromRow = (r: any): SystemSettings => ({
  withdrawSchedule: (r?.withdraw_schedule as WithdrawSchedule) || DEFAULT_SETTINGS.withdrawSchedule,
  taskReward: typeof r?.task_reward === 'number' ? r.task_reward : DEFAULT_SETTINGS.taskReward,
  taskPassword: r?.task_password ?? DEFAULT_SETTINGS.taskPassword,
  taskDescription: r?.task_description ?? DEFAULT_SETTINGS.taskDescription,
});

/** null jika tabel belum dimigrasi / gagal dibaca (pakai default). */
export async function loadSettings(): Promise<SystemSettings | null> {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return null;
  return fromRow(data);
}

export async function saveSettings(s: SystemSettings, adminId?: string) {
  const { error } = await supabase
    .from('app_settings')
    .update({
      withdraw_schedule: s.withdrawSchedule,
      task_reward: s.taskReward,
      task_password: s.taskPassword,
      task_description: s.taskDescription,
      updated_at: new Date().toISOString(),
      updated_by: adminId || null,
    })
    .eq('id', 1);
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message)) {
      throw new Error('Tabel pengaturan belum ada. Jalankan migrasi 20261104_settings_and_ban.sql di Supabase.');
    }
    throw error;
  }
}

/** Dengarkan perubahan pengaturan secara realtime. Mengembalikan fungsi untuk berhenti. */
export function subscribeSettings(onChange: (s: SystemSettings) => void): () => void {
  try {
    const channel = (supabase as any)
      .channel('app_settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, (payload: any) => onChange(fromRow(payload.new)))
      .subscribe();
    return () => { try { (supabase as any).removeChannel(channel); } catch { /* abaikan */ } };
  } catch {
    return () => {};
  }
}

// ===== Jadwal withdraw (selalu dihitung dalam WIB, apa pun zona waktu perangkat) =====

const WIB_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function wibWeekday(now = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' }).format(now);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

export function isWithdrawOpen(schedule: WithdrawSchedule, now = new Date()): boolean {
  const d = wibWeekday(now);
  switch (schedule) {
    case 'Selalu Buka': return true;
    case 'Senin - Jumat': return d >= 1 && d <= 5;
    case 'Sabtu - Minggu': return d === 0 || d === 6;
    case 'Kunci':
    default: return false;
  }
}

/** Kalimat jadwal untuk ditampilkan ke user. */
export function withdrawScheduleText(schedule: WithdrawSchedule): string {
  switch (schedule) {
    case 'Selalu Buka': return 'Withdraw tersedia setiap hari.';
    case 'Senin - Jumat': return 'Withdraw hanya tersedia pada hari Senin sampai Jumat.';
    case 'Sabtu - Minggu': return 'Withdraw hanya tersedia pada hari Sabtu dan Minggu.';
    case 'Kunci':
    default: return 'Withdraw sedang ditutup sementara oleh Admin.';
  }
}

export const wibDayName = (now = new Date()) => WIB_DAYS[wibWeekday(now)];
