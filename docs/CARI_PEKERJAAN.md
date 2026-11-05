# Cari Pekerjaan (Marketplace Pekerjaan) & Bottom Navbar Tarik

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. PRD singkat

User bisa membuka pekerjaan untuk user lain, dan user lain mengerjakannya.

| Mode akun (Profil) | Halaman **Cari Pekerjaan** (`/jobs`) |
|---|---|
| **Pekerja** (default) | Kolom pencarian + grid kartu pekerjaan: judul, deskripsi singkat, bayaran, estimasi proses, statistik slot |
| **Pencari Pekerja** | Form **Buat Pekerjaan** + panel **Pekerjaan Saya** (lihat & review kiriman, tutup/buka lowongan) |

- **Kartu pekerjaan** → klik → `/jobs/:id` **Kerjakan Tugas**: judul, pembuat, bayaran, estimasi, slot, deskripsi detail,
  tata cara pengerjaan, lalu form **Submit Tugas** yang kolomnya ditentukan pembuat.
- **Statistik slot**: bar sisa slot — hijau (> 50% tersisa), kuning (20–50%), merah (< 20% / penuh).
- **Pencarian**: semua kata kunci harus cocok; judul berbobot tertinggi, lalu deskripsi singkat, lalu detail/tata cara/pembuat.
- **Form buat pekerjaan**: Judul, Deskripsi singkat (maks 50 karakter, dengan penghitung), Deskripsi detail, Bayaran (Rp),
  Estimasi proses, Max pekerja, Tata cara, dan **Field Pengiriman Tugas** — tiap kolom diberi nama oleh pembuat dengan tipe:
  - **Teks**, **Password** (tersamar, bisa ditampilkan), **URL** (wajib `https://`), **URL Gambar / Screenshot** (wajib `https://`, ada pratinjau).
  - Tidak ada upload file: bukti gambar dikirim sebagai link (mis. imgur), jadi tidak ada gambar tersimpan di database.
- **Review**: pembuat menekan **Terima & Bayar** (saldo pembuat → pekerja, atomik) atau **Tolak** (+alasan, slot dikembalikan).

## 2. Bottom navbar mobile yang bisa ditarik

- Navbar tetap 4 menu + SETOR. Navbar bisa **ditarik ke atas hingga ±tengah layar**; ruang di bawahnya menampilkan menu
  tambahan (ikon saja, tanpa kartu): **Cari Pekerjaan**, Withdraw, Alamat Penarikan, Tentang Kami.
- Lepas: terbuka penuh bila ditarik > 35% atau dilempar cepat ke atas; selain itu kembali. Tutup dengan tarik ke bawah,
  tap latar gelap, atau pilih menu. Tap biasa pada ikon tetap berfungsi (tap dibatalkan hanya bila jari benar-benar menyeret).
- **Petunjuk**: navbar memantul tipis berkala + pegangan kecil, sampai panel pertama kali dibuka (`localStorage`).
- Desktop memakai sidebar (menu "Cari Pekerjaan" ditambahkan).

## 3. Arsitektur data — `supabase/migrations/20261104_jobs.sql` (WAJIB dijalankan sekali)

| Objek | Fungsi |
|---|---|
| `pengguna.mode_akun` | `'pekerja'` / `'pencari'` |
| `jobs` | data pekerjaan + `fields` (jsonb) + `taken_slots` |
| `job_submissions` | kiriman pekerja (`answers` jsonb), unik per (job, pekerja) |
| trigger `job_submission_before_insert` | tolak bila pekerjaan ditutup / slot penuh / milik sendiri / akun banned; menambah `taken_slots` (row lock, aman dari balapan) |
| trigger `job_submission_after_update` | kiriman ditolak → slot dikembalikan |
| RPC `review_job_submission()` | hanya pemilik; Terima = saldo pembuat − bayaran, saldo pekerja + bayaran dalam satu transaksi (gagal bila saldo kurang) |
| RLS | semua user login bisa melihat pekerjaan; hanya pemilik yang ubah/hapus; kiriman hanya terlihat oleh pekerja & pemilik; status kiriman hanya berubah lewat RPC |

Sebelum migrasi dijalankan, halaman menampilkan pesan "Fitur Cari Pekerjaan belum aktif"; mode akun tersimpan di perangkat.

## 4. Validasi

- `vite build` sukses; `tsc --noEmit` tidak menambah error (32 error bawaan proyek).
- Playwright (Supabase di-mock dengan aturan trigger & RPC yang sama):
  - Navbar: animasi petunjuk aktif; tap Gacha tetap pindah halaman; tarik ke atas → navbar di y=422 dari 844 (tengah),
    tarikan tidak memicu klik; petunjuk berhenti setelah dibuka; menu Cari Pekerjaan → `/jobs` & panel menutup;
    tombol pegangan membuka, tarik ke bawah menutup; tablet tetap di tengah.
  - Grid 5 pekerjaan dengan warna slot hijau/kuning/merah/merah(penuh)/hijau; pencarian "review play", "instagram", tanpa hasil.
  - Submit: kolom wajib kosong & URL `http://` ditolak; kiriman valid tersimpan; slot 10 → 9 tersisa.
  - Pekerjaan penuh & milik sendiri tidak bisa dikirim.
  - Ganti mode di Profil tersimpan (`mode_akun = pencari`) → halaman berubah jadi form.
  - Deskripsi singkat terpotong 50 karakter; pekerjaan baru tersimpan dengan kolom bernama (`email`, `screenshot_selesai: image_url`).
  - Terima & Bayar: status `paid`, saldo pembuat −1.000, pekerja +1.000.
  - Tanpa error JS & tanpa overflow horizontal.

## 5. Review kiriman oleh pembuat pekerjaan (tambahan 2026-11-04)

- Kiriman pekerja tersimpan di tabel `job_submissions` (jawaban kolom submit dalam `answers`).
- Panel **Pekerjaan Saya** (mode Pencari Pekerja) memuat semua kiriman sekaligus dan menampilkan badge
  "N kiriman menunggu review" per pekerjaan.
- **Terima & Bayar**: konfirmasi → RPC `review_job_submission` memindahkan bayaran dari saldo pembuat ke pekerja.
- **Tolak**: modal dengan kolom **Alasan Penolakan wajib** (min. 5, maks. 300 karakter). Alasan disimpan di
  `job_submissions.reason`, tampil di panel pembuat dan di halaman Kerjakan Tugas milik pekerja; slot dikembalikan.
- Validasi: Playwright (375 & 1440 px) — badge pending, tombol Tolak nonaktif saat alasan kosong/< 5 karakter,
  tolak dengan alasan → status `rejected`, alasan tersimpan & tampil, modal tertutup, tanpa error JS.

## 6. Saldo pending & Riwayat Pekerjaan (tambahan 2026-11-04)

**Saldo pending** = total bayaran dari kiriman pekerja yang masih berstatus `process`. Tidak disimpan sebagai kolom
terpisah, melainkan dihitung dari `job_submissions` + `jobs.reward`, sehingga selalu konsisten:
kirim tugas → masuk pending; diterima (`review_job_submission`) → keluar dari pending & masuk saldo utama;
ditolak → hilang dari pending. Tampil di kartu saldo Dashboard ("+ Rp … saldo pending"), halaman Cari Pekerjaan,
halaman Kerjakan Tugas (setelah kirim), dan halaman Riwayat.

**Riwayat Pekerjaan** (`JobHistory`): filter Semua / Proses / Diterima / Ditolak beserta jumlahnya, maksimal 10 data
terbaru (judul, tanggal, bayaran, status, alasan penolakan). Tampil di Cari Pekerjaan (mode Pekerja; kolom kanan di
desktop) dan di halaman Riwayat (`/history`) di samping Riwayat Setor.

**Batas 10 data** untuk semua daftar riwayat: Riwayat Setor, Riwayat Withdraw, Riwayat Top Up, Riwayat Pekerjaan
(dengan keterangan "10 terbaru dari N").

Validasi (Playwright, 375 & 1440 px, data uji 12 kiriman: 5 proses, 4 diterima, 3 ditolak):
pending Rp 8.500 di Dashboard & Cari Pekerjaan; 10 item + "Menampilkan 10 terbaru dari 12 data"; filter Ditolak 3 item
dengan alasan; Proses 5 item; tolak kiriman Rp 500 → pending Rp 8.000; terima kiriman Rp 2.000 → pending Rp 6.000;
Riwayat Setor 10 dari 14; Riwayat Withdraw 10 dari 13; tanpa error JS & tanpa overflow.

## 7. Perapian UI (2026-11-05)

- Cari Pekerjaan (mode Pekerja): kartu Riwayat Pekerjaan tidak lagi ditampilkan di halaman ini (tetap tersedia di
  halaman Riwayat). Diganti 2 kartu kecil di bawah header: **Saldo Didapat** (total bayaran kiriman yang diterima)
  dan **Saldo Pending** (kiriman yang masih direview), dihitung dalam satu query dari `job_submissions` + `jobs`.
- Dashboard: tombol Top Up di kartu saldo dihapus; menu Top Up tetap di panel tarik bottom navbar dan sidebar desktop.
- Ikon WhatsApp di Dashboard: logo resmi dari **Simple Icons** (`simple-icons@13.21.0`, lisensi CC0), warna brand
  `#25D366`, tanpa kartu/efek 3D; CSS animasi 3D lama dihapus.
- Validasi (Playwright, 390 & 1440 px): kartu saldo hanya berisi tombol Withdraw; logo WhatsApp 48px tanpa kartu;
  Saldo Didapat Rp 9.500 (4 diterima) & Saldo Pending Rp 8.500 (5 proses) sesuai data uji; kartu riwayat tidak tampil;
  menu Top Up tetap ada; tanpa error JS & overflow.
