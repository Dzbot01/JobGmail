import { VoiceClip } from './voice';

/** Audio sambutan (ElevenLabs "Kak Ceria") di /public. */
export const WELCOME_AUDIO_URL = '/sambutan.mp3';

/**
 * Subtitle per KALIMAT utuh. Waktu mulai diambil dari timestamp per kata di file JSON
 * ElevenLabs (kata pertama tiap kalimat), dikurangi ±0,05 dtk agar teks muncul tepat sebelum diucapkan:
 * "Haaai!" 0,14 · "Ayo" 3,76 · "Eits," 8,74 · "Cus!" 14,60.
 */
export const WELCOME_SUBTITLES = [
  { start: 0.0, text: 'Haaai! Selamat datang di website Job Gmail.' },
  { start: 3.7, text: 'Ayo mulai buat akun Gmail dengan syarat dan ketentuan yang berlaku, lalu setorkan.' },
  { start: 8.7, text: 'Eits, jangan lupa logout dari akun itu ya sebelum disetorkan, biar akun kamu enggak diblokir.' },
  { start: 14.55, text: 'Cus! Salam cuan!' },
];

/**
 * true bila halaman ini dibuka sebagai hasil redirect login (OAuth ?code= / #access_token=).
 * Dibaca SEKALI saat modul dimuat — sebelum URL dibersihkan — sehingga refresh halaman tidak dihitung.
 */
export const OPENED_FROM_LOGIN: boolean =
  typeof window !== 'undefined' && /[?&#](code|access_token)=/.test(window.location.search + window.location.hash);

export const welcomeClip = (onDone?: () => void): VoiceClip => ({
  id: 'welcome',
  label: 'Sambutan',
  src: WELCOME_AUDIO_URL,
  sentences: WELCOME_SUBTITLES,
  onDone,
});

/**
 * Pengingat tiket dibalas admin. Memakai suara sintesis bahasa Indonesia dari browser
 * sampai ada rekaman khusus. Untuk memakai rekaman: taruh file di /public dan isi `src` + `start` tiap kalimat.
 */
export const TICKET_REPLY_SENTENCES = [
  { text: 'Halo! Tiket bantuan kamu sudah dibalas admin.' },
  { text: 'Yuk, cek balasannya di menu Tiket Bantuan.' },
];

export const ticketReplyClip = (key: string, onDone?: () => void): VoiceClip => ({
  id: `ticket-reply-${key}`,
  label: 'Tiket Dibalas',
  sentences: TICKET_REPLY_SENTENCES,
  action: { label: 'Buka Tiket Bantuan', to: '/tiket' },
  onDone,
});
