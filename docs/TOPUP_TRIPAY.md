# Top Up Saldo (Tripay) & Kunci Mode Pencari Pekerja

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. Alur Top Up

| Langkah | Halaman / endpoint | Keterangan |
|---|---|---|
| 1 | `/topup` → `GET {worker}/api/tripay/channels` | Daftar channel aktif dikelompokkan (Virtual Account, E-Wallet, dst.), ikon, minimal, biaya. Riwayat top up di samping. |
| 2 | `/topup/:kode` | Nominal cepat (10rb–500rb), input manual, ringkasan nominal + biaya + total, tombol **Konfirmasi**. Validasi min/max channel (min. Rp 10.000). |
| 3 | Konfirmasi | (a) catat `topups` status `UNPAID` dengan `merchant_ref` unik `JG-…` → (b) `POST {worker}/api/tripay/create` → (c) simpan `reference` + data pembayaran. |
| 4 | `/topup/pay/:reference` | Total bayar, saldo yang masuk, kode bayar/VA (salin), QR, tombol Bayar Sekarang (checkout Tripay), hitung mundur kedaluwarsa, instruksi. Status dicek otomatis tiap 10 detik + tombol Cek Status. |
| 5 | `rpc claim_topup(reference)` | **Database** memanggil `{worker}/api/tripay/status` (ekstensi `http`), memastikan `reference` & `merchant_ref` cocok, status `PAID`, dan total `order_items` = nominal, lalu menambah saldo **sekali** (row lock + `credited_at`). |

Jika user menutup halaman sebelum lunas, transaksi `UNPAID` diklaim ulang otomatis saat halaman Top Up dibuka lagi.
Menu Top Up: sidebar desktop, panel tarik navbar mobile, dan tombol di kartu saldo Dashboard.

## 2. Keamanan (kenapa saldo tidak ditambah dari browser)

- Status "PAID" dari browser bisa dipalsukan, jadi browser hanya meminta database memverifikasi.
- `claim_topup` adalah satu-satunya jalur penambahan saldo top up; RLS + trigger mencegah user mengubah
  `amount`, `status`, `merchant_ref`, `paid_at`, `credited_at` atau mengganti `reference` yang sudah terisi.
- Mengaitkan `reference` milik orang lain tidak berguna: `merchant_ref` transaksi Tripay harus sama dengan catatan user.
- Catatan `topups` dibuat **sebelum** transaksi Tripay; jika migrasi belum dijalankan, transaksi tidak pernah dibuat
  (tidak ada pembayaran tanpa catatan).
- Callback Tripay di worker (`/api/tripay/callback`) tidak diperlukan untuk alur ini.

## 3. Kunci mode Pencari Pekerja (saldo minimal Rp 10.000)

- Profil: pilihan "Pencari Pekerja" terkunci (ikon gembok, "Min. saldo Rp 10.000") + banner dengan tombol Top Up; klik membuka `/topup`.
- Cari Pekerjaan: bila mode Pencari tetapi saldo < Rp 10.000, form diganti kartu "Mode Pencari Pekerja Terkunci" (Top Up / ganti mode).
- Server: policy `jobs_insert` mensyaratkan saldo pembuat ≥ Rp 10.000.

## 4. Konfigurasi

- Base URL worker: `VITE_TRIPAY_API_BASE` (default `https://boosteryuk.boosteryukid.workers.dev/api/tripay`).
- URL status untuk verifikasi database: fungsi `public.tripay_status_url()` di migrasi.
- **Saran untuk worker**: `return_url` saat ini `https://boosteryuk.com` — ganti ke domain Job Gmail (atau baca dari body)
  agar user kembali ke web ini setelah membayar; `customer_phone` masih statis.

## Migrasi — WAJIB dijalankan sekali

`supabase/migrations/20261104_topup.sql` (membutuhkan ekstensi `http`; di Supabase sudah tersedia, file ini mengaktifkannya).

## Validasi

- `vite build` sukses; `tsc --noEmit` tidak menambah error (31 error bawaan).
- Playwright (Supabase di-mock; endpoint worker di-mock dengan format respons Tripay):
  - Saldo 5.000: pilihan Pencari terkunci + banner; klik → `/topup`; mode tidak berubah; halaman Cari Pekerjaan terkunci.
  - Channel aktif tampil (channel non-aktif disembunyikan); QRIS → `/topup/QRIS`.
  - Nominal 5.000 ditolak (tombol nonaktif); 50.000 → biaya Rp 1.100, total Rp 51.100.
  - Konfirmasi → body create `{ amount: 50000, method: QRIS, merchant_ref: JG-…, customer_name, customer_email }`;
    catatan `topups` UNPAID dengan reference; halaman bayar menampilkan QR + Bayar Sekarang + hitung mundur.
  - Cek status saat belum bayar → saldo tetap 5.000; setelah PAID → saldo 55.000; klik ulang & buka ulang → tetap 55.000 (1 kali klaim).
  - Setelah top up, mode Pencari terbuka.
  - Tanpa migrasi → tidak ada transaksi Tripay dibuat, pesan "Fitur Top Up belum aktif".

## 5. Email "Deposit Sukses" (tambahan 2026-11-04)

- Setelah `claim_topup` mengembalikan `credited: true` (hanya sekali per transaksi), aplikasi mengirim email
  "Deposit Sukses Rp …" lewat endpoint Resend yang sama (`src/lib/emailApi.ts`): nominal, metode, referensi, waktu (WIB).
- Klaim ulang / halaman dibuka ulang tidak mengirim email lagi (server tidak mengkredit dua kali).
- Validasi: Playwright — 1 email ke alamat user setelah PAID (berisi nominal & referensi); setelah cek ulang dan buka ulang halaman tetap 1 email.
