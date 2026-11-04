# Halaman Banned User (Admin)

Tanggal: 2026-11-04 · Branch: `claude/fervent-bell-wqab80`

## 1. PRD singkat

**Tujuan:** admin bisa melihat user yang menyetor tugas secara spam dalam 1 hari, memeriksa
akun yang disetorkan, lalu mem-banned (atau membuka blokir) user tersebut.

**Lokasi:** route `/admin/banned` (khusus admin), menu "Banned User" di sidebar desktop dan "Banned" di bottom nav admin.

**Data:** tabel `pengguna` — kolom `history` (array setoran `{ id, email, password, status, timestamp }`)
dan `is_banned` (boolean `true`/`false`). Admin (`peran = 'admin'`) tidak ditampilkan.

**Fitur**
- 3 filter: **Terindikasi Spam** (default), **Semua User**, **Dibanned**, masing-masing dengan jumlah.
- **Batas spam** bisa diubah di halaman (default **20 setoran/hari**). User ditandai spam jika jumlah
  setoran pada salah satu hari kalender (zona waktu browser, WIB) ≥ batas.
- Tiap user: total setoran, jumlah terbanyak per hari + tanggalnya, badge SPAM/BANNED.
- **Lihat setoran**: daftar akun yang disetorkan dikelompokkan per tanggal (hari spam disorot),
  berisi email, jam, password, dan status.
- Tombol **Banned** / **Unban** per user, plus pilih beberapa user (checkbox / pilih semua) lalu
  **Banned** massal dari bar aksi bawah. Ada konfirmasi sebelum menyimpan.
- Simpan: `update({ is_banned: true|false }).in('id', ids)` ke Supabase.
- Pencarian email/nama, urut dari setoran per hari terbanyak.

## 2. Keputusan

| # | Keputusan | Alasan |
|---|---|---|
| 1 | Tabel `pengguna`, kolom `is_banned` | Nama tabel yang dipakai seluruh aplikasi; `App.tsx` sudah membaca `is_banned` dan memblokir `/setoran`, `/withdraw`, `/penarikan`, `/gacha` untuk user banned. |
| 2 | Default batas 20/hari, bisa diubah | Setoran bulk resmi = 10 akun sekaligus; batas 10 akan menandai user jujur. |
| 3 | Hitung per hari kalender di browser | Data `history` disimpan sebagai JSON di kolom; tidak perlu query/SQL tambahan. |
| 4 | Label bottom nav admin dipersingkat ("Cast", "Banned") | 6 menu harus muat di layar 375px. |

## 3. Catatan

- Pemblokiran saat ini ditegakkan di frontend (redirect). Untuk penegakan penuh, tambahkan RLS/trigger
  di Supabase yang menolak update `history`/`withdraw_history` bila `is_banned = true`.
- Update `is_banned` user lain membutuhkan policy RLS yang mengizinkan admin meng-update baris `pengguna`
  (sudah dipakai oleh fitur admin lain seperti Set Paid/Tolak).

## 4. Validasi

- `vite build` sukses; `tsc --noEmit` tidak menambah error (32 error bawaan proyek).
- Playwright (Supabase di-mock, zona waktu Asia/Jakarta), 375px & 1440px:
  - Data uji: 1 user 25 setoran pada 3 Nov, 1 user sudah banned, 5 user normal.
  - Tab Spam hanya menampilkan user 25/hari; rincian per tanggal "25 setoran" & "3 setoran".
  - Pilih user → Banned massal → jumlah Dibanned 1 → 2, badge BANNED muncul, tombol berubah jadi Unban.
  - Tab Semua menampilkan 7 user; tanpa overflow horizontal; tanpa error JS.
