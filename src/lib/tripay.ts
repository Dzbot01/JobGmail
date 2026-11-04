import { supabase } from '../supabase';
import { sendEmail, emailLayout, escapeHtml } from './emailApi';

/**
 * Top Up via Tripay melalui Cloudflare Worker (API key Tripay hanya ada di worker).
 * Base URL bisa diganti lewat env Vercel: VITE_TRIPAY_API_BASE
 * Endpoint: GET {base}/channels · POST {base}/create · GET {base}/status?reference=
 *
 * Saldo TIDAK pernah ditambah dari browser: setelah dibayar, browser memanggil RPC claim_topup(reference)
 * dan database memverifikasi status transaksi ke Tripay sebelum mengkreditkan saldo.
 */
export const TRIPAY_API_BASE: string =
  (import.meta as any).env?.VITE_TRIPAY_API_BASE || 'https://boosteryuk.boosteryukid.workers.dev/api/tripay';

export const MIN_TOPUP = 10000;
export const MAX_TOPUP = 10000000;
export const QUICK_TOPUP = [10000, 20000, 50000, 100000, 200000, 500000];
/** Saldo minimal untuk mode Pencari Pekerja */
export const MIN_SALDO_PENCARI = 10000;

export interface TripayFee { flat: number; percent: number }
export interface TripayChannel {
  group: string;
  code: string;
  name: string;
  type?: string;
  fee_customer?: TripayFee;
  total_fee?: TripayFee;
  minimum_fee?: number | null;
  maximum_fee?: number | null;
  minimum_amount?: number | null;
  maximum_amount?: number | null;
  icon_url?: string;
  active: boolean;
}

export interface TripayInstruction { title: string; steps: string[] }
export interface TripayTransaction {
  reference: string;
  merchant_ref: string;
  payment_method: string;
  payment_name: string;
  amount: number;
  fee_customer?: number;
  total_fee?: number;
  pay_code?: string | null;
  pay_url?: string | null;
  checkout_url?: string;
  qr_url?: string | null;
  qr_string?: string | null;
  status: string;
  expired_time: number;
  instructions?: TripayInstruction[];
  order_items?: { name: string; price: number; quantity: number }[];
}

export interface TopupRow {
  id: string;
  user_id: string;
  merchant_ref: string;
  reference: string | null;
  method: string;
  method_name: string;
  amount: number;
  status: 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUND';
  pay_data: Partial<TripayTransaction>;
  created_at: string;
  credited_at: string | null;
}

const errText = (e: any) => String(e?.message || e || 'Terjadi kesalahan').replace(/^.*?ERROR:\s*/i, '');

export function topupErrorMessage(e: any): string {
  const code = e?.code || '';
  const msg = errText(e);
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202' || /does not exist|could not find the (table|function)/i.test(msg)) {
    return 'Fitur Top Up belum aktif. Admin perlu menjalankan migrasi database (20261104_topup.sql).';
  }
  return msg;
}

/** Biaya yang ditanggung pembeli untuk nominal tertentu (sesuai aturan fee Tripay). */
export function customerFee(ch: TripayChannel, amount: number): number {
  const f = ch.fee_customer || { flat: 0, percent: 0 };
  let fee = Math.ceil((Number(f.flat) || 0) + (amount * (Number(f.percent) || 0)) / 100);
  if (ch.minimum_fee && fee > 0) fee = Math.max(fee, ch.minimum_fee);
  if (ch.maximum_fee) fee = Math.min(fee, ch.maximum_fee);
  return Math.max(0, fee);
}

export const channelMin = (ch: TripayChannel) => Math.max(MIN_TOPUP, Number(ch.minimum_amount) || 0);
export const channelMax = (ch: TripayChannel) => Math.min(MAX_TOPUP, Number(ch.maximum_amount) || MAX_TOPUP);

async function readJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Respon server tidak valid (HTTP ${res.status})`); }
}

export async function fetchChannels(): Promise<TripayChannel[]> {
  const res = await fetch(`${TRIPAY_API_BASE}/channels`);
  const body = await readJson(res);
  if (!res.ok || body?.success === false) throw new Error(body?.message || `Gagal memuat channel (HTTP ${res.status})`);
  return ((body?.data || []) as TripayChannel[]).filter(c => c.active !== false);
}

export async function fetchTransaction(reference: string): Promise<TripayTransaction> {
  const res = await fetch(`${TRIPAY_API_BASE}/status?reference=${encodeURIComponent(reference)}`);
  const body = await readJson(res);
  if (!res.ok || body?.success === false || !body?.data) throw new Error(body?.message || `Gagal cek status (HTTP ${res.status})`);
  return body.data as TripayTransaction;
}

/**
 * 1) Catat top up (UNPAID) di database → memastikan fitur aktif sebelum user membayar
 * 2) Buat transaksi Tripay lewat worker
 * 3) Simpan reference + data pembayaran
 */
export async function createTopup(params: {
  userId: string;
  email: string;
  name: string;
  channel: TripayChannel;
  amount: number;
}): Promise<TripayTransaction> {
  const { userId, email, name, channel, amount } = params;
  if (!Number.isInteger(amount) || amount < channelMin(channel) || amount > channelMax(channel)) {
    throw new Error(`Nominal harus antara Rp ${channelMin(channel).toLocaleString('id-ID')} - Rp ${channelMax(channel).toLocaleString('id-ID')}`);
  }
  const merchantRef = `JG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const { error: insErr } = await supabase.from('topups').insert({
    user_id: userId,
    merchant_ref: merchantRef,
    method: channel.code,
    method_name: channel.name,
    amount,
    status: 'UNPAID',
  });
  if (insErr) throw new Error(topupErrorMessage(insErr));

  const res = await fetch(`${TRIPAY_API_BASE}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, method: channel.code, merchant_ref: merchantRef, customer_name: name, customer_email: email }),
  });
  const body = await readJson(res);
  if (!res.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message || `Gagal membuat transaksi (HTTP ${res.status})`);
  }
  const tx = body.data as TripayTransaction;

  const payData: Partial<TripayTransaction> = {
    payment_name: tx.payment_name, amount: tx.amount, fee_customer: tx.fee_customer, pay_code: tx.pay_code,
    pay_url: tx.pay_url, checkout_url: tx.checkout_url, qr_url: tx.qr_url, expired_time: tx.expired_time, instructions: tx.instructions,
  };
  const { error: upErr } = await supabase.from('topups').update({ reference: tx.reference, pay_data: payData }).eq('merchant_ref', merchantRef);
  if (upErr) console.error('Gagal menyimpan reference top up:', upErr);
  return tx;
}

export async function listMyTopups(userId: string): Promise<TopupRow[]> {
  const { data, error } = await supabase.from('topups').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
  if (error) throw new Error(topupErrorMessage(error));
  return (data || []) as TopupRow[];
}

/** Minta database memverifikasi ke Tripay lalu mengkreditkan saldo (idempoten). */
export async function claimTopup(reference: string): Promise<{ status: string; credited: boolean; amount?: number; already?: boolean }> {
  const { data, error } = await supabase.rpc('claim_topup', { p_reference: reference });
  if (error) throw new Error(topupErrorMessage(error));
  return data as any;
}

export const formatRp = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

/** Email "Deposit Sukses" (Resend via worker). */
export async function sendDepositSuccessEmail(to: string, info: { amount: number; method: string; reference: string }) {
  if (!to) return;
  const rows = [
    ['Nominal', formatRp(info.amount)],
    ['Metode', info.method || '-'],
    ['Referensi', info.reference],
    ['Waktu', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'],
  ]
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7280;">${escapeHtml(k)}</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:#111827;">${escapeHtml(v)}</td></tr>`)
    .join('');
  const body = `
    <p>Deposit kamu berhasil dan saldo sudah ditambahkan ke akun Job Gmail.</p>
    <p style="margin:20px 0;font-size:28px;font-weight:bold;color:#059669;">+ ${escapeHtml(formatRp(info.amount))}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;border-top:1px solid #e5e7eb;">${rows}</table>
    <p style="margin-top:20px;color:#6b7280;font-size:12px;">Simpan email ini sebagai bukti transaksi. Jika kamu tidak merasa melakukan deposit, segera hubungi admin.</p>`;
  const res = await sendEmail({ to, subject: `Deposit Sukses ${formatRp(info.amount)} - Job Gmail`, html: emailLayout('Deposit Sukses', body) });
  if (!res.ok) console.error('Gagal kirim email deposit:', res.error);
}

/**
 * Klaim saldo top up; jika server BARU SAJA mengkreditkan saldo (credited = true, terjadi sekali per
 * transaksi), kirim email "Deposit Sukses". Klaim ulang tidak mengirim email lagi.
 */
export async function claimTopupAndNotify(reference: string, email: string, info: { amount: number; method: string }) {
  const res = await claimTopup(reference);
  if (res.credited) {
    sendDepositSuccessEmail(email, { amount: res.amount || info.amount, method: info.method, reference }).catch(() => {});
  }
  return res;
}
