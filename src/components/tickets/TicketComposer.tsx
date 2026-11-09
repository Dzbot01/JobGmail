import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Send, X } from 'lucide-react';
import { MAX_WORDS, countWords, validateTicketMessage } from '../../lib/tickets';

interface Props {
  /** Kembalikan true bila terkirim (form dikosongkan). */
  onSubmit: (body: string, image: File | null) => Promise<boolean>;
  disabled?: boolean;
  disabledText?: string;
  placeholder?: string;
  submitLabel?: string;
  rows?: number;
  autoFocus?: boolean;
}

/** Form pesan tiket: teks (maks 200 kata, filter kata kasar) + 1 gambar opsional. */
const TicketComposer: React.FC<Props> = ({ onSubmit, disabled, disabledText, placeholder = 'Tulis pesan...', submitLabel = 'Kirim', rows = 3, autoFocus }) => {
  const [body, setBody] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) { setPreview(''); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const words = countWords(body);
  const over = words > MAX_WORDS;

  const pickImage = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setError('Format gambar harus JPG, PNG, atau WEBP'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('Ukuran gambar terlalu besar (maks 10 MB sebelum dikompres)'); return; }
    setError('');
    setImage(f);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || sending) return;
    const msg = validateTicketMessage(body, !!image);
    if (msg) { setError(msg); return; }
    setError('');
    setSending(true);
    try {
      const ok = await onSubmit(body, image);
      if (ok) {
        setBody('');
        setImage(null);
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally {
      setSending(false);
    }
  };

  if (disabled) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-bold text-amber-700 text-center">
        {disabledText || 'Tidak bisa mengirim pesan saat ini.'}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="Lampiran" className="h-24 rounded-xl border border-gray-200 object-cover" />
          <button type="button" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center" aria-label="Hapus gambar">
            <X size={12} />
          </button>
        </div>
      )}
      <textarea
        value={body}
        onChange={e => { setBody(e.target.value); if (error) setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Pesan"
        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border text-sm outline-none focus:bg-white resize-none ${over || error ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-blue-400'}`}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pickImage(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50">
            <ImagePlus size={15} /> Gambar
          </button>
          <span className={`text-[10px] font-bold ${over ? 'text-red-500' : 'text-gray-400'}`}>{words}/{MAX_WORDS} kata</span>
        </div>
        <button type="submit" disabled={sending || over}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-50">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {submitLabel}
        </button>
      </div>
      {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}
    </form>
  );
};

export default TicketComposer;
