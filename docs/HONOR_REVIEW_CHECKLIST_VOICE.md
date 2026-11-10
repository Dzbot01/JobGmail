# Honor Score, Status Review, Checklist Setoran, Indikator & Suara Pengingat Tiket

Tanggal: 2026-11-10 · Branch: `claude/fervent-bell-wqab80` · **Migrasi baru: `supabase/migrations/20261110_honor_score.sql`**

## 1. Kebutuhan (PRD ringkas)
| # | Kebutuhan | Status |
|---|---|---|
| 1 | Status setoran baru **Review** (user & admin). Setoran baru tetap *Proses*. Admin punya tombol **Review** biru = sedang diproses admin | ✅ |
| 2 | Modal checklist sebelum kirim: "Saya sudah logout dari akun ini" & "Saya tidak menautkan nomor atau email pemulihan apa pun pada akun ini" | ✅ (single & bulk) |
| 3 | Honor score asli: default 100, ditolak −40, diterima +10 per akun. Biru aman · Kuning 1×/hari tanpa bulk · Merah blokir otomatis | ✅ (dipaksa server) |
| 4 | Indikator di menu Tiket Bantuan saat tiket dibalas admin | ✅ |
| 5 | Suara pengingat "tiket dibalas" di dashboard, tampil seperti suara sambutan | ✅ (suara sintesis, lihat §5) |
| 6 | Semua suara autoplay / mulai dari sentuhan di mana saja, tanpa tombol mulai | ✅ |

## 2. Honor Score (ERD + aturan)
- Kolom baru `pengguna.honor_score integer not null default 100 check (0..100)`.
- Trigger `pengguna_honor_guard` (BEFORE UPDATE, `security definer`):
  - **Admin mengubah status setoran** (dicocokkan per `id` di `history`): setiap transisi ke `rejected` −40, ke `paid` +10 (maks 100). Transisi yang sama tidak dihitung dua kali. `review` tidak mengubah honor.
  - Honor < 30 → `is_banned = true` (blokir otomatis; data **tidak** dihapus, berbeda dari tombol Banned admin).
  - **User menambah setoran**: merah/diblokir → ditolak; kuning → ditolak bila >1 akun sekaligus (bulk) atau sudah ada setoran hari ini (tanggal WIB).
  - User **tidak bisa** mengubah `honor_score` sendiri atau membuka blokirnya sendiri.
  - Admin membuka blokir user berhonor merah → honor diset ke 30 (kuning) agar user bisa mulai memulihkan.
- Ambang (sama di `src/lib/honor.ts`): **Biru ≥ 70**, **Kuning 30–69**, **Merah < 30**. Simulasi: 100 → 1× ditolak 60 (kuning) → 1 diterima 70 (biru); dari 60, 1× ditolak lagi 20 (merah, blokir).
- Klien (`Setoran.tsx`) menampilkan status & menonaktifkan tombol (kuning: "Batas 1x per hari tercapai", "Bulk tidak tersedia"; merah: "Akun diblokir"); `Profil.tsx` menampilkan kartu honor berwarna + bar + aturan.
- Honor dibaca dengan query terpisah (`fetchHonorScore`), jadi profil tetap termuat sebelum migrasi dijalankan (default 100).

## 3. Status Review
- `src/lib/submissionStatus.ts`: label & warna terpusat (`Proses` oranye, `Review` biru, `Paid` hijau, `Ditolak` merah).
- Admin Data Setoran: tombol **Review** (biru) untuk setoran *Proses*; setelah diklik berubah menjadi tag "Direview". Tombol Set Paid jadi hijau agar tidak tertukar dengan Review. Header menampilkan "N menunggu proses · M direview".
- User Riwayat Setor: badge "Review" + keterangan "Setoran ini sedang diproses admin." dan tanggal format WIB.
- Banned User & Broadcast ikut mengenali status `review`.

## 4. Checklist setoran
Urutan: validasi form → cek honor → cek jeda → **modal checklist** (tombol "Lanjutkan Kirim" aktif hanya bila kedua centang dipilih) → verifikasi OTP → simpan. Berlaku untuk setoran tunggal dan bulk.

## 5. Suara: satu antrean untuk semua (ADR)
- `src/lib/voice.ts` menggantikan pemutar khusus sambutan dengan antrean umum: satu elemen audio, satu klip pada satu waktu, id unik per klip per halaman. Ini mencegah suara dobel dan menjaga urutan sambutan → pengingat.
- Klip berupa file audio (subtitle mengikuti `currentTime`) atau **suara sintesis browser** (Web Speech API `id-ID`, subtitle berganti per kalimat lewat `onstart`).
- Autoplay dicoba langsung. Bila browser memblokir, suara diputar pada sentuhan, klik, atau tombol pertama di mana saja. **Tidak ada tombol mulai**; hanya teks kecil "Sentuh layar di mana saja untuk memutar suara".
- Perangkat tanpa suara bahasa Indonesia atau tanpa mesin TTS → subtitle tetap berganti tanpa suara (tidak memakai logat asing).
- Semua pemanggilan API suara dibungkus try/catch. Error suara hanya melewati klip, tidak merusak halaman (diuji dengan `speak()` yang melempar error).
- Subtitle sambutan diselaraskan ulang dengan timestamp per kata dari JSON ElevenLabs: 0,0 · 3,7 · 8,7 · 14,55 dtk (sebelumnya kalimat ke-3 terlambat ±0,5 dtk).
- **Catatan file**: mp3 yang diunggah untuk "voice reminder" identik byte-per-byte dengan `sambutan.mp3` (md5 `20253fdc…`), dan JSON-nya berisi teks sambutan. Karena itu pengingat tiket memakai suara sintesis dengan teks: "Halo! Tiket bantuan kamu sudah dibalas admin." / "Yuk, cek balasannya di menu Tiket Bantuan." Bila rekaman ElevenLabs khusus tersedia, cukup taruh di `/public`, lalu isi `src` dan `start` tiap kalimat di `ticketReplyClip` (`src/lib/welcomeVoice.ts`).

## 6. Indikator tiket dibalas
- `src/lib/ticketNotify.ts`: memuat tiket user (realtime + polling 60 dtk + saat tab fokus).
  - "Belum dibaca" = status `dibalas` dan `updated_at` belum dibuka di perangkat ini.
  - "Sudah diingatkan" disimpan terpisah, jadi suara pengingat hanya sekali per balasan; balasan admin berikutnya memicu lagi.
- Indikator: badge angka merah di sidebar desktop, titik merah berdenyut di pegangan navbar HP, badge di ikon Tiket Bantuan pada panel menu, dan label "Balasan baru" di daftar tiket. Hilang setelah tiket dibuka.

## 7. Validasi
- `tsc --noEmit`: 31 error (baseline). `vite build` sukses.
- **PostgreSQL 16 lokal** (migrasi 2× idempotent), 14 skenario lulus: user tidak bisa ubah honor · review tanpa efek · tolak −40 (100→60) · kuning: bulk ditolak, 1 setoran boleh, setoran ke-2 hari yang sama ditolak (data lama berisi "bukan tanggal" tidak membuat error) · terima +10 (→70), terima ulang tidak dobel · 70→30→0 + blokir otomatis · user tidak bisa unban diri · user diblokir tidak bisa setor · admin unban → honor 30 · ban massal (history dikosongkan) tidak mengubah honor.
- **Playwright** (mock Supabase, 375 px & 1440 px):
  - Kuning: banner, tombol "Batas 1x per hari tercapai" & "Bulk tidak tersedia". Merah: "Akun diblokir". Profil 100/60/20 → Aman/Dibatasi/Diblokir.
  - Checklist: tombol nonaktif sampai kedua centang dipilih, lalu OTP muncul.
  - Riwayat user menampilkan badge Review. Admin klik Review → tag Direview (biru), header "· 1 direview".
- **Suara**:
  - Login + autoplay diizinkan: sambutan (4 kalimat sinkron) → pengingat tiket (2 kalimat TTS) → "Halo, username".
  - HP autoplay diblokir: tanpa tombol, teks petunjuk tampil, tap layar → urutan sama.
  - Buka dashboard tanpa login: hanya pengingat. Reload: tidak diulang.
  - Selalu 1 elemen audio, TTS hanya bicara sekali.
- Indikator: titik pegangan, badge panel & sidebar = 1 → buka tiket → hilang.
- Regresi tiket (user→admin→user) dan pencarian Banned lulus.

## 8. Langkah admin (wajib)
Jalankan `supabase/migrations/20261110_honor_score.sql` di Supabase SQL Editor. Sebelum itu, honor score tampil 100 untuk semua user dan aturan kuning/merah belum dipaksa server (status Review & checklist sudah berfungsi).
