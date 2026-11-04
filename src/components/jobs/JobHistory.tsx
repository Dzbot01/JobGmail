import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, Clock, CheckCircle2, XCircle, Hourglass, RefreshCw } from 'lucide-react';
import { HISTORY_LIMIT, JobSubmission, MySubmission, countMySubmissions, formatRupiah, jobsErrorMessage, listMySubmissions } from '../../lib/jobs';

type Filter = 'all' | JobSubmission['status'];

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'process', label: 'Proses' },
  { key: 'paid', label: 'Diterima' },
  { key: 'rejected', label: 'Ditolak' },
];

const STATUS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  process: { label: 'Proses', cls: 'bg-orange-100 text-orange-600', icon: <Clock size={12} /> },
  paid: { label: 'Diterima', cls: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={12} /> },
  rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-600', icon: <XCircle size={12} /> },
};

interface Props {
  userId: string;
  /** Saldo pending dari pekerjaan yang masih direview */
  pendingAmount: number;
  pendingCount: number;
  onRefresh?: () => void;
}

/** Riwayat pekerjaan milik pekerja (maks. 10 terbaru) + ringkasan saldo pending. */
const JobHistory: React.FC<Props> = ({ userId, pendingAmount, pendingCount, onRefresh }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<MySubmission[]>([]);
  const [counts, setCounts] = useState({ process: 0, paid: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (f: Filter = filter) => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const [list, c] = await Promise.all([listMySubmissions(userId, f === 'all' ? undefined : f), countMySubmissions(userId)]);
      setItems(list);
      setCounts(c);
    } catch (e) {
      setError(jobsErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId, filter]);

  const countFor = (f: Filter) => (f === 'all' ? counts.total : counts[f]);
  const totalForFilter = countFor(filter);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History size={18} className="text-blue-600" />
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">Riwayat Pekerjaan</h3>
        </div>
        <button onClick={() => { load(); onRefresh?.(); }} className="p-1.5 text-gray-400 hover:text-blue-600" aria-label="Muat ulang">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Saldo pending */}
      <div className="mx-5 mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0"><Hourglass size={18} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Saldo Pending</p>
          <p className="text-lg font-black text-amber-700 leading-tight">{formatRupiah(pendingAmount)}</p>
        </div>
        <p className="text-[10px] text-amber-700/80 text-right leading-snug max-w-[45%]">
          {pendingCount} pekerjaan menunggu review. Masuk ke saldo saat diterima, hilang jika ditolak.
        </p>
      </div>

      {/* Filter */}
      <div className="px-5 flex flex-wrap gap-2 pb-1" role="tablist" aria-label="Filter status">
        {FILTERS.map(f => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${filter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
          >
            {f.label} <span className={filter === f.key ? 'text-white/80' : 'text-gray-400'}>({countFor(f.key)})</span>
          </button>
        ))}
      </div>

      <div className="p-5 pt-3 space-y-2">
        {loading ? (
          <div className="py-8 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
        ) : error ? (
          <p className="text-xs font-bold text-orange-600 text-center py-6">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-xs font-bold text-gray-400 text-center py-6">Belum ada pekerjaan{filter !== 'all' ? ' dengan status ini' : ''}.</p>
        ) : (
          items.map(it => {
            const st = STATUS[it.status] || STATUS.process;
            return (
              <button
                key={it.id}
                onClick={() => navigate(`/jobs/${it.job_id}`)}
                className="w-full text-left rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 p-3 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-800 truncate">{it.jobs?.title || 'Pekerjaan dihapus'}</p>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${st.cls}`}>{st.icon}{st.label}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">{new Date(it.created_at).toLocaleString('id-ID')}</span>
                  <span className={`font-black ${it.status === 'paid' ? 'text-emerald-600' : it.status === 'rejected' ? 'text-gray-400 line-through' : 'text-amber-600'}`}>
                    {it.status === 'process' ? 'Pending ' : it.status === 'paid' ? '+' : ''}{formatRupiah(it.jobs?.reward || 0)}
                  </span>
                </div>
                {it.status === 'rejected' && it.reason && <p className="text-[11px] text-red-500 font-bold">Alasan: {it.reason}</p>}
              </button>
            );
          })
        )}
        {!loading && totalForFilter > HISTORY_LIMIT && (
          <p className="text-[10px] text-gray-400 text-center pt-1">Menampilkan {HISTORY_LIMIT} terbaru dari {totalForFilter} data.</p>
        )}
      </div>
    </div>
  );
};

export default JobHistory;
