# Dashboard Refresh, Banner PanelKitaLegalbot & Sistem Referral

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. Dashboard

| Bagian | Perubahan |
|---|---|
| Kartu "Halo" | Menempel penuh ke bawah header (tanpa celah) di mobile & desktop; teks `Halo, <username>!` |
| Username | Prefix email pendaftaran (`demo.user@gmail.com` → `demo.user`) |
| Marquee | Tanpa kartu; 2 salinan identik digeser −50% → loop mulus tanpa lompat; kata kunci neon (cyan/pink/lime + glow); font **Plus Jakarta Sans** 14px tebal; berhenti saat di-hover; mask fade di tepi |
| Ikon WhatsApp | Ikon 3D CSS (gradien, highlight, ketebalan, bayangan) dengan animasi melayang + rotasi 3D, kilau, dan goyang; patuh `prefers-reduced-motion` |

## 2. Banner info PanelKitaLegalbot

- Komponen `PromoBanner`, tampil untuk role user di bawah logo header (mobile) / di atas konten (desktop).
- Isi: "Halo <username>, Kami telah bekerja sama dengan PanelKitaLegalbot … Ayo kunjungi Bot-nya **disini**"
  — "disini" menuju `https://t.me/PanelKitaLegalbot` (tab baru).
- Tombol X menutup banner; tidak muncul lagi selama sesi browser (`sessionStorage`).
- Tinggi header diukur (`ResizeObserver` → CSS var `--header-h`), sehingga konten & kartu "Halo" selalu tepat di bawah header saat banner dibuka/ditutup.

## 3. Sistem referral

**Aturan:** pengundang mendapat **Rp 50** untuk **setiap tugas** user undangannya yang **diterima admin** (status berubah menjadi `paid`). Tugas `process`/`rejected` tidak dihitung.

**Alur**
1. User membagikan link dari Profil: `https://<domain>/?ref=<id-user>`.
2. Pengunjung membuka link → kode disimpan di `localStorage` (bertahan melewati redirect login Google).
3. Saat akun **baru** dibuat, `pengguna.referred_by = <id pengundang>` (ref ke diri sendiri / tidak valid diabaikan; user lama tidak berubah).
4. Admin menekan **Set Paid** pada tugas user undangan (dari status selain `paid`) → saldo pengundang `+50` dan `referral_earnings +50`. Notifikasi admin menyebut bonus referral.
5. Profil menampilkan link + tombol Copy, jumlah teman diundang, income referral, dan daftar teman (email disamarkan) beserta jumlah tugas diterima.

**Database — WAJIB dijalankan sekali:** `supabase/migrations/20261104_referral.sql`
(Supabase → SQL Editor → paste → Run). Isinya:
- kolom `referred_by uuid` (FK ke `pengguna.id`) dan `referral_earnings integer default 0`,
- index `referred_by`,
- fungsi `get_my_referrals()` (`SECURITY DEFINER`) agar user bisa melihat statistik undangannya walau RLS membatasi baca baris user lain.

**Sebelum migrasi dijalankan** kode tetap aman: pendaftaran user baru diulang tanpa `referred_by`, approval admin tetap berjalan (bonus dilewati), dan Profil menampilkan "Fitur referral sedang disiapkan".

## 4. Validasi

- `vite build` sukses; `tsc --noEmit` tidak menambah error (32 error bawaan proyek).
- Playwright (Supabase di-mock, mencatat setiap insert/update):
  - A. User baru via `?ref=` → insert berisi `referred_by`, kode ref dihapus setelahnya.
  - B. Kolom belum dimigrasi → insert gagal lalu diulang tanpa `referred_by` (akun tetap dibuat).
  - C. Ref ke diri sendiri / tidak valid → `referred_by` kosong.
  - D. Profil: link `…/?ref=<id>`, Copy menyalin link yang sama, daftar 2 teman, income Rp 150 (375px & 1440px).
  - E. Admin Set Paid tugas user undangan → update pengundang `{ saldo: 1000→1050, referral_earnings: 100→150 }`, alert menyebut bonus.
  - Dashboard: `header.bottom == kartuHalo.top` (banner terbuka & tertutup, mobile & desktop); 2 salinan marquee sama lebar; teks "Halo, demo.user!"; link `disini` ke bot; banner hilang setelah X & reload; tanpa overflow horizontal; tanpa error JS.
