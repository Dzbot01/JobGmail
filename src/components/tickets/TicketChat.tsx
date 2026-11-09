import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, ShieldCheck, User as UserIcon } from 'lucide-react';
import TicketComposer from './TicketComposer';
import {
  STATUS_LABEL, Ticket, TicketMessage, getTicket, listMessages, sendTicketMessage, subscribeTicket,
  ticketsErrorMessage, uploadTicketImage,
} from '../../lib/tickets';
import { formatDateLongWIB, formatTimeWIB, formatWIB } from '../../lib/datetime';

interface Props {
  viewer: 'user' | 'admin';
  userId: string;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

const POLL_MS = 15000;

/** Ruang chat satu tiket (dipakai user & admin). Admin membalas → status "Dibalas". */
const TicketChat: React.FC<Props> = ({ viewer, userId, showAlert }) => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const backTo = viewer === 'admin' ? '/admin/tiket' : '/tiket';
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const [t, m] = await Promise.all([getTicket(id), listMessages(id)]);
      setTicket(t);
      setMessages(m);
      setError('');
    } catch (e) {
      if (!silent) setError(ticketsErrorMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const stop = subscribeTicket(id, () => load(true));
    const timer = setInterval(() => load(true), POLL_MS); // cadangan bila realtime tidak aktif
    return () => { stop(); clearInterval(timer); };
  }, [id, load]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  const send = async (body: string, image: File | null) => {
    try {
      const url = image ? await uploadTicketImage(userId, image) : null;
      const msg = await sendTicketMessage(id, body, url);
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
      setTicket(t => (t ? { ...t, status: viewer === 'admin' ? 'dibalas' : 'pending', updated_at: new Date().toISOString() } : t));
      return true;
    } catch (e) {
      showAlert('Gagal!', ticketsErrorMessage(e), 'error');
      return false;
    }
  };

  if (loading) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={24} /></div>;
  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backTo)} className="flex items-center gap-2 text-sm font-bold text-gray-500"><ArrowLeft size={16} /> Kembali</button>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center text-sm font-bold text-orange-700">{error || 'Tiket tidak ditemukan'}</div>
      </div>
    );
  }

  const st = STATUS_LABEL[ticket.status] || STATUS_LABEL.pending;
  const userLocked = viewer === 'user' && ticket.status === 'pending';

  // Kelompokkan per hari (WIB)
  let lastDay = '';

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(backTo)} className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-600 flex-shrink-0" aria-label="Kembali">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          {viewer === 'admin' && <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Balas Tiket</p>}
          <h2 className="text-lg font-black text-gray-800 truncate leading-tight">{viewer === 'admin' ? ticket.user_name || ticket.user_email : 'Tiket Bantuan'}</h2>
          {viewer === 'admin' && <p className="text-[11px] text-gray-400 truncate">{ticket.user_email}</p>}
          <p className="text-[11px] text-gray-400 truncate">Dibuat {formatWIB(ticket.created_at)}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex-shrink-0 ${st.cls}`}>{st.label}</span>
        <button onClick={() => load()} className="p-2 text-gray-400 hover:text-blue-600 flex-shrink-0" aria-label="Muat ulang"><RefreshCw size={16} /></button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 space-y-3 max-h-[calc(100vh-var(--header-h,65px)-22rem)] min-h-[16rem] overflow-y-auto bg-gray-50/60" aria-live="polite">
          {messages.map(m => {
            const mine = m.sender_role === viewer;
            const day = formatDateLongWIB(m.created_at);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <React.Fragment key={m.id}>
                {showDay && <p className="text-center text-[10px] font-bold text-gray-400 py-1">{day}</p>}
                <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.sender_role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {m.sender_role === 'admin' ? <ShieldCheck size={14} /> : <UserIcon size={14} />}
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'}`}>
                    <p className={`text-[10px] font-black mb-0.5 ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                      {m.sender_role === 'admin' ? 'Admin' : ticket.user_name}
                    </p>
                    {m.image_url && (
                      <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                        <img src={m.image_url} alt="Lampiran" className="rounded-xl max-h-60 w-auto object-contain bg-white" loading="lazy" />
                      </a>
                    )}
                    {m.body && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>}
                    <p className={`text-[9px] mt-1 text-right ${mine ? 'text-white/70' : 'text-gray-400'}`}>{formatTimeWIB(m.created_at)} WIB</p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="p-4 border-t border-gray-100">
          <TicketComposer
            onSubmit={send}
            disabled={userLocked}
            disabledText="Tiket sedang pending. Kamu bisa menambah pesan setelah admin membalas."
            placeholder={viewer === 'admin' ? 'Tulis balasan untuk user...' : 'Tulis pesan tambahan...'}
            submitLabel={viewer === 'admin' ? 'Balas' : 'Kirim'}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketChat;
