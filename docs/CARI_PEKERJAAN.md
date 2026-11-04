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
