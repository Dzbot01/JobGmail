# Sinkron Pengaturan, Ban + Hapus Data, Filter Admin, Validasi Email

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. Pengaturan sistem tersinkron (jadwal withdraw, setting tugas)

**Akar masalah:** `systemSettings` sebelumnya hanya `useState` di browser admin — tidak pernah disimpan,
dan halaman Withdraw user meng-hardcode "Sabtu & Minggu". Akibatnya setting admin tidak pernah sampai ke user.

**Solusi**
- Tabel baru `app_settings` (satu baris, `id = 1`): `withdraw_schedule`, `task_reward`, `task_password`, `task_description`.
  RLS: semua user login boleh membaca, hanya admin (`is_admin()`) boleh mengubah. Tabel didaftarkan ke Supabase Realtime.
- App memuat pengaturan setelah login, berlangganan perubahan realtime, dan memuat ulang saat tab kembali aktif.
- Tombol **Simpan Perubahan** di admin (Sistem Withdraw & Sistem Tugas) benar-benar menyimpan ke database.
- Halaman Withdraw user, S&K, dan Kotak Pesan dashboard mengikuti jadwal; hari dihitung dalam **WIB** apa pun zona waktu perangkat.

| Jadwal admin | Withdraw user |
|---|---|
| Selalu Buka | buka setiap hari |
| Senin - Jumat | buka Senin–Jumat |
| Sabtu - Minggu | buka Sabtu & Minggu |
| Kunci | ditutup (halaman withdraw dialihkan ke dashboard) |

## 2. Ban = hapus seluruh data user

- Fungsi server `admin_ban_users(p_ids uuid[])` (`SECURITY DEFINER`, hanya admin, atomik): set `is_banned = true`,
  `saldo = 0`, kosongkan `history`, `withdraw_history`, `payment`, spin, `referral_earnings`, serta menghapus
  `jobs` yang dibuat dan `job_submissions` user tersebut (bila tabelnya ada). Akun admin tidak bisa di-ban.
- Halaman Banned User memanggil RPC tsb; sebelum migrasi dijalankan memakai cadangan (update langsung kolom inti di `pengguna`).
- Konfirmasi menjelaskan bahwa penghapusan **permanen**; **Unban tidak mengembalikan data**.

## 3. Admin: Setor & Pay hanya status *process*

Halaman Setor dan Pay hanya menampilkan item berstatus `process` (dengan jumlah "menunggu proses").
Item yang sudah `paid`/`rejected` hilang dari UI admin, tetapi tetap tersimpan sebagai riwayat di akun user.

## 4. Validasi email setoran (`src/lib/gmailValidation.ts`)

Wajib `@gmail.com`; bagian sebelum `@` hanya huruf kecil, angka, dan titik; **tanpa huruf besar**; **maks 3 angka**;
tanpa spasi/karakter lain; titik tidak di awal/akhir/berurutan; 6–30 karakter.
Pesan error tampil langsung di bawah input; bulk menandai baris yang salah. Input dibuat `autoCapitalize="none"`
agar keyboard HP tidak otomatis membuat huruf kapital.

## Migrasi — WAJIB dijalankan sekali

`supabase/migrations/20261104_settings_and_ban.sql` (Supabase → SQL Editor → paste → Run).

## Validasi

- `vite build` sukses; `tsc --noEmit` tidak menambah error (32 error bawaan proyek).
- Unit test (TZ perangkat America/Los_Angeles untuk membuktikan perhitungan WIB): 16 kasus email + 7 kasus jadwal — semua PASS.
- Playwright (Supabase di-mock):
  - Admin Setor: 36 kartu, semua `process`; Pay: 2 request `process`, tanpa "Sudah Terbayar".
  - Admin simpan "Senin - Jumat" → `update app_settings ... where id = 1`.
  - Ban → `rpc admin_ban_users({ p_ids: [...] })`; tanpa migrasi → fallback mengosongkan saldo/history/withdraw/payment/spin.
  - User (Rabu WIB): "Senin - Jumat" & "Selalu Buka" → tombol withdraw aktif; "Sabtu - Minggu" → ditutup + teks sesuai.
  - Email: huruf besar, 4 angka, `_` ditolak dengan pesan jelas; preview bulk menandai baris yang salah. Tanpa error JS.
