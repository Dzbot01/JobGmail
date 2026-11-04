import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';

/** Mode akun: Pekerja (mengerjakan pekerjaan) atau Pencari Pekerja (membuat pekerjaan). */
export type AccountMode = 'pekerja' | 'pencari';

const KEY = 'jg_mode';
const EVENT = 'jg-mode-change';

const readLocal = (): AccountMode => {
  try { return localStorage.getItem(KEY) === 'pencari' ? 'pencari' : 'pekerja'; } catch { return 'pekerja'; }
};

/**
 * Disimpan di kolom `pengguna.mode_akun` (sumber kebenaran) dan di-cache di localStorage
 * agar langsung tersedia saat halaman dibuka. Jika kolom belum dimigrasi, tetap berjalan via localStorage.
 */
export function useAccountMode(userId: string) {
  const [mode, setModeState] = useState<AccountMode>(readLocal);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onChange = () => setModeState(readLocal());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase.from('pengguna').select('mode_akun').eq('id', userId).single().then(({ data, error }) => {
      if (!alive || error || !data?.mode_akun) return;
      const m: AccountMode = data.mode_akun === 'pencari' ? 'pencari' : 'pekerja';
      try { localStorage.setItem(KEY, m); } catch { /* abaikan */ }
      setModeState(m);
    });
    return () => { alive = false; };
  }, [userId]);

  const setMode = useCallback(async (m: AccountMode) => {
    setModeState(m);
    try { localStorage.setItem(KEY, m); } catch { /* abaikan */ }
    window.dispatchEvent(new Event(EVENT));
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from('pengguna').update({ mode_akun: m }).eq('id', userId);
    setSaving(false);
    if (error) console.warn('Mode akun hanya tersimpan di perangkat ini:', error.message);
  }, [userId]);

  return { mode, setMode, saving };
}
