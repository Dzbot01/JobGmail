import { supabase } from '../supabase';

/** Jenis kolom kiriman tugas yang bisa dibuat pemilik pekerjaan. Gambar dikirim sebagai URL (tidak ada upload). */
export type FieldType = 'text' | 'password' | 'url' | 'image_url';

export const FIELD_TYPES: { value: FieldType; label: string; hint: string }[] = [
  { value: 'text', label: 'Teks', hint: 'Teks bebas' },
  { value: 'password', label: 'Password', hint: 'Teks tersamar' },
  { value: 'url', label: 'URL', hint: 'Wajib diawali https://' },
  { value: 'image_url', label: 'URL Gambar / Screenshot', hint: 'Link gambar https://' },
];

export interface JobField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
}

export interface Job {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  short_desc: string;
  detail: string;
  instructions: string;
  reward: number;
  est_process: string;
  max_workers: number;
  taken_slots: number;
  fields: JobField[];
  status: 'open' | 'closed';
  created_at: string;
}

export interface JobSubmission {
  id: string;
  job_id: string;
  worker_id: string;
  worker_email: string;
  answers: Record<string, string>;
  status: 'process' | 'paid' | 'rejected';
  reason?: string | null;
  created_at: string;
}

export const EST_OPTIONS = ['< 1 jam', '1-6 jam', '1-24 jam', '1-3 hari', '3-7 hari'];
export const SHORT_DESC_MAX = 50;

/** Pesan ramah untuk error Supabase, termasuk saat migrasi belum dijalankan. */
export function jobsErrorMessage(err: any): string {
  if (!err) return 'Terjadi kesalahan';
  const code = err.code || '';
  const msg: string = err.message || String(err);
  if (code === '42P01' || code === 'PGRST205' || /relation .* does not exist|could not find the table/i.test(msg)) {
    return 'Fitur Cari Pekerjaan belum aktif. Admin perlu menjalankan migrasi database (20261104_jobs.sql).';
  }
  if (code === '23505') return 'Kamu sudah pernah mengirim tugas untuk pekerjaan ini.';
  return msg.replace(/^.*?ERROR:\s*/i, '');
}

export const slotsLeft = (j: Pick<Job, 'max_workers' | 'taken_slots'>) => Math.max(0, j.max_workers - j.taken_slots);

/** Warna bar slot: hijau = masih banyak, kuning = tinggal sedikit, merah = hampir/sudah habis. */
export function slotTone(j: Pick<Job, 'max_workers' | 'taken_slots'>) {
  const ratio = j.max_workers > 0 ? slotsLeft(j) / j.max_workers : 0;
  if (ratio > 0.5) return { bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'Slot masih banyak', ratio };
  if (ratio > 0.2) return { bar: 'bg-yellow-400', text: 'text-yellow-600', label: 'Slot tinggal sedikit', ratio };
  return { bar: 'bg-red-500', text: 'text-red-600', label: ratio === 0 ? 'Slot penuh' : 'Slot hampir habis', ratio };
}

export const formatRupiah = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

/** Pencarian relevan: semua kata kunci harus cocok; judul diberi bobot lebih tinggi. */
export function searchJobs(jobs: Job[], query: string): Job[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return jobs;
  return jobs
    .map(j => {
      const title = j.title.toLowerCase();
      const short = j.short_desc.toLowerCase();
      const rest = `${j.detail} ${j.instructions} ${j.owner_name}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (title.includes(t)) score += 5;
        else if (short.includes(t)) score += 3;
        else if (rest.includes(t)) score += 1;
        else return { j, score: -1 };
      }
      return { j, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.j);
}

export const isHttpsUrl = (v: string) => {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' && !!u.hostname;
  } catch {
    return false;
  }
};

/** Validasi jawaban pekerja sesuai definisi kolom. Mengembalikan pesan error per key. */
export function validateAnswers(fields: JobField[], answers: Record<string, string>) {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = (answers[f.key] || '').trim();
    if (!v) {
      if (f.required) errors[f.key] = `${f.label} wajib diisi`;
      continue;
    }
    if ((f.type === 'url' || f.type === 'image_url') && !isHttpsUrl(v)) {
      errors[f.key] = `${f.label} harus berupa URL yang diawali https://`;
    }
    if (v.length > 2000) errors[f.key] = `${f.label} terlalu panjang`;
  }
  return errors;
}

/** Buat key unik dari label kolom. */
export function makeFieldKey(label: string, taken: Set<string>) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'kolom';
  let key = base;
  let i = 2;
  while (taken.has(key)) key = `${base}_${i++}`;
  taken.add(key);
  return key;
}

// ===== Akses data =====

export async function listOpenJobs() {
  const { data, error } = await supabase.from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Job[];
}

export async function getJob(id: string) {
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Job;
}

export async function listMyJobs(ownerId: string) {
  const { data, error } = await supabase.from('jobs').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Job[];
}

export interface NewJobInput {
  title: string;
  short_desc: string;
  detail: string;
  instructions: string;
  reward: number;
  est_process: string;
  max_workers: number;
  fields: JobField[];
}

export async function createJob(ownerId: string, ownerName: string, input: NewJobInput) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...input, owner_id: ownerId, owner_name: ownerName, status: 'open', taken_slots: 0 })
    .select('*')
    .single();
  if (error) throw error;
  return data as Job;
}

export async function setJobStatus(id: string, status: 'open' | 'closed') {
  const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function getMySubmission(jobId: string, workerId: string) {
  const { data, error } = await supabase
    .from('job_submissions').select('*').eq('job_id', jobId).eq('worker_id', workerId).maybeSingle();
  if (error) throw error;
  return (data || null) as JobSubmission | null;
}

export async function submitJob(jobId: string, workerId: string, workerEmail: string, answers: Record<string, string>) {
  const { data, error } = await supabase
    .from('job_submissions')
    .insert({ job_id: jobId, worker_id: workerId, worker_email: workerEmail, answers })
    .select('*')
    .single();
  if (error) throw error;
  return data as JobSubmission;
}

export async function listSubmissions(jobId: string) {
  const { data, error } = await supabase
    .from('job_submissions').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as JobSubmission[];
}

export async function reviewSubmission(id: string, approve: boolean, reason?: string) {
  const { error } = await supabase.rpc('review_job_submission', { p_submission_id: id, p_approve: approve, p_reason: reason || null });
  if (error) throw error;
}

// ===== Riwayat pekerjaan & saldo pending milik pekerja =====

/** Batas data yang ditampilkan di setiap daftar riwayat. */
export const HISTORY_LIMIT = 10;

export interface MySubmission extends JobSubmission {
  jobs?: { title: string; reward: number; owner_name: string } | null;
}

/** Riwayat kiriman milik pekerja (terbaru dulu), digabung dengan judul & bayaran pekerjaan. */
export async function listMySubmissions(workerId: string, status?: JobSubmission['status'], limit = HISTORY_LIMIT) {
  let q = supabase
    .from('job_submissions')
    .select('id, job_id, worker_id, worker_email, answers, status, reason, created_at, jobs(title, reward, owner_name)')
    .eq('worker_id', workerId);
  if (status) q = q.eq('status', status);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []) as unknown as MySubmission[];
}

/** Jumlah per status (untuk label filter). */
export async function countMySubmissions(workerId: string) {
  const { data, error } = await supabase.from('job_submissions').select('status').eq('worker_id', workerId);
  if (error) throw error;
  const counts = { process: 0, paid: 0, rejected: 0, total: 0 };
  (data || []).forEach((r: any) => { counts.total++; if (r.status in counts) (counts as any)[r.status]++; });
  return counts;
}

/**
 * Saldo pending = total bayaran dari kiriman yang masih "process".
 * Diterima → pindah ke saldo utama (RPC review_job_submission); ditolak → hilang dari pending.
 */
export async function fetchPendingEarnings(workerId: string) {
  const { data, error } = await supabase
    .from('job_submissions')
    .select('id, jobs(reward)')
    .eq('worker_id', workerId)
    .eq('status', 'process');
  if (error) throw error;
  const rows = (data || []) as any[];
  return { amount: rows.reduce((sum, r) => sum + (Number(r.jobs?.reward) || 0), 0), count: rows.length };
}
