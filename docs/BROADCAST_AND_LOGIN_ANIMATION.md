# Broadcast Email (Admin) & Animasi Login LightTunnel

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. PRD singkat

### A. Panel login dengan animasi
- Panel kiri halaman login (desktop) diganti: latar gelap + animasi **LightTunnel** (React Bits),
  teks ditaruh di **kartu transparan** (glassmorphism: `bg-white/5`, `backdrop-blur`, border tipis).
- Mobile tidak berubah (panel brand memang disembunyikan di layar kecil).

### B. Halaman Broadcast (khusus admin)
- Route baru `/admin/broadcast`, menu "Broadcast" di sidebar desktop dan bottom nav admin.
- Kirim email ke user terdaftar melalui endpoint worker Resend (`POST { to, subject, html, from }`).
- Filter penerima:
  - **Semua User** — semua `pengguna` dengan `peran != 'admin'`.
  - **Tugas Status Proses** — user yang punya minimal 1 item `history` berstatus `process`.
- Pencarian email/nama, pilih/batal per user, "Pilih semua".
- Personalisasi `{nama}` dan `{email}`, preview email (iframe sandbox), konfirmasi sebelum kirim.
- Kirim satu per satu (privasi: alamat penerima tidak saling terlihat), jeda 600 ms untuk rate limit Resend,
  progress bar, status per email, tombol **Hentikan**.

**Non-goal:** penjadwalan broadcast, riwayat broadcast di database, lampiran.

## 2. Keputusan (ADR)

| # | Keputusan | Alasan |
|---|---|---|
| 1 | LightTunnel disalin manual ke `src/components/LightTunnel.jsx` (+ `.css`, `.d.ts`) | Proyek tidak memakai shadcn (`components.json` tidak ada); `shadcn init` akan menambah konfigurasi yang tidak diperlukan. Isinya sama dengan output CLI. |
| 2 | Shader memakai `ss()` pengganti `smoothstep()` | `smoothstep(e0, e1, x)` dengan `e0 > e1` **tidak terdefinisi** di GLSL; di SwiftShader (renderer software Chrome saat GPU tidak tersedia) hasilnya 0. Rumus eksplisit identik dengan perilaku GPU umum. |
| 3 | Tidak memanggil `loseContext()` saat unmount | React StrictMode (dev) memasang ulang komponen pada canvas yang sama; context yang sudah di-lose membuat panel putih. Browser tetap membersihkan context sendiri. |
| 4 | LightTunnel hanya dipasang di desktop (`matchMedia('(min-width: 1024px)')`) | Panel tersembunyi di mobile; menghindari context WebGL yang tidak terlihat dan hemat baterai. |
| 5 | URL endpoint via `VITE_EMAIL_API_URL`, default `https://boosteryuk.boosteryukid.workers.dev/api/email/send` (modul bersama `src/lib/emailApi.ts`) | Bisa diganti dari env Vercel tanpa ubah kode. |
| 6 | Isi pesan di-escape sebelum dimasukkan ke template HTML | Mencegah HTML/script tak sengaja dari input admin masuk ke email. |
| 7 | Route `/admin/broadcast` di-guard `userRole === 'admin'` | User biasa diarahkan ke `/dashboard`. |

## 3. Catatan keamanan (perlu ditindaklanjuti di worker)

Endpoint `/api/email/send` di worker **tidak memakai autentikasi** dan menerima `from`/`to` bebas.
Siapa pun yang tahu URL-nya bisa mengirim email atas nama domain `cekidku.my.id` (open relay).
Rekomendasi: verifikasi JWT Supabase admin (header `Authorization`) di worker, atau minimal
shared secret + batasi `Origin` dan daftar alamat `from` yang diizinkan.

## 4. Validasi

- `vite build` sukses; `tsc --noEmit` tidak menambah error (32 error bawaan proyek).
- Playwright (Chromium, Supabase di-mock, endpoint email di-mock):
  - Filter "Tugas Status Proses" memilih tepat user dengan tugas `process` (3 dari 8 data uji).
  - 3 request terkirim satu per satu; satu respons 422 tampil sebagai "gagal" dengan pesan error.
  - `{nama}` terganti; `<b>` dari input admin ter-escape menjadi teks.
  - Halaman Broadcast tanpa overflow horizontal di 375 / 820 / 1440 px, tanpa error JS.
- LightTunnel: canvas 512×560 merender di desktop (dev & build produksi); tidak dipasang di mobile.
- Belum diuji ke endpoint asli (jaringan sandbox dibatasi) — uji kirim ke 1 email sendiri sebelum broadcast massal.
