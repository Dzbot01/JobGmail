# Perbaikan Bug Uang: Saldo Minus & Setoran Bulk Hilang

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. Withdraw bisa membuat saldo minus

**Akar masalah:** halaman Withdraw hanya mengecek minimal Rp 1.000, tidak pernah membandingkan dengan saldo.
`saldo - jumlah` ditulis apa adanya, dan berdasarkan saldo di layar (bisa usang), bukan saldo terbaru di database.
Email konfirmasi juga terkirim sebelum saldo dipotong.

**Perbaikan berlapis**
| Lapisan | Perlindungan |
|---|---|
| UI | Jumlah > saldo ditolak + pesan "Jumlah melebihi saldo kamu"; nominal cepat yang melebihi saldo dinonaktifkan; tombol konfirmasi redup & terkunci saat tidak valid / sedang diproses (anti klik ganda); tombol "Tarik semua" |
| Klien → server | `requestWithdraw()` memanggil RPC `request_withdraw` (atomik: kunci baris, cek banned, alamat penarikan, jadwal WIB, saldo; potong saldo + catat riwayat dalam satu transaksi) |
| Cadangan (sebelum migrasi) | baca saldo **terbaru** dari DB, tolak jika kurang, lalu update bersyarat `where saldo = <nilai yang dibaca>` (optimistic lock) — dua permintaan bersamaan tidak bisa memotong dua kali |
| Database | constraint `pengguna_saldo_nonnegative check (saldo >= 0)` — setiap penulisan yang membuat saldo minus ditolak, dari mana pun asalnya |
| Urutan | saldo dipotong & divalidasi **dulu**, baru email konfirmasi dikirim |

Constraint memakai `NOT VALID`: baris lama yang sudah terlanjur minus tidak membuat migrasi gagal, tetapi
user tersebut tidak bisa menulis saldo baru sampai saldonya diperbaiki admin. Cek dengan:
`select id, email, saldo from pengguna where saldo < 0;`

## 2. Setoran bulk hanya menyimpan 1 dari 10 akun

**Akar masalah:** bulk memanggil fungsi simpan 10× **bersamaan**; tiap panggilan membaca `history` yang sama lalu
menulis `history lama + 1 akun`, sehingga saling menimpa. Selain itu 20 email notifikasi terkirim.

**Perbaikan:** `handleTaskSubmit` menerima satu atau banyak akun dan menyimpannya dalam **satu kali update**;
email notifikasi dikirim sekali ke user dan sekali ke admin (berisi daftar email). Email yang sudah pernah
disetor oleh user yang sama ditolak.

## Migrasi — WAJIB dijalankan sekali

`supabase/migrations/20261104_withdraw_safety.sql`

## Validasi

- `vite build` sukses; `tsc --noEmit` 31 error (berkurang 1 dari 32 bawaan; tidak ada error baru).
- Playwright (Supabase di-mock), jalur RPC **dan** cadangan:
  - Minta 200.000 dengan saldo 125.400 → ditolak di UI, saldo tidak berubah.
  - Minta 100.000 → saldo 25.400, riwayat bertambah.
  - Layar usang (DB tinggal 500), minta 20.000 → ditolak "Saldo tidak cukup", saldo tetap 500 (tidak minus).
- Bulk 10 akun (lewat OTP) → 1 update berisi 10 akun baru + 5 lama, pindah ke Riwayat, tanpa error.
