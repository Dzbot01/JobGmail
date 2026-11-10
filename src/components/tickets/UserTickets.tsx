import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, Loader2, Plus, RefreshCw, X, ChevronRight, Clock } from 'lucide-react';
import TicketComposer from './TicketComposer';
import { STATUS_LABEL, Ticket, createTicket, firstLine, listMyTickets, ticketsErrorMessage, uploadTicketImage } from '../../lib/tickets';
import { formatWIB } from '../../lib/datetime';
import { isTicketUnread } from '../../lib/ticketNotify';

interface Props {
  userId: string;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

/** Halaman Tiket Bantuan milik user: daftar tiket + modal buat tiket baru. */
const UserTickets: React.FC<Props> = ({ userId, showAlert }) => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setTickets(await listMyTickets(userId));
      setError('');
    } catch (e) {
      setError(ticketsErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const pending = tickets.find(t => t.status === 'pending');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = async (body: string, image: File | null) => {
    try {
      const url = image ? await uploadTicketImage(userId, image) : null;
      const t = await createTicket(body, url);
      setTickets(prev => [t, ...prev]);
      setOpen(false);
      showAlert('Tiket Terkirim!', 'Tiket kamu berstatus pending. Admin akan segera membalas.');
      return true;
    } catch (e) {
      showAlert('Gagal!', ticketsErrorMessage(e), 'error');
      return false;
    }
  };

  return (
    <div className="space-y-5 pb-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0"><LifeBuoy size={20} /></div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-800">Tiket Bantuan</h2>
            <p className="text-[11px] text-gray-400 font-medium">Ada kendala? Kirim tiket, admin akan membalas di sini.</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-blue-600 flex-shrink-0" aria-label="Muat ulang"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <button
        onClick={() => setOpen(true)}
        disabled={!!pending || !!error}
        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none"
      >
        <Plus size={18} /> Buat Tiket Baru
      </button>
      {pending && (
        <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <Clock size={14} className="flex-shrink-0" /> Kamu masih punya tiket pending. Tiket baru bisa dibuat setelah admin membalas.
        </p>
      )}

      {loading ? (
        <div className="py-12 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
      ) : error ? (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center text-sm font-bold text-orange-700">{error}</div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
          <LifeBuoy className="mx-auto text-gray-300 mb-2" size={28} />
          <p className="text-xs font-bold text-gray-400">Belum ada tiket.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tickets.map(t => {
            const st = STATUS_LABEL[t.status] || STATUS_LABEL.pending;
            const unread = isTicketUnread(t);
            return (
              <button key={t.id} onClick={() => navigate(`/tiket/${t.id}`)}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-md border flex items-center gap-3 hover:shadow-lg transition-shadow ${unread ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-100'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${st.cls}`}>{st.label}</span>
                    {unread && <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-black uppercase">Balasan baru</span>}
                    <span className="text-[10px] text-gray-400 truncate">{formatWIB(t.created_at)}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-700 truncate mt-1.5">{firstLine(t.first_message)}</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="new-ticket-title"
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 id="new-ticket-title" className="text-lg font-black text-gray-800">Buat Tiket Baru</h3>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full bg-gray-100 text-gray-500" aria-label="Tutup"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-500">Jelaskan kendalamu (maks. 200 kata). Kamu bisa melampirkan 1 gambar/screenshot. Gunakan bahasa yang sopan.</p>
            <TicketComposer onSubmit={submit} placeholder="Contoh: Setoran saya kemarin belum diproses..." submitLabel="Kirim Tiket" rows={6} autoFocus />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTickets;
