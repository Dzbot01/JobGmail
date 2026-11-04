/**
 * Klien endpoint email di Cloudflare Worker (diteruskan ke Resend).
 * URL bisa diganti lewat env Vercel: VITE_EMAIL_API_URL
 *
 * Catatan: endpoint /api/resend/send yang memakai X-Endpoint-Token sengaja TIDAK
 * dipakai dari frontend, karena token apa pun di bundle JS bisa dibaca siapa saja.
 */
export const EMAIL_API_URL: string =
  (import.meta as any).env?.VITE_EMAIL_API_URL ||
  'https://boosteryuk.boosteryukid.workers.dev/api/email/send';

export const EMAIL_FROM = 'Job Gmail <noreply@cekidku.my.id>';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  try {
    const res = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, from: EMAIL_FROM }),
    });
    if (res.ok) return { ok: true };
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      const err = body?.error;
      detail = (typeof err === 'object' ? err?.message : err) || body?.message || detail;
    } catch { /* body bukan JSON */ }
    return { ok: false, error: String(detail) };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Template email sederhana bermerek Job Gmail. `bodyHtml` harus sudah aman (escaped). */
export const emailLayout = (title: string, bodyHtml: string, footer = 'Email ini dikirim ke pengguna terdaftar Job Gmail.') => `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr><td style="background:#1d4ed8;padding:20px 28px;color:#ffffff;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Job Gmail</td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${escapeHtml(title)}</h1>
      <div style="font-size:14px;line-height:1.6;color:#374151;">${bodyHtml}</div>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f9fafb;font-size:11px;color:#9ca3af;">${escapeHtml(footer)}</td></tr>
  </table>
</body></html>`;
