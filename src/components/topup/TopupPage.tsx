import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Loader2, RefreshCw, ChevronRight, Wallet, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { TopupRow, TripayChannel, claimTopup, fetchChannels, formatRp, listMyTopups, MIN_TOPUP, topupErrorMessage, channelMin } from '../../lib/tripay';

interface Props {
  userId: string;
  balance: number;
  onBalanceChange: () => void;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

const CACHE_KEY = 'jg_tripay_channels';

const statusBadge: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
  UNPAID: { cls: 'bg-orange-100 text-orange-600', icon: <Clock size={12} />, label: 'Menunggu' },
  PAID: { cls: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={12} />, label: 'Berhasil' },
  EXPIRED: { cls: 'bg-gray-100 text-gray-500', icon: <XCircle size={12} />, label: 'Kedaluwarsa' },
  FAILED: { cls: 'bg-red-100 text-red-600', icon: <XCircle size={12} />, label: 'Gagal' },
  REFUND: { cls: 'bg-blue-100 text-blue-600', icon: <XCircle size={12} />, label: 'Refund' },
};

const TopupPage: React.FC<Props> = ({ userId, balance, onBalanceChange, showAlert }) => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<TripayChannel[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
  });
  const [loading, setLoading] = useState(channels.length === 0);
  const [error, setError] = useState('');
  const [topups, setTopups] = useState<TopupRow[]>([]);

  const loadChannels = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchChannels();
      setChannels(list);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch { /* abaikan */ }
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat channel pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const loadTopups = async () => {
    if (!userId) return;
    try {
      const rows = await listMyTopups(userId);
      setTopups(rows);
      // Klaim otomatis transaksi yang mungkin sudah dibayar saat halaman ditutup
      const pending = rows.filter(r => r.status === 'UNPAID' && r.reference);
      let credited = false;
      for (const r of pending) {
        try {
          const res = await claimTopup(r.reference!);
          if (res.credited) {
            credited = true;
            showAlert('Top Up Berhasil!', `${formatRp(res.amount || r.amount)} masuk ke saldo kamu.`, 'success');
          }
        } catch { /* biarkan, dicoba lagi nanti */ }
      }
      if (pending.length) setTopups(await listMyTopups(userId));
      if (credited) onBalanceChange();
    } catch (e) {
      console.warn(topupErrorMessage(e));
    }
  };

  useEffect(() => { loadChannels(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { loadTopups(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const groups = useMemo(() => {
    const map = new Map<string, TripayChannel[]>();
    channels.forEach(c => { const g = c.group || 'Lainnya'; map.set(g, [...(map.get(g) || []), c]); });
    return [...map.entries()];
  }, [channels]);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
          <PlusCircle size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-800">Top Up Saldo</h2>
          <p className="text-[11px] text-gray-400 font-medium">Pilih channel pembayaran</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Saat Ini</p>
          <p className="text-2xl font-black">{formatRp(balance)}</p>
        </div>
        <Wallet size={32} className="opacity-60" />
      </div>

      <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        {/* Channel pembayaran */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Channel Pembayaran</h3>
            <button onClick={loadChannels} className="p-1.5 text-gray-400 hover:text-blue-600" aria-label="Muat ulang"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
          </div>
          {loading && channels.length === 0 ? (
            <div className="py-16 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
          ) : error && channels.length === 0 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center text-sm font-bold text-orange-700">{error}</div>
          ) : (
            groups.map(([group, list]) => (
              <div key={group} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <p className="px-4 pt-4 pb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">{group}</p>
                <div className="divide-y divide-gray-50">
                  {list.map(ch => (
                    <button
                      key={ch.code}
                      onClick={() => navigate(`/topup/${encodeURIComponent(ch.code)}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="w-14 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {ch.icon_url ? <img src={ch.icon_url} alt="" className="max-w-full max-h-full object-contain" /> : <Wallet size={16} className="text-gray-400" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-gray-800 truncate">{ch.name}</span>
                        <span className="block text-[10px] text-gray-400">
                          Min. {formatRp(channelMin(ch))}
                          {ch.fee_customer && (ch.fee_customer.flat || ch.fee_customer.percent)
                            ? ` · Biaya ${ch.fee_customer.flat ? formatRp(ch.fee_customer.flat) : ''}${ch.fee_customer.flat && ch.fee_customer.percent ? ' + ' : ''}${ch.fee_customer.percent ? `${ch.fee_customer.percent}%` : ''}`
                            : ' · Tanpa biaya'}
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
          <p className="text-[10px] text-gray-400 px-1">Minimal top up {formatRp(MIN_TOPUP)}. Saldo masuk otomatis setelah pembayaran terverifikasi.</p>
        </div>

        {/* Riwayat */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 px-1">Riwayat Top Up</h3>
          {topups.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs font-bold text-gray-400 border border-gray-100">Belum ada top up.</div>
          ) : (
            topups.map(t => {
              const b = statusBadge[t.status] || statusBadge.UNPAID;
              return (
                <button
                  key={t.id}
                  disabled={!t.reference}
                  onClick={() => t.reference && navigate(`/topup/pay/${encodeURIComponent(t.reference)}`)}
                  className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-gray-800">{formatRp(t.amount)}</span>
                    <span className="block text-[10px] text-gray-400 truncate">{t.method_name || t.method} · {new Date(t.created_at).toLocaleString('id-ID')}</span>
                  </span>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${b.cls}`}>{b.icon}{b.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TopupPage;
