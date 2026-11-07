# Admin: Pengirim Setoran, Pencarian Email Setoran & Template Broadcast

Tanggal: 2026-11-07 · Branch: `claude/fervent-bell-wqab80`

## Kebutuhan (PRD singkat)
1. **Data Setoran**: setiap kartu setoran menampilkan **nama pengirim** (dan email akun pengirim) serta tombol **salin email** dengan ikon copy.
2. **Banned User**: tab default = **Semua User** (posisi pertama), bukan Terindikasi Spam. Kolom pencarian bisa mencari **email setoran** untuk mengetahui siapa yang mengirimnya.
3. **Broadcast**: tombol **Template: Belum Logout** yang mengisi subjek & pesan; nama dan email setoran diisi manual oleh admin.

## Implementasi
| Area | File | Perubahan |
|---|---|---|
| Data Setoran | `src/components/admin/AdminPanel.tsx` | Memuat peta `pengguna.id → nama` sekali saat panel dibuka (fallback: prefix email). Blok "Pengirim" (avatar inisial, nama, email). Tombol salin (lucide `Copy` → `Check` 1,5 dtk) untuk email setoran & email pengirim. Fallback `document.execCommand('copy')` bila Clipboard API tidak tersedia (HTTP / WebView lama). |
| Banned | `src/components/admin/BannedUsers.tsx` | Default tab `all` & urutan kartu: Semua User → Spam → Dibanned. Filter pencarian juga mencocokkan `history[].email`. User yang cocok menampilkan kotak kuning "Mengirim setoran yang cocok" (maks. 3 + jumlah sisanya); di daftar setoran yang dibuka, setoran yang cocok di-highlight. |
| Broadcast | `src/components/admin/Broadcast.tsx` | Panel template dengan input *Nama penerima* & *Email setoran*, pratinjau langsung, tombol "Gunakan template" (konfirmasi jika pesan sudah berisi). Nama kosong → `{nama}` (dipersonalisasi otomatis per penerima). |
| Email | `src/lib/emailApi.ts` | `sendEmail` menerima `replyTo` opsional → dikirim sebagai `reply_to` ke worker. Broadcast memakai email admin yang login, sehingga "balas email ini" sampai ke admin, bukan ke `noreply@`. |

Teks template (subjek: *Segera logout akun setoran anda*):
```
Halo {nama},
Kami telah menerima data setoran anda dengan nama : {email setoran}, kami melihat bahwa anda belum logout dari akun tersebut. segera logout dari akun tersebut dengan cara menghapus akun dari perangkat di pengaturan dan balas email ini agar kami dapat mem verifikasi nya atau jika tidak akun anda akan kami blokir permanen.
Terimakasih.
```

## Keputusan (ADR ringkas)
- **Tanpa perubahan skema/migrasi**: `nama` sudah ada di tabel `pengguna`; pencarian email setoran dilakukan di klien pada data yang sudah dimuat halaman Banned (semua user + `history`). Untuk skala besar, opsi lanjutan: RPC/indeks GIN `jsonb_path_ops` pada `history`.
- **reply_to dari sisi klien**: worker sudah menerima `body.reply_to`. Bila worker tidak meneruskannya ke Resend, email tetap terkirim (field diabaikan).

## Validasi
- `tsc --noEmit`: 31 error (baseline sama, tidak bertambah). `vite build` sukses.
- Playwright (mock Supabase, 375px & 1440px): label Pengirim tampil, salin → clipboard berisi email setoran; Banned default 7 user (Semua); cari `acc3.20261104` → hanya `member3@gmail.com` + kotak kecocokan; template mengisi subjek & pesan persis sesuai teks; regresi ban massal tetap lulus; tanpa overflow horizontal & tanpa error halaman.
