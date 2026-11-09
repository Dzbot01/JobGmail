import { useEffect, useRef, useState } from 'react';

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
 * Putar sambutan sekali. Mengembalikan kalimat yang sedang diucapkan.
 * Bila autoplay diblokir browser (umum setelah redirect login), audio diputar pada interaksi pertama user.
 */
export function useWelcomeVoice(active: boolean, onDone: () => void) {
  const [phase, setPhase] = useState<WelcomePhase>('idle');
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!active) return;
    const audio = new Audio(WELCOME_AUDIO_URL);
    audio.preload = 'auto';
    audioRef.current = audio;
    let finished = false;
    let raf = 0;
    let giveUp: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      removeGesture();
      if (giveUp) clearTimeout(giveUp);
      setPhase('done');
      setTimeout(() => doneRef.current(), 400);
    };

    const tick = () => {
      setIndex(subtitleIndexAt(audio.currentTime));
      if (!audio.paused && !audio.ended) raf = requestAnimationFrame(tick);
    };

    const start = () =>
      audio.play().then(() => {
        removeGesture();
        if (giveUp) clearTimeout(giveUp);
        setPhase('playing');
        raf = requestAnimationFrame(tick);
      });

    const onGesture = () => { start().catch(() => { /* masih diblokir */ }); };
    const removeGesture = () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };

    audio.addEventListener('ended', finish);
    audio.addEventListener('error', finish);

    start().catch(() => {
      setPhase('blocked');
      window.addEventListener('pointerdown', onGesture);
      window.addEventListener('keydown', onGesture);
      giveUp = setTimeout(finish, GIVE_UP_MS);
    });

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      removeGesture();
      if (giveUp) clearTimeout(giveUp);
      audio.pause();
      audio.removeEventListener('ended', finish);
      audio.removeEventListener('error', finish);
      audioRef.current = null;
    };
  }, [active]);

  const play = () => { audioRef.current?.play().catch(() => {}); };
  const skip = () => {
    const a = audioRef.current;
    if (a) { a.pause(); a.dispatchEvent(new Event('ended')); }
    else doneRef.current();
  };

  return { phase, index, sentence: WELCOME_SUBTITLES[index]?.text || '', play, skip };
}
