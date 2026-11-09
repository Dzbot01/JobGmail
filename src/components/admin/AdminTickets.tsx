import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, Loader2, RefreshCw, Search, ChevronRight } from 'lucide-react';
import { STATUS_LABEL, Ticket, TicketStatus, firstLine, listAllTickets, ticketsErrorMessage } from '../../lib/tickets';
import { formatWIB } from '../../lib/datetime';
import { supabase } from '../../supabase';

type Filter = 'all' | TicketStatus;

/** Daftar tiket semua user untuk admin. Klik kartu → halaman balas tiket. */
const AdminTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('pending');
  const [query, setQuery] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setTickets(await listAllTickets());
      setError('');
    } catch (e) {
      setError(ticketsErrorMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Tiket baru / status berubah → muat ulang tanpa spinner
    const ch = supabase
      .channel('admin-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const counts = useMemo(() => ({
    all: tickets.length,
    pending: tickets.filter(t => t.status === 'pending').length,
    dibalas: tickets.filter(t => t.status === 'dibalas').length,
  }), [tickets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets
      .filter(t => filter === 'all' || t.status === filter)
      .filter(t => !q || t.user_name.toLowerCase().includes(q) || t.user_email.toLowerCase().includes(q) || t.first_message.toLowerCase().includes(q));
  }, [tickets, filter, query]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'dibalas', label: 'Dibalas' },
    { key: 'all', label: 'Semua' },
  ];

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0"><LifeBuoy size={20} /></div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-800">Tiket Bantuan</h2>
            <p className="text-[11px] text-gray-400 font-medium">{counts.pending} tiket menunggu balasan</p>
          </div>
        </div>
        <button onClick={() => load()} className="p-2 text-gray-400 hover:text-blue-600" aria-label="Muat ulang"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="flex gap-2" role="tablist" aria-label="Filter status tiket">
          {FILTERS.map(f => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${filter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              {f.label} <span className={filter === f.key ? 'text-white/80' : 'text-gray-400'}>({counts[f.key]})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, email, atau pesan"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:border-blue-400 focus:bg-white" />
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
      ) : error ? (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center text-sm font-bold text-orange-700">{error}</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-xs font-bold text-gray-400">Tidak ada tiket.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(t => {
            const st = STATUS_LABEL[t.status] || STATUS_LABEL.pending;
            return (
              <button key={t.id} onClick={() => navigate(`/admin/tiket/${t.id}`)}
                className={`text-left bg-white rounded-2xl p-4 shadow-md border flex flex-col gap-2 hover:shadow-lg transition-shadow ${t.status === 'pending' ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                      {(t.user_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{t.user_name || t.user_email}</p>
                      <p className="text-[10px] text-gray-400 truncate">{formatWIB(t.created_at)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase flex-shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-600 truncate flex-1">{firstLine(t.first_message)}</p>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTickets;
