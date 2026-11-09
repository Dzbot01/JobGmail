import { useEffect, useRef, useSyncExternalStore } from 'react';

/** Audio sambutan (ElevenLabs "Kak Ceria") di /public. */
export const WELCOME_AUDIO_URL = '/sambutan.mp3';

/**
 * Subtitle per KALIMAT utuh (bukan potongan SRT). Waktu mulai diambil dari jeda di audio
 * (ffmpeg silencedetect) yang dicocokkan dengan file .srt dari ElevenLabs.
 */
export const WELCOME_SUBTITLES: { start: number; text: string }[] = [
  { start: 0.0, text: 'Haaai! Selamat datang di website Job Gmail.' },
  { start: 3.55, text: 'Ayo mulai buat akun Gmail dengan syarat dan ketentuan yang berlaku, lalu setorkan.' },
  { start: 9.2, text: 'Eits, jangan lupa logout dari akun itu ya sebelum disetorkan, biar akun kamu enggak diblokir.' },
  { start: 14.4, text: 'Cus! Salam cuan!' },
];

export const subtitleIndexAt = (t: number) => {
  let idx = 0;
  for (let i = 0; i < WELCOME_SUBTITLES.length; i++) if (t >= WELCOME_SUBTITLES[i].start) idx = i;
  return idx;
};

/**
 * true bila halaman ini dibuka sebagai hasil redirect login (OAuth ?code= / #access_token=).
 * Dibaca SEKALI saat modul dimuat — sebelum URL dibersihkan — sehingga refresh halaman tidak dihitung.
 */
export const OPENED_FROM_LOGIN: boolean =
  typeof window !== 'undefined' && /[?&#](code|access_token)=/.test(window.location.search + window.location.hash);

export type WelcomePhase = 'idle' | 'blocked' | 'playing' | 'done';

/** Jika browser memblokir autoplay dan user tidak berinteraksi, sambutan dibatalkan setelah waktu ini. */
const GIVE_UP_MS = 30000;

/**
 * Event yang dihitung browser sebagai "aktivasi user" (boleh memutar suara).
 * Catatan: pointerdown dari SENTUHAN tidak termasuk, jadi dipakai touchend/pointerup/click.
 */
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

// ===================================================================================
// Pemutar TUNGGAL di level modul. Dashboard bisa dipasang ulang berkali-kali
// (StrictMode, pemuatan ulang sesi saat pindah dari /auth/callback ke /dashboard),
// tetapi hanya ada SATU elemen audio, jadi suara tidak mungkin dobel.
// Subtitle digerakkan oleh event audio itu sendiri, bukan oleh siapa yang memanggil play().
// ===================================================================================

interface State { phase: WelcomePhase; index: number }

let state: State = { phase: 'idle', index: 0 };
const listeners = new Set<() => void>();
const setState = (patch: Partial<State>) => {
  const next = { ...state, ...patch };
  if (next.phase === state.phase && next.index === state.index) return;
  state = next;
  listeners.forEach(l => l());
};

let audio: HTMLAudioElement | null = null;
let started = false;
let raf = 0;
let giveUpTimer: ReturnType<typeof setTimeout> | undefined;

const removeUnlock = () => UNLOCK_EVENTS.forEach(e => window.removeEventListener(e, tryPlay, true));
const addUnlock = () => UNLOCK_EVENTS.forEach(e => window.addEventListener(e, tryPlay, { capture: true, passive: true }));

function tick() {
  if (!audio) return;
  setState({ index: subtitleIndexAt(audio.currentTime) });
  if (!audio.paused && !audio.ended) raf = requestAnimationFrame(tick);
}

function finish() {
  if (state.phase === 'done') return;
  cancelAnimationFrame(raf);
  removeUnlock();
  if (giveUpTimer) clearTimeout(giveUpTimer);
  if (audio && !audio.ended) audio.pause();
  setState({ phase: 'done' });
}

function tryPlay(e?: Event) {
  // Tombol "Lewati" tidak boleh ikut memulai suara
  if ((e?.target as Element | null)?.closest?.('[data-welcome-skip]')) return;
  if (!audio || state.phase === 'done' || !audio.paused) return;
  audio.play().catch(() => {
    // Masih diblokir (belum ada interaksi yang sah) → tunggu interaksi berikutnya
    if (state.phase !== 'done') setState({ phase: 'blocked' });
  });
}

function ensureAudio() {
  if (audio) return audio;
  const a = new Audio(WELCOME_AUDIO_URL);
  a.preload = 'auto';
  a.addEventListener('playing', () => {
    removeUnlock();
    if (giveUpTimer) clearTimeout(giveUpTimer);
    setState({ phase: 'playing' });
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  });
  a.addEventListener('timeupdate', () => setState({ index: subtitleIndexAt(a.currentTime) }));
  a.addEventListener('ended', finish);
  a.addEventListener('error', finish);
  audio = a;
  return a;
}

/** Mulai sambutan sekali saja per pemuatan halaman (dipanggil berulang = aman). */
export function startWelcome() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const a = ensureAudio();
  // Pasang pembuka-kunci SEBELUM mencoba autoplay agar sentuhan pertama apa pun langsung memutar
  addUnlock();
  giveUpTimer = setTimeout(() => { if (state.phase !== 'playing') finish(); }, GIVE_UP_MS);
  a.play().catch(() => { if (state.phase !== 'done' && a.paused) setState({ phase: 'blocked' }); });
}

export const skipWelcome = () => finish();
export const playWelcomeNow = () => tryPlay();

/** Untuk pengujian: kembalikan pemutar ke kondisi awal. */
export function __resetWelcomeForTest() {
  finish();
  audio = null;
  started = false;
  state = { phase: 'idle', index: 0 };
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

/**
 * Status sambutan untuk komponen. Bila `active`, sambutan dimulai (sekali per halaman).
 * Melepas komponen TIDAK menghentikan suara, sehingga pemasangan ulang tidak menimbulkan suara kedua.
 */
export function useWelcomeVoice(active: boolean, onDone: () => void) {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => { if (active) startWelcome(); }, [active]);

  useEffect(() => {
    if (!active || s.phase !== 'done') return;
    const t = setTimeout(() => doneRef.current(), 400);
    return () => clearTimeout(t);
  }, [active, s.phase]);

  return {
    phase: s.phase,
    index: s.index,
    sentence: WELCOME_SUBTITLES[s.index]?.text || '',
    play: playWelcomeNow,
    skip: skipWelcome,
  };
}
