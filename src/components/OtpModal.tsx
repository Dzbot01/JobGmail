import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, X, Loader2, Mail, RefreshCw } from 'lucide-react';
import { sendEmail, emailLayout, escapeHtml } from '../lib/emailApi';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;   // kode berlaku 5 menit
const RESEND_COOLDOWN_S = 60;       // jeda kirim ulang
const MAX_ATTEMPTS = 5;             // salah maksimal 5x, setelah itu wajib kirim ulang

interface OtpModalProps {
  open: boolean;
  email: string;
  /** Teks singkat aksi yang diverifikasi, mis. "setoran 1 akun" */
  purpose: string;
  onVerified: () => void;
  onClose: () => void;
}

const randomCode = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 10 ** OTP_LENGTH).padStart(OTP_LENGTH, '0');
};

const sha256 = async (text: string) => {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'*'.repeat(Math.max(1, name.length - visible.length))}@${domain}`;
};

const OtpModal: React.FC<OtpModalProps> = ({ open, email, purpose, onVerified, onClose }) => {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState<'sending' | 'sent' | 'error' | 'verifying'>('sending');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  // Hanya hash + salt + waktu kedaluwarsa yang disimpan, bukan kodenya.
  const secretRef = useRef<{ hash: string; salt: string; expiresAt: number } | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const sendCode = useCallback(async () => {
    setStatus('sending');
    setError('');
    setDigits(Array(OTP_LENGTH).fill(''));
    setAttemptsLeft(MAX_ATTEMPTS);
    const code = randomCode();
    const salt = randomCode() + Date.now();
    secretRef.current = { hash: await sha256(salt + code), salt, expiresAt: Date.now() + OTP_TTL_MS };

    const body = `
      <p>Gunakan kode berikut untuk mengonfirmasi <b>${escapeHtml(purpose)}</b>:</p>
      <p style="margin:24px 0;font-size:32px;font-weight:bold;letter-spacing:10px;color:#1d4ed8;">${code}</p>
      <p>Kode berlaku 5 menit. Jangan bagikan kode ini kepada siapa pun, termasuk admin.</p>
      <p style="color:#9ca3af;font-size:12px;">Jika kamu tidak merasa melakukan setoran, abaikan email ini.</p>`;
    const res = await sendEmail({ to: email, subject: `Kode verifikasi Job Gmail: ${code}`, html: emailLayout('Kode Verifikasi Setoran', body) });

    if (res.ok) {
      setStatus('sent');
      setCooldown(RESEND_COOLDOWN_S);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } else {
      secretRef.current = null;
      setStatus('error');
      setError('Gagal mengirim kode: ' + res.error);
      setCooldown(0);
    }
  }, [email, purpose]);

  // Kirim kode setiap kali modal dibuka
  useEffect(() => {
    if (open) sendCode();
    else secretRef.current = null;
  }, [open, sendCode]);

  useEffect(() => {
    if (!open || cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [open, cooldown]);

  const verify = async (code: string) => {
    const secret = secretRef.current;
    if (!secret) return;
    if (Date.now() > secret.expiresAt) {
      setError('Kode sudah kedaluwarsa. Silakan kirim ulang kode.');
      secretRef.current = null;
      return;
    }
    setStatus('verifying');
    const ok = (await sha256(secret.salt + code)) === secret.hash;
    if (ok) {
      secretRef.current = null;
      onVerified();
      return;
    }
    const left = attemptsLeft - 1;
    setAttemptsLeft(left);
    setStatus('sent');
    setDigits(Array(OTP_LENGTH).fill(''));
    inputsRef.current[0]?.focus();
    if (left <= 0) {
      secretRef.current = null;
      setError('Terlalu banyak percobaan salah. Silakan kirim ulang kode.');
    } else {
      setError(`Kode salah. Sisa percobaan: ${left}`);
    }
  };

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      // Tempel kode lengkap
      const next = clean.slice(0, OTP_LENGTH).split('');
      while (next.length < OTP_LENGTH) next.push('');
      setDigits(next);
      const last = Math.min(clean.length, OTP_LENGTH) - 1;
      inputsRef.current[last]?.focus();
      if (clean.length >= OTP_LENGTH) verify(clean.slice(0, OTP_LENGTH));
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setError('');
    if (clean && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
    if (next.every(d => d !== '')) verify(next.join(''));
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  if (!open) return null;

  const canInput = status === 'sent' && !!secretRef.current;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="otp-title">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-blue-600 p-5 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} />
            <h3 id="otp-title" className="font-black text-sm uppercase tracking-widest">Verifikasi OTP</h3>
          </div>
          <button onClick={onClose} disabled={status === 'verifying'} className="p-2 hover:bg-white/10 rounded-full" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <Mail size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              {status === 'sending'
                ? 'Mengirim kode verifikasi ke email kamu...'
                : <>Kode 6 digit telah dikirim ke <b>{maskEmail(email)}</b> untuk mengonfirmasi {purpose}. Cek juga folder Spam.</>}
            </p>
          </div>

          <div className="flex justify-center gap-2" onPaste={e => { const t = e.clipboardData.getData('text'); if (t) { e.preventDefault(); setDigit(0, t); } }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputsRef.current[i] = el; }}
                value={d}
                onChange={e => setDigit(i, e.target.value)}
                onKeyDown={e => onKeyDown(i, e)}
                disabled={!canInput}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={OTP_LENGTH}
                aria-label={`Digit ${i + 1}`}
                className="flex-1 min-w-0 max-w-[3.25rem] h-14 text-center text-2xl font-black rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white outline-none disabled:opacity-50"
              />
            ))}
          </div>

          {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}
          {status === 'verifying' && (
            <p className="text-xs font-bold text-blue-600 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Memverifikasi...</p>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Kode berlaku 5 menit</span>
            <button
              onClick={sendCode}
              disabled={status === 'sending' || status === 'verifying' || cooldown > 0}
              className="font-bold text-blue-600 flex items-center gap-1 disabled:text-gray-300"
            >
              {status === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim ulang kode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpModal;
