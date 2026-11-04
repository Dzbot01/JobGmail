# Verifikasi OTP pada Form Setoran

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. PRD singkat

**Tujuan:** sebelum setoran (1 akun maupun bulk 10 akun) dikirim, user harus memasukkan kode OTP
6 digit yang dikirim ke **email akun yang sedang login** melalui worker
`https://boosteryuk.boosteryukid.workers.dev/api/email/send` (Resend).

**Alur**
1. User isi form → validasi lama tetap jalan (format `@gmail.com`, password tugas, alamat penarikan).
2. Modal "Verifikasi OTP" terbuka dan otomatis mengirim kode ke email user (ditampilkan tersamar, mis. `de*****@gmail.com`).
3. User mengetik/menempel 6 digit → otomatis diverifikasi.
4. Benar → setoran dikirim (alur lama `onTaskSubmit`). Salah → pesan "Kode salah. Sisa percobaan: n".

**Aturan**
| Parameter | Nilai |
|---|---|
| Panjang kode | 6 digit (`crypto.getRandomValues`) |
| Masa berlaku | 5 menit |
| Kirim ulang | jeda 60 detik |
| Percobaan salah | maks. 5, lalu wajib kirim ulang |
| Penyimpanan | hanya hash SHA-256 + salt di memori (`useRef`), bukan kode asli |

## 2. Keputusan (ADR)

| # | Keputusan | Alasan |
|---|---|---|
| 1 | Memakai `POST /api/email/send` (tanpa token) | Blok `/api/resend/send` ber-`X-Endpoint-Token` tidak boleh dipanggil dari frontend: token di bundle JS bisa dibaca siapa pun. Selain itu, dengan urutan kode worker saat ini, path `/api/resend/send` sudah tertangkap blok pertama (tanpa token). |
| 2 | OTP dibuat & diverifikasi di browser | Worker belum punya endpoint OTP. Ini memastikan user yang jujur benar-benar membuka email-nya, tetapi **bukan kontrol keamanan yang kuat** (lihat §3). |
| 3 | Modul bersama `src/lib/emailApi.ts` | Dipakai Broadcast dan OTP; satu tempat untuk URL (`VITE_EMAIL_API_URL`), alamat `from`, template, dan penanganan error. |
| 4 | Komponen `OtpModal` terpisah | Bisa dipakai ulang untuk aksi lain (mis. withdraw) tanpa menduplikasi logika. |

## 3. Keterbatasan & rekomendasi (server-side OTP)

Karena kode dibuat di browser, user yang paham devtools bisa melewati verifikasi. Untuk OTP yang
benar-benar aman, pindahkan pembuatan & verifikasi ke worker (contoh, memakai KV binding `OTP_KV`):

```ts
// POST /api/otp/send  { email }
if (url.pathname === "/api/otp/send" && request.method === "POST") {
  const { email } = await request.json() as any;
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  await env.OTP_KV.put(`otp:${email}`, JSON.stringify({ code, tries: 0 }), { expirationTtl: 300 });
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Job Gmail <noreply@cekidku.my.id>", to: email,
      subject: `Kode verifikasi Job Gmail: ${code}`, html: `<p>Kode kamu: <b>${code}</b></p>` })
  });
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
}

// POST /api/otp/verify  { email, code }
if (url.pathname === "/api/otp/verify" && request.method === "POST") {
  const { email, code } = await request.json() as any;
  const raw = await env.OTP_KV.get(`otp:${email}`);
  const rec = raw ? JSON.parse(raw) : null;
  const ok = !!rec && rec.tries < 5 && rec.code === String(code);
  if (rec && !ok) await env.OTP_KV.put(`otp:${email}`, JSON.stringify({ ...rec, tries: rec.tries + 1 }), { expirationTtl: 300 });
  if (ok) await env.OTP_KV.delete(`otp:${email}`);
  return new Response(JSON.stringify({ ok }), { status: ok ? 200 : 400, headers: { ...cors, "Content-Type": "application/json" } });
}
```

Agar setoran tidak bisa dikirim tanpa OTP sama sekali, penyimpanan setoran juga perlu lewat server
(worker / Supabase Edge Function) yang mengecek hasil verifikasi — saat ini setoran ditulis langsung
dari browser ke tabel `pengguna`.

Catatan lama tetap berlaku: endpoint `/api/email/send` tidak berautentikasi (lihat
`BROADCAST_AND_LOGIN_ANIMATION.md` §3).

## 4. Validasi

- `vite build` sukses; `tsc --noEmit` tidak menambah error (32 error bawaan proyek).
- Playwright (Supabase & endpoint email di-mock), mobile 375px dan desktop 1440px:
  - Klik "Kirim Setoran" → 1 email OTP ke email akun login, subjek berisi kode, `from` Job Gmail.
  - Kode salah → "Kode salah. Sisa percobaan: 4", modal tetap terbuka, setoran tidak terkirim.
  - Kode benar → modal tertutup, setoran terkirim, pindah ke `/history`.
  - Endpoint gagal (500) → "Gagal mengirim kode: …", input dikunci, bisa kirim ulang.
  - Setoran bulk 10 akun → OTP dengan tujuan "setoran 10 akun sekaligus".
  - Tanpa error JS; 6 kotak digit muat di layar 375px.
- Belum diuji ke worker asli (jaringan sandbox tidak menjangkau `workers.dev`).
