# Redirect Admin & Jeda Pengiriman Tugas

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. Redirect admin setelah login

**Masalah:** setelah login, route `/` dan `AuthCallback` selalu mengarah ke `/dashboard`
(dashboard user), sehingga admin sempat melihat dashboard user sebelum pindah ke panel admin.

**Solusi (`App.tsx`):** setelah peran diketahui (selama itu layar "Sebentar ya..." tetap tampil),
sebelum `<Routes>` dirender:
- admin di path selain `/admin*` → `<Navigate to="/admin" replace />`
- user di path `/admin*` → `<Navigate to="/dashboard" replace />`
- route `/` mengarah sesuai peran.

Komponen halaman user tidak pernah dirender untuk admin, jadi tidak ada "kedip".

## 2. Jeda pengiriman tugas (`src/lib/submitCooldown.ts`)

| Pengiriman hari ini | Wajib menunggu sejak pengiriman sebelumnya |
|---|---|
| ke-1 | – (bebas) |
| ke-2 | 10 menit |
| ke-3 | 30 menit |
| ke-4 dan seterusnya | 7 jam |

- Dihitung dari kolom `history` user (timestamp setoran).
- Hitungan direset setiap hari kalender (zona waktu perangkat, WIB).
- Setoran yang berjarak ≤ 2 menit dianggap **1 pengiriman** (setoran bulk 10 akun = 1 kali).
- Halaman Setoran menampilkan banner status (hitung mundur per detik) dan tombol kirim
  terkunci selama jeda. Pengecekan dilakukan **sebelum** OTP dikirim, jadi tidak ada email OTP terbuang.

**Keterbatasan:** aturan ditegakkan di frontend. Untuk penegakan penuh, validasi yang sama perlu
dilakukan di server (Supabase RLS/trigger atau worker) saat menyimpan setoran.

## 3. Validasi

- `vite build` sukses; `tsc --noEmit` tidak menambah error (32 error bawaan proyek).
- Unit test logika jeda (8 skenario, TZ Asia/Jakarta) — semua PASS: kosong; ke-2 (sisa 7 mnt / bebas);
  bulk dihitung 1; ke-3 (sisa 25 mnt); ke-4 (sisa 6 jam); ke-5 (~7 jam); kiriman kemarin tidak dihitung.
- Playwright (Supabase di-mock):
  - Admin mulai dari `/`, `/dashboard`, `/auth/callback`, `/setoran` → selalu berakhir di `/admin`,
    teks dashboard user ("Hello, Member!") **tidak pernah** muncul di DOM (MutationObserver).
  - User membuka `/admin/banned` → `/dashboard`.
  - Setoran dengan 1 pengiriman barusan: banner "Jeda pengiriman aktif", hitung mundur 09:59 → 09:57,
    tombol "Tunggu 09:57" nonaktif (375px & 1440px).
