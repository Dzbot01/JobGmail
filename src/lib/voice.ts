import { useSyncExternalStore } from 'react';

/**
 * Pemutar suara + subtitle untuk header dashboard (sambutan, pengingat tiket, dst).
 *
 * - SATU antrean & SATU elemen audio per pemuatan halaman → suara tidak mungkin dobel,
 *   walau komponen dipasang ulang (StrictMode / App memuat ulang sesi).
 * - Klip berupa file audio (dengan waktu mulai tiap kalimat) atau suara sintesis browser
 *   (Web Speech API, bahasa Indonesia) bila belum ada rekamannya.
 * - Autoplay dicoba langsung. Bila browser memblokir, klip diputar pada sentuhan/klik/tombol
 *   PERTAMA di mana saja (tanpa tombol khusus).
 */

export interface VoiceSentence { text: string; /** detik mulai, hanya untuk klip audio */ start?: number }

export interface VoiceClip {
  id: string;
  /** Label kecil di atas subtitle, mis. "Sambutan" */
  label: string;
  sentences: VoiceSentence[];
  /** URL file audio. Bila kosong → suara sintesis (TTS) bahasa Indonesia. */
  src?: string;
  /** Tautan opsional di bawah subtitle (bukan tombol pemutar) */
  action?: { label: string; to: string };
  /** Dipanggil sekali saat klip selesai, dilewati, atau dibatalkan */
  onDone?: () => void;
}

export type VoicePhase = 'idle' | 'blocked' | 'playing' | 'done';

interface State { clip: VoiceClip | null; phase: VoicePhase; index: number }

/** Bila autoplay diblokir dan user tidak berinteraksi selama ini, klip dibatalkan. */
const GIVE_UP_MS = 30000;
/** TTS dianggap diblokir bila tidak mulai dalam waktu ini (iOS tidak memberi error). */
const TTS_START_TIMEOUT_MS = 1500;
/** Event yang dihitung browser sebagai aktivasi user (pointerdown sentuhan TIDAK termasuk). */
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

let state: State = { clip: null, phase: 'idle', index: 0 };
const listeners = new Set<() => void>();
const setState = (patch: Partial<State>) => {
  const next = { ...state, ...patch };
  if (next.clip === state.clip && next.phase === state.phase && next.index === state.index) return;
  state = next;
  listeners.forEach(l => l());
};

const queue: VoiceClip[] = [];
const known = new Set<string>(); // id klip yang sudah diantrekan/diputar di halaman ini
let audio: HTMLAudioElement | null = null;
let raf = 0;
let giveUpTimer: ReturnType<typeof setTimeout> | undefined;
let ttsWatchdog: ReturnType<typeof setTimeout> | undefined;
let ttsToken = 0;

const hasWindow = () => typeof window !== 'undefined';

// ---------- Indeks kalimat untuk klip audio ----------
export function sentenceIndexAt(sentences: VoiceSentence[], t: number) {
  let idx = 0;
  for (let i = 0; i < sentences.length; i++) if (t >= (sentences[i].start ?? 0)) idx = i;
  return idx;
}

// ---------- Pembuka kunci autoplay ----------
function onUnlock(e: Event) {
  // Tombol "Lewati" tidak ikut memulai suara
  if ((e.target as Element | null)?.closest?.('[data-voice-skip]')) return;
  attemptPlay(true);
}
const addUnlock = () => UNLOCK_EVENTS.forEach(ev => window.addEventListener(ev, onUnlock, { capture: true, passive: true }));
const removeUnlock = () => UNLOCK_EVENTS.forEach(ev => window.removeEventListener(ev, onUnlock, true));

function markPlaying() {
  removeUnlock();
  if (giveUpTimer) clearTimeout(giveUpTimer);
  setState({ phase: 'playing' });
}

// ---------- Audio ----------
function getAudio() {
  if (audio) return audio;
  const a = new Audio();
  a.preload = 'auto';
  a.addEventListener('playing', () => {
    markPlaying();
    cancelAnimationFrame(raf);
    const tick = () => {
      if (!state.clip) return;
      setState({ index: sentenceIndexAt(state.clip.sentences, a.currentTime) });
      if (!a.paused && !a.ended) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  a.addEventListener('timeupdate', () => { if (state.clip?.src) setState({ index: sentenceIndexAt(state.clip.sentences, a.currentTime) }); });
  a.addEventListener('ended', () => finish());
  a.addEventListener('error', () => { if (state.clip?.src) finish(); });
  audio = a;
  return a;
}

// ---------- TTS (Web Speech API) ----------
function pickIndonesianVoice(): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  return voices.find(v => /^id([-_]|$)/i.test(v.lang)) || voices.find(v => /indonesia/i.test(v.name)) || null;
}

function speakFrom(i: number, token: number, fromGesture = false) {
  const clip = state.clip;
  const synth = hasWindow() ? window.speechSynthesis : undefined;
  if (!clip || !synth || token !== ttsToken) return;
  if (i >= clip.sentences.length) { finish(); return; }
  const u = new SpeechSynthesisUtterance(clip.sentences[i].text);
  u.lang = 'id-ID';
  try { const v = pickIndonesianVoice(); if (v) u.voice = v; } catch { /* pakai suara default bahasa id-ID */ }
  u.rate = 1;
  u.pitch = 1.15;
  u.onstart = () => {
    if (token !== ttsToken) return;
    if (ttsWatchdog) clearTimeout(ttsWatchdog);
    if (state.phase !== 'playing') markPlaying();
    setState({ index: i });
  };
  u.onend = () => { if (token === ttsToken) speakFrom(i + 1, token); };
  u.onerror = (e: SpeechSynthesisErrorEvent) => {
    if (token !== ttsToken) return;
    if (e.error === 'not-allowed') { setState({ phase: 'blocked' }); return; }
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    finish();
  };
  if (i === 0) {
    if (ttsWatchdog) clearTimeout(ttsWatchdog);
    ttsWatchdog = setTimeout(() => {
      if (token !== ttsToken || state.phase === 'playing') return;
      synth.cancel();
      // Sudah ada interaksi tapi tetap tidak bersuara → perangkat tanpa mesin suara: subtitle saja.
      // Belum ada interaksi → diblokir diam-diam (iOS): tunggu sentuhan berikutnya.
      if (fromGesture) { removeUnlock(); silentPlayback(); } else setState({ phase: 'blocked' });
    }, TTS_START_TIMEOUT_MS);
  }
  try { synth.speak(u); } catch { finish(); }
}

/** Tanpa dukungan suara: tampilkan subtitle bergantian sesuai panjang kalimat. */
function silentPlayback() {
  const clip = state.clip;
  if (!clip) return;
  markPlaying();
  let i = 0;
  const step = () => {
    if (state.clip !== clip) return;
    if (i >= clip.sentences.length) { finish(); return; }
    setState({ index: i });
    const ms = Math.max(2200, clip.sentences[i].text.length * 70);
    i++;
    giveUpTimer = setTimeout(step, ms);
  };
  step();
}

// ---------- Kendali antrean ----------
function attemptPlay(fromGesture = false) {
  // Error API suara tidak boleh merusak halaman: klip dilewati saja
  try { attemptPlayUnsafe(fromGesture); } catch { finish(); }
}

function attemptPlayUnsafe(fromGesture: boolean) {
  const clip = state.clip;
  if (!clip || state.phase === 'playing' || state.phase === 'done') return;
  if (clip.src) {
    const a = getAudio();
    if (!a.paused) return;
    a.play().catch(() => { if (state.clip === clip && state.phase !== 'done' && a.paused) setState({ phase: 'blocked' }); });
    return;
  }
  const synth = hasWindow() ? window.speechSynthesis : undefined;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { removeUnlock(); silentPlayback(); return; }
  // Perangkat tanpa suara bahasa Indonesia sama sekali → subtitle saja (hindari logat asing)
  if (synth.getVoices().length > 0 && !pickIndonesianVoice()) { removeUnlock(); silentPlayback(); return; }
  synth.cancel();
  const token = ++ttsToken;
  speakFrom(0, token, fromGesture);
}

function startClip(clip: VoiceClip) {
  setState({ clip, phase: 'idle', index: 0 });
  addUnlock();
  if (giveUpTimer) clearTimeout(giveUpTimer);
  giveUpTimer = setTimeout(() => { if (state.clip === clip && state.phase !== 'playing') finish(); }, GIVE_UP_MS);
  if (clip.src) {
    const a = getAudio();
    if (a.getAttribute('src') !== clip.src) a.src = clip.src;
    a.currentTime = 0;
  }
  attemptPlay();
}

function finish() {
  const clip = state.clip;
  if (!clip || state.phase === 'done') return;
  cancelAnimationFrame(raf);
  removeUnlock();
  if (giveUpTimer) clearTimeout(giveUpTimer);
  if (ttsWatchdog) clearTimeout(ttsWatchdog);
  ttsToken++;
  if (audio && !audio.paused) audio.pause();
  if (hasWindow() && window.speechSynthesis && !clip.src) window.speechSynthesis.cancel();
  setState({ phase: 'done' });
  try { clip.onDone?.(); } catch { /* abaikan */ }
  // Jeda singkat agar teks kembali halus, lalu klip berikutnya
  setTimeout(() => {
    if (state.clip !== clip) return;
    const next = queue.shift();
    if (next) startClip(next);
    else setState({ clip: null, phase: 'idle', index: 0 });
  }, 600);
}

/** Masukkan klip ke antrean (id yang sama hanya sekali per pemuatan halaman). */
export function enqueueVoice(clip: VoiceClip) {
  if (!hasWindow() || known.has(clip.id)) return;
  known.add(clip.id);
  try {
    if (!state.clip) startClip(clip);
    else queue.push(clip);
  } catch {
    finish();
  }
}

export const skipVoice = () => finish();
export const isVoiceKnown = (id: string) => known.has(id);

/** Untuk pengujian. */
export function __resetVoiceForTest() {
  queue.length = 0;
  known.clear();
  if (state.clip) finish();
  state = { clip: null, phase: 'idle', index: 0 };
  listeners.forEach(l => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

/** Status klip yang sedang tampil di header. */
export function useVoice() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const sentence = s.clip?.sentences[s.index]?.text || '';
  return { clip: s.clip, phase: s.phase, index: s.index, sentence, skip: skipVoice };
}

// Muat daftar suara lebih awal (Chrome mengisi getVoices() secara asinkron)
if (hasWindow() && window.speechSynthesis) {
  try { window.speechSynthesis.getVoices(); } catch { /* abaikan */ }
}
