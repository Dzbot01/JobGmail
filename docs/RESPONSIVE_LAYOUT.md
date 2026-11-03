# Responsive Layout — Mobile, Tablet & Desktop

Tanggal: 2026-11-03 · Branch: `claude/fervent-bell-wqab80`

## 1. Latar belakang (PRD singkat)

**Masalah:** Seluruh halaman dibungkus `max-w-md` (448px) di `src/App.tsx`, sehingga di desktop
semua konten — termasuk modal "Kotak Pesan" — menjadi satu kolom sempit di tengah layar.

**Tujuan**
- Semua halaman (user, admin, login) nyaman dipakai di mobile (≥320px), tablet, dan desktop.
- Di desktop, konten dan modal memakai lebar layar (multi-kolom), tidak menumpuk di tengah.
- Tampilan mobile tidak berubah (pengguna utama memakai HP).

**Non-goal:** perubahan logika bisnis, database, atau desain ulang visual.

## 2. Audit awal

| Area | Temuan |
|---|---|
| `App.tsx` `<main>` | `max-w-md mx-auto` → konten 448px di semua ukuran layar |
| Bottom nav | Melebar penuh 1440px di desktop, ikon berjauhan |
| Modal Kotak Pesan (`Dashboard.tsx`) | `max-w-md` → modal kecil di tengah desktop |
| `AuthPage.tsx` | `flex-col` tanpa `flex` → kartu login tidak ter-center |
| `CustomAlert` (`.alert-card`) | Lebar tetap 330px, tinggi tetap 80px → teks panjang terpotong |
| `AlamatPenarikan.tsx` | Prop `onBack` tidak dikirim dari `App.tsx` → tombol kembali error |
| `Profil.tsx`, `AlamatPenarikan.tsx` | Beberapa elemen `flex-col` tanpa `flex` → isi tidak rata tengah |
| `UserHistory.tsx` | Email dipotong `max-w-[140px]` walau ruang tersedia |

## 3. Keputusan arsitektur (ADR)

**ADR-01 — Breakpoint mengikuti default Tailwind**
- `< 640px` mobile: layout lama (1 kolom, header atas, bottom nav).
- `sm/md 640–1023px` tablet: konten `max-w-3xl`, bottom nav dibatasi 640px di tengah, list 2 kolom.
- `lg ≥ 1024px` desktop: **sidebar kiri** (logo, tombol Setor, menu, logout) menggantikan header + bottom nav;
  konten melebar sampai `max-w-6xl` dengan grid 2–3 kolom.

Alasan: pola sidebar + konten lebar adalah standar dashboard web (mis. Gmail, Notion, dashboard
e-wallet versi web); bottom nav hanya ergonomis untuk jempol di HP. Mobile-first: kelas lama
dipertahankan, kelas `sm:/md:/lg:` hanya *menambah* perilaku untuk layar besar, sehingga risiko
regresi di mobile minimal.

**ADR-02 — Tanpa dependensi baru.** Semua via utilitas Tailwind v4 + sedikit media query di `index.css`.

## 4. Perubahan per halaman

| Halaman | Desktop (lg) |
|---|---|
| Shell (`App.tsx`) | Sidebar 256px, header & bottom nav disembunyikan, konten `max-w-6xl` |
| Dashboard | Grid 2 kolom; header biru menjadi kartu rounded |
| Modal Kotak Pesan | `max-w-5xl`, 3 kolom pesan (2 kolom di tablet), tombol Tutup di kanan |
| Setoran | Form satuan & bulk berdampingan |
| Gacha | Roda (2/3) + aturan main (1/3) |
| Riwayat Tugas / Riwayat Withdraw | Kartu grid 2–3 kolom, email tidak dipotong paksa |
| Withdraw | Form nominal (kiri) + S&K (kanan) |
| Alamat Penarikan | Animasi dompet (kiri) + form (kanan) |
| Profil | Kartu profil + statistik 3 kolom + pengaturan |
| Tentang Kami | Fitur 2 kolom |
| Admin (dashboard, setoran, payout) | Statistik 3 kolom, list grid 2–3 kolom |
| Login | Kartu 2 panel (panel brand + form login), ter-center |
| Alert | Lebar responsif `min(360px, 100vw - 32px)`, pojok kanan atas di desktop |

## 5. Validasi

- `vite build` sukses.
- `tsc --noEmit`: 32 error bawaan proyek (sebelumnya 33; berkurang 1 karena `onBack`), tidak ada error baru.
- Playwright (Chromium) dengan Supabase di-mock, 13 rute × 3 viewport (375×812, 820×1180, 1440×900):
  tidak ada overflow horizontal (`scrollWidth == clientWidth`) dan tidak ada error JS di semua kombinasi.
- Pemeriksaan visual screenshot: mobile sama seperti sebelumnya; tablet & desktop memakai lebar layar.

## 6. Changelog

- feat(layout): sidebar desktop + konten lebar, bottom nav khusus mobile/tablet
- feat(ui): grid responsif untuk semua halaman user & admin, modal Kotak Pesan melebar
- fix(auth): kartu login ter-center, layout 2 panel di desktop
- fix(alert): lebar & tinggi alert responsif
- fix(penarikan): kirim `onBack` agar tombol kembali berfungsi
