import { supabase } from '../supabase';

/** Tiket bantuan. Semua penulisan lewat RPC (lihat supabase/migrations/20261109_tickets_activity.sql). */
export type TicketStatus = 'pending' | 'dibalas';

export interface Ticket {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: TicketStatus;
  first_message: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  body: string;
  image_url: string | null;
  created_at: string;
}

export const MAX_WORDS = 200;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const TICKET_BUCKET = 'ticket-images';

export const STATUS_LABEL: Record<TicketStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  dibalas: { label: 'Dibalas', cls: 'bg-emerald-100 text-emerald-700' },
};

// ===== Validasi pesan =====

/** Daftar kata kasar (dicek setelah normalisasi angka/simbol → huruf). Sama dengan fungsi SQL ticket_validate_body. */
export const TOXIC_WORDS = [
  'anjing', 'anjg', 'anjir', 'bangsat', 'bajingan', 'babi', 'kontol', 'kntl', 'memek', 'mmk', 'ngentot', 'ngentod', 'entot',
  'goblok', 'goblog', 'tolol', 'bego', 'kampret', 'jancok', 'jancuk', 'cok', 'asu', 'brengsek', 'keparat', 'tai', 'taik',
  'sialan', 'bodoh', 'idiot', 'pepek', 'lonte', 'pelacur', 'perek', 'setan', 'monyet',
  'fuck', 'fck', 'shit', 'bitch', 'bastard', 'asshole', 'dick',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's' };

const normalize = (text: string) =>
  text.toLowerCase().replace(/[0134578@$]/g, ch => LEET[ch] || ch);

/** Kata kasar yang ditemukan (dibandingkan per kata utuh, jadi "pantai" tidak dianggap "tai"). */
export function findToxicWords(text: string): string[] {
  const words = normalize(text).split(/[^a-z]+/).filter(Boolean);
  // huruf berulang "anjiiing" → "anjing"
  const squeeze = (w: string) => w.replace(/(.)\1+/g, '$1');
  const found = new Set<string>();
  for (const w of words) {
    if (TOXIC_WORDS.includes(w)) found.add(w);
    else if (TOXIC_WORDS.includes(squeeze(w))) found.add(squeeze(w));
  }
  return [...found];
}

export const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** Pesan error untuk ditampilkan, atau '' bila valid. */
export function validateTicketMessage(text: string, hasImage = false): string {
  const t = text.trim();
  if (!t && !hasImage) return 'Pesan wajib diisi';
  if (countWords(t) > MAX_WORDS) return `Pesan maksimal ${MAX_WORDS} kata`;
  if (t.length > 2000) return 'Pesan terlalu panjang';
  const toxic = findToxicWords(t);
  if (toxic.length) return 'Pesan mengandung kata yang tidak pantas. Mohon gunakan bahasa yang sopan.';
  return '';
}

export function ticketsErrorMessage(err: any): string {
  if (!err) return 'Terjadi kesalahan';
  const code = err.code || '';
  const msg: string = err.message || String(err);
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202' || /does not exist|could not find/i.test(msg)) {
    return 'Fitur Tiket Bantuan belum aktif. Admin perlu menjalankan migrasi database (20261109_tickets_activity.sql).';
  }
  if (code === '23505') return 'Kamu masih punya tiket berstatus pending. Tunggu balasan admin dulu.';
  return msg.replace(/^.*?ERROR:\s*/i, '');
}

/** Baris pertama pesan (untuk kartu daftar tiket). */
export const firstLine = (text: string) => (text || '').split(/\r?\n/).find(l => l.trim())?.trim() || '(gambar)';

// ===== Gambar =====

/** Perkecil gambar (maks 1280px, JPEG) agar hemat kuota storage & cepat dimuat. */
export async function compressImage(file: File, maxSide = 1280, quality = 0.82): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Format gambar harus JPG, PNG, atau WEBP');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gambar tidak bisa dibaca'));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', quality));
    return blob && blob.size < file.size ? blob : file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload gambar ke bucket ticket-images/<userId>/... dan kembalikan URL publiknya. */
export async function uploadTicketImage(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('Ukuran gambar maksimal 2 MB');
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(TICKET_BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
  if (error) throw new Error(/bucket not found/i.test(error.message) ? 'Penyimpanan gambar belum aktif (jalankan migrasi 20261109_tickets_activity.sql).' : error.message);
  return supabase.storage.from(TICKET_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ===== Akses data =====

export async function listMyTickets(userId: string) {
  const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Ticket[];
}

export async function listAllTickets() {
  const { data, error } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []) as Ticket[];
}

export async function getTicket(id: string) {
  const { data, error } = await supabase.from('support_tickets').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Ticket;
}

export async function listMessages(ticketId: string) {
  const { data, error } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as TicketMessage[];
}

export async function createTicket(body: string, imageUrl: string | null) {
  const { data, error } = await supabase.rpc('create_support_ticket', { p_body: body.trim(), p_image_url: imageUrl });
  if (error) throw error;
  return data as Ticket;
}

export async function sendTicketMessage(ticketId: string, body: string, imageUrl: string | null) {
  const { data, error } = await supabase.rpc('send_ticket_message', { p_ticket_id: ticketId, p_body: body.trim(), p_image_url: imageUrl });
  if (error) throw error;
  return data as TicketMessage;
}

/** Dengarkan pesan & perubahan status tiket secara realtime. Mengembalikan fungsi berhenti. */
export function subscribeTicket(ticketId: string, onChange: () => void) {
  const ch = supabase
    .channel(`ticket-${ticketId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticketId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
