import React, { useMemo, useRef, useState } from 'react';
import { History, CheckCircle2, Wallet, Mail } from 'lucide-react';
import { formatWIB, toTime } from '../../lib/datetime';

interface Props {
  submissions: any[];
  withdrawRequests: any[];
}

/** Batas data yang ditampilkan per riwayat */
export const ADMIN_HISTORY_LIMIT = 10;

type Tab = 'paid' | 'payout';

/**
 * Riwayat admin: 2 panel yang bisa di-swipe (scroll-snap) atau dipilih lewat tab.
 * - Riwayat Paid: setoran user yang sudah di-set paid (maks 10 terbaru)
 * - Riwayat Payout: request withdraw yang sudah dibayar (maks 10 terbaru)
 */
const AdminHistory: React.FC<Props> = ({ submissions, withdrawRequests }) => {
  const [tab, setTab] = useState<Tab>('paid');
  const scroller = useRef<HTMLDivElement>(null);

  const paid = useMemo(() => submissions
    .filter(s => s.status === 'paid')
    .sort((a, b) => toTime(b.paidAt || b.timestamp) - toTime(a.paidAt || a.timestamp))
    .slice(0, ADMIN_HISTORY_LIMIT), [submissions]);
  const paidTotal = useMemo(() => submissions.filter(s => s.status === 'paid').length, [submissions]);

  const payouts = useMemo(() => withdrawRequests
    .filter(w => w.status === 'paid')
    .sort((a, b) => toTime(b.paidAt || b.date) - toTime(a.paidAt || a.date))
    .slice(0, ADMIN_HISTORY_LIMIT), [withdrawRequests]);
  const payoutTotal = useMemo(() => withdrawRequests.filter(w => w.status === 'paid').length, [withdrawRequests]);

  const goTo = (t: Tab) => {
    setTab(t);
    const el = scroller.current;
    if (el) el.scrollTo({ left: t === 'paid' ? 0 : el.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const next: Tab = el.scrollLeft > el.clientWidth / 2 ? 'payout' : 'paid';
    if (next !== tab) setTab(next);
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'paid', label: 'Riwayat Paid', icon: <CheckCircle2 size={15} />, count: paidTotal },
    { key: 'payout', label: 'Riwayat Payout', icon: <Wallet size={15} />, count: payoutTotal },
  ];

  const Empty = ({ text }: { text: string }) => (
    <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center text-xs font-bold text-gray-400">{text}</div>
  );

  const More = ({ total }: { total: number }) => total > ADMIN_HISTORY_LIMIT
    ? <p className="text-[10px] text-gray-400 text-center pt-1">Menampilkan {ADMIN_HISTORY_LIMIT} terbaru dari {total} data.</p>
    : null;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><History size={20} /></div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Riwayat</h2>
          <p className="text-[11px] text-gray-400 font-medium">Geser ke kiri/kanan untuk berpindah riwayat</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-2xl" role="tablist" aria-label="Jenis riwayat">
        {TABS.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} aria-controls={`riwayat-${t.key}`} onClick={() => goTo(t.key)}
            className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
            {t.icon} {t.label} <span className={tab === t.key ? 'text-blue-400' : 'text-gray-400'}>({t.count})</span>
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* PANEL PAID */}
        <section id="riwayat-paid" role="tabpanel" aria-label="Riwayat Paid" className="w-full flex-shrink-0 snap-start px-1 space-y-3">
          {paid.length === 0 ? <Empty text="Belum ada setoran yang di-set paid" /> : (
            <div className="grid gap-3 md:grid-cols-2">
              {paid.map(s => (
                <div key={s.id} className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 flex-shrink-0"><Mail size={15} /></div>
                      <p className="text-sm font-bold text-gray-700 break-all min-w-0 pt-1">{s.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase flex-shrink-0">Paid</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Pengirim</span><span className="font-bold text-gray-700 truncate">{s.userName || (s.userEmail || '').split('@')[0] || '-'}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Email user</span><span className="font-bold text-gray-700 truncate">{s.userEmail || '-'}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Disetor</span><span className="font-bold text-gray-700">{formatWIB(s.timestamp)}</span></div>
                    {s.paidAt && <div className="flex justify-between gap-2"><span className="text-gray-400">Di-set paid</span><span className="font-bold text-gray-700">{formatWIB(s.paidAt)}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <More total={paidTotal} />
        </section>

        {/* PANEL PAYOUT */}
        <section id="riwayat-payout" role="tabpanel" aria-label="Riwayat Payout" className="w-full flex-shrink-0 snap-start px-1 space-y-3">
          {payouts.length === 0 ? <Empty text="Belum ada withdraw yang dibayar" /> : (
            <div className="grid gap-3 md:grid-cols-2">
              {payouts.map(w => (
                <div key={w.id} className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Dibayar</p>
                      <p className="text-lg font-black text-gray-800">Rp {Number(w.amount || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase">Paid</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Nama</span><span className="font-bold text-gray-700 truncate">{w.userName || (w.userEmail || '').split('@')[0] || '-'}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Metode</span><span className="font-bold text-gray-700">{w.method || 'E-Wallet'} · {w.walletNumber || '-'}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Diajukan</span><span className="font-bold text-gray-700">{formatWIB(w.date)}</span></div>
                    {w.paidAt && <div className="flex justify-between gap-2"><span className="text-gray-400">Dibayar</span><span className="font-bold text-gray-700">{formatWIB(w.paidAt)}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <More total={payoutTotal} />
        </section>
      </div>
    </div>
  );
};

export default AdminHistory;
