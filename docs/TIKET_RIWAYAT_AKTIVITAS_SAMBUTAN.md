# Tiket Bantuan, Riwayat Admin, Aktivitas Terakhir & Suara Sambutan

Tanggal: 2026-11-09 · Branch: `claude/fervent-bell-wqab80` · **Migrasi baru: `supabase/migrations/20261109_tickets_activity.sql`**

## 1. Kebutuhan (PRD ringkas)
| # | Kebutuhan | Status |
|---|---|---|
| 1 | Payout admin: tampilkan nama user & tanggal format Indonesia/WIB | ✅ |
| 2 | Menu admin **Riwayat**: 2 panel bisa di-swipe — *Riwayat Paid* (setoran paid, maks 10) & *Riwayat Payout* (withdraw dibayar, maks 10) | ✅ |
| 3 | Dashboard admin "Aktivitas Terakhir": kirim tugas, request withdraw, menang spin harian | ✅ (spin butuh migrasi) |
| 4 | User: menu & halaman **Tiket Bantuan**, modal buat tiket (filter kata kasar, maks 200 kata, upload gambar), status awal *Pending* | ✅ |
| 5 | Admin: menu **Tiket Bantuan** — kartu (nama, tanggal, baris pertama pesan) → halaman balas (room chat). Admin membalas → *Dibalas* | ✅ |
| 6 | Saat tiket *Pending*, user tidak bisa membuat tiket baru atau menambah pesan | ✅ (dipaksa di server) |
| 7 | Suara sambutan setelah login berhasil (bukan refresh); teks "Halo, <username>" diganti subtitle per kalimat | ✅ |

## 2. Model data (ERD)
```
pengguna (id) 1──* support_tickets (id, user_id, user_name, user_email, status[pending|dibalas], first_message, created_at, updated_at)
support_tickets 1──* support_messages (id, ticket_id, sender_id, sender_role[user|admin], body, image_url, created_at)
pengguna (id) 1──* spin_wins (id, user_id, amount>0, created_at)
storage bucket "ticket-images" (publik, maks 2 MB, jpg/png/webp, folder = user id)
```
- Indeks unik parsial `support_tickets_one_pending (user_id) where status='pending'` → maksimal 1 tiket pending per user, juga saat ada request bersamaan.
- Gambar tiket disimpan di **Storage**, bukan di tabel (tabel hanya menyimpan URL), sesuai kebijakan sebelumnya "tidak ada gambar di DB".

## 3. Keputusan arsitektur (ADR)
1. **Semua penulisan tiket lewat RPC `security definer`** (`create_support_ticket`, `send_ticket_message`). Tidak ada policy insert/update di tabel, jadi aturan "pending = terkunci", validasi 200 kata, dan filter kata kasar tidak bisa dilewati dari DevTools. RLS select: pemilik tiket atau `is_admin()`.
2. **Filter kata kasar dua lapis**: klien (`src/lib/tickets.ts`, menormalkan angka/simbol `g0bl0k` → `goblok` dan huruf berulang) untuk umpan balik instan; server (`ticket_validate_body`) dengan daftar kata yang sama. Pencocokan per kata utuh, jadi "pantai" ≠ "tai", "masuk" ≠ "asu".
3. **Log hadiah spin lewat trigger** `pengguna_log_spin_win`: dicatat bila pada satu update `spin_hari_ini` turun **dan** `saldo` naik (itulah yang dilakukan RPC `spin_gacha`). Tidak perlu mengubah `spin_gacha` dan tidak bisa dipalsukan dari klien.
4. **Aktivitas setoran & withdraw** diambil dari data `history`/`withdraw_history` yang sudah dimuat admin (tanpa query tambahan). Setoran massal (timestamp sama) digabung jadi satu baris "mengirim N tugas setoran".
5. **Riwayat swipe** memakai CSS scroll-snap (native, tanpa library) + tab yang tersinkron dengan posisi geser. Diurutkan berdasarkan `paidAt` (baru dicatat mulai sekarang saat admin Set Paid / Bayar), fallback ke waktu setor/ajukan.
6. **Tanggal WIB** lewat `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta' })` (`src/lib/datetime.ts`), jadi tetap WIB walau perangkat admin di zona lain. Nilai lama yang bukan tanggal valid ditampilkan apa adanya.
7. **Deteksi "baru login"**: `OPENED_FROM_LOGIN` dibaca sekali saat modul dimuat, yaitu apakah URL berisi `?code=` / `#access_token=` dari redirect OAuth Google, sebelum URL dibersihkan. Refresh tidak membawa parameter itu, jadi tidak memicu sambutan. Variabel modul `welcomeConsumed` mencegah pemutaran ulang.
8. **Autoplay**: setelah redirect login, browser sering memblokir audio tanpa interaksi. Bila diblokir, subtitle kalimat pertama tetap tampil dengan tombol "Ketuk untuk dengar sambutan", dan audio otomatis diputar pada sentuhan/tombol pertama di mana saja. Bila 30 detik tanpa interaksi, kembali ke "Halo, username". Ada tombol "Lewati".
9. **Subtitle per kalimat utuh** (bukan potongan SRT). Waktu mulai tiap kalimat diambil dari jeda audio (`ffmpeg silencedetect`) yang dicocokkan dengan file `.srt`: 0,0 s · 3,55 s · 9,2 s · 14,4 s (`src/lib/welcomeVoice.ts`).

## 4. File
| File | Isi |
|---|---|
| `supabase/migrations/20261109_tickets_activity.sql` | Tabel tiket/pesan/spin_wins, RLS, RPC, trigger spin, bucket storage, realtime |
| `src/lib/tickets.ts` | Tipe, validasi (200 kata, kata kasar), kompres+upload gambar, API, realtime |
| `src/lib/datetime.ts` | `formatWIB`, `formatTimeWIB`, `formatDateLongWIB`, `timeAgo` |
| `src/lib/activity.ts` | Gabungan aktivitas + ambil `spin_wins` |
| `src/lib/welcomeVoice.ts` | Subtitle, deteksi login, hook `useWelcomeVoice` |
| `src/components/tickets/{TicketComposer,TicketChat,UserTickets}.tsx` | Form pesan, room chat (user & admin), halaman tiket user |
| `src/components/admin/{AdminTickets,AdminHistory}.tsx` | Daftar tiket admin, Riwayat swipe |
| `src/components/admin/AdminPanel.tsx` | Nama & tanggal WIB di Payout, Aktivitas Terakhir |
| `src/App.tsx`, `MobileUserNav.tsx` | Menu & rute (`/tiket`, `/tiket/:id`, `/admin/riwayat`, `/admin/tiket`, `/admin/tiket/:id`), `nama` user untuk admin, `paidAt`, pemicu sambutan |
| `src/components/Dashboard.tsx`, `src/index.css` | Subtitle sambutan + animasi |
| `public/sambutan.mp3` | Audio sambutan (16,35 s, 272 KB) |

## 5. Validasi
- `tsc --noEmit`: 31 error (baseline, tidak bertambah). `vite build` sukses.
- **PostgreSQL 16 lokal** (stub auth/storage Supabase): migrasi dijalankan 2× (idempotent). Hasil: kata kasar `g0bl0k` ditolak · "pantai" lolos · tiket ke-2 saat pending ditolak · user menambah pesan saat pending ditolak · user lain tidak bisa membaca atau mengirim ke tiket orang (RLS) · admin balas → `dibalas` · user balas → `pending` · 201 kata ditolak · insert langsung ke tabel ditolak · trigger spin hanya mencatat update yang mengurangi spin dan menambah saldo (+5 tercatat, +999 tanpa spin tidak).
- **Playwright (mock Supabase, 375 px & 1440 px, zona perangkat New York)**: alur tiket user→admin→user lengkap (filter, penghitung 201/200, upload, kunci pending, kartu admin berisi nama + tanggal WIB + baris pertama saja, balas → Dibalas); Payout menampilkan nama + "9 Nov 2026, 10.12 WIB"; Riwayat Paid 10 kartu (dari 11), geser → tab Payout aktif, klik tab → kembali; Aktivitas menampilkan setoran (massal digabung), withdraw, dan hadiah spin. Sambutan: kalimat berganti pada 1,4 / 4,8 / 10,3 / 15,6 s, kembali ke "Halo" setelah selesai; mode autoplay diblokir → tombol ketuk → audio jalan; refresh → tanpa sambutan. Tanpa overflow horizontal & tanpa error halaman.

## 6. Langkah admin (wajib)
1. Jalankan `supabase/migrations/20261109_tickets_activity.sql` di Supabase SQL Editor. Sebelum dijalankan, halaman tiket menampilkan pesan "Fitur Tiket Bantuan belum aktif" dan aktivitas spin kosong.
2. Opsional: pastikan Realtime aktif untuk `support_messages` & `support_tickets` (migrasi mencoba menambahkannya). Tanpa realtime, chat tetap diperbarui setiap 15 detik.

## 7. Temuan lain (belum diubah)
- `useEffect` autentikasi di `App.tsx` bergantung pada `navigate`, sehingga setiap pindah halaman memuat ulang sesi, profil, dan (untuk admin) semua data user. Efek sampingnya data admin selalu segar, tapi ada beban query dan potensi kedip "Sebentar ya...". Perbaikan yang disarankan: `navigate` lewat `useRef` + tombol muat ulang/realtime untuk data admin. Tidak diubah di sini agar perilaku "data segar" tidak hilang tanpa diskusi.
- `withdraw_history[].userName` lama berisi string kosong (nama dibaca dari `session.user_metadata` yang tidak ada). Admin sekarang memakai `pengguna.nama`, jadi tampilan sudah benar.

---

## 8. Perbaikan 2026-11-09: suara sambutan dobel & subtitle macet

**Gejala (laporan user):** setelah menekan "dengar", suara jalan tapi subtitle diam. Saat layar disentuh, subtitle mulai jalan bersama suara **kedua**.

**Akar masalah (direproduksi di Playwright, emulasi Pixel 7, autoplay diblokir): 4 elemen audio diputar bersamaan.**
1. Dashboard dipasang ulang beberapa kali saat masuk (StrictMode + `App` memuat ulang sesi ketika pindah dari `/auth/callback` ke `/dashboard`). Setiap pemasangan membuat `new Audio()` sendiri.
2. Listener "ketuk untuk memutar" dipasang di dalam `play().catch()` yang selesai **setelah** komponen dilepas, jadi listener instance lama tidak pernah dibersihkan. Satu sentuhan memutar semua audio lama.
3. Subtitle hanya berjalan bila `play()` milik instance yang tampil berhasil. Audio yang bunyi milik instance lain, jadi subtitle diam.
4. Di HP, `pointerdown` dari sentuhan **bukan** aktivasi user yang sah untuk audio (yang sah: `pointerup`/`touchend`/`click`/`keydown`), jadi percobaan pertama gagal diam-diam.

**Perbaikan (`src/lib/welcomeVoice.ts`):**
- **Satu pemutar tunggal di level modul** (satu `HTMLAudioElement` per pemuatan halaman), dibaca komponen lewat `useSyncExternalStore`. Pemasangan ulang komponen tidak membuat audio baru dan tidak menghentikan suara.
- **Subtitle digerakkan event audio** (`playing`, `timeupdate`, rAF), bukan oleh pemanggil `play()`, jadi selalu sinkron dari jalur mana pun audio dimulai.
- Autoplay dicoba langsung. Bila browser memblokir, pembuka-kunci dipasang **sekali** di `window` (capture) pada `pointerup`/`touchend`/`click`/`keydown`, lalu dilepas saat event `playing`. Tombol "Lewati" (`data-welcome-skip`) tidak ikut memicu suara.
- Catatan: browser (Chrome/Safari/Firefox) tidak mengizinkan suara diputar otomatis tanpa interaksi pada halaman yang baru dibuka dari redirect login, kecuali situs sudah punya skor keterlibatan media tinggi. Tidak ada cara sah untuk melewati kebijakan ini. Di kondisi itu, suara mulai pada sentuhan/klik pertama di mana saja, tetap satu suara dengan subtitle sinkron.

**Validasi (Playwright, 5 skenario):** HP autoplay diblokir + tap tombol · HP (iPhone 13) autoplay diblokir + tap layar · desktop autoplay diblokir + klik layar · desktop & HP autoplay diizinkan. Semua: **tepat 1 elemen audio**, subtitle berganti sesuai posisi audio (detik 4,2 → kalimat 2, detik 10,2 → kalimat 3), tap tambahan tidak memulai suara baru, selesai kembali ke "Halo, username", 0 error halaman.

## 9. Keterangan biaya GoPay
- `AlamatPenarikan.tsx`: opsi "Gopay (biaya Rp 999)". Saat GoPay dipilih muncul kotak "Penarikan via GoPay dikenakan biaya fee Rp 999 per transaksi"; untuk metode lain tampil catatan kecil.
- `WithdrawPage.tsx`: poin baru di Syarat & Ketentuan, "Penarikan via GoPay dikenakan biaya fee Rp 999".
- Hanya keterangan. Fee belum dipotong otomatis dari saldo; admin memotongnya saat membayar.
