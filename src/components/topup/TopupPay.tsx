import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, ExternalLink, Loader2, RefreshCw, CheckCircle2, Clock, XCircle, ChevronDown } from 'lucide-react';
import { TripayTransaction, claimTopupAndNotify, fetchTransaction, formatRp } from '../../lib/tripay';

interface Props {
  userEmail: string;
  onBalanceChange: () => void;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

const POLL_MS = 10000;

const TopupPay: React.FC<Props> = ({ userEmail, onBalanceChange, showAlert }) => {
  const { reference = '' } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState<TripayTransaction | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(`jg_tx_${reference}`) || 'null'); } catch { return null; }
  });
  const [status, setStatus] = useState<string>(tx?.status || 'UNPAID');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [openStep, setOpenStep] = useState(0);
  const creditedRef = useRef(false);

  const check = useCallback(async (manual = false) => {
    setChecking(true);
    try {
      const fresh = await fetchTransaction(reference);
      setTx(prev => ({ ...(prev || {} as TripayTransaction), ...fresh }));
      const st = String(fresh.status || '').toUpperCase();
      setStatus(st);
      setError('');
      if (st === 'PAID' && !creditedRef.current) {
        // Database memverifikasi ulang ke Tripay sebelum menambah saldo
        const deposit = fresh.order_items?.reduce((s, it) => s + it.price * (it.quantity || 1), 0) ?? 0;
        const res = await claimTopupAndNotify(reference, userEmail, { amount: deposit, method: fresh.payment_name || fresh.payment_method });
        creditedRef.current = true;
        if (res.credited) showAlert('Top Up Berhasil!', `${formatRp(res.amount || 0)} sudah masuk ke saldo kamu. Bukti dikirim ke email.`, 'success');
        onBalanceChange();
      } else if (manual && st === 'UNPAID') {
        showAlert('Belum Dibayar', 'Pembayaran belum kami terima. Selesaikan pembayaran lalu cek lagi.', 'error');
      }
    } catch (e: any) {
      setError(e?.message || 'Gagal mengecek status');
      if (manual) showAlert('Gagal!', e?.message || 'Gagal mengecek status', 'error');
    } finally {
      setChecking(false);
    }
  }, [reference, userEmail, onBalanceChange, showAlert]);

  useEffect(() => { check(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reference]);

  // Cek status otomatis selama belum dibayar
  useEffect(() => {
    if (status !== 'UNPAID') return;
    const t = setInterval(() => { if (!document.hidden) check(); }, POLL_MS);
    return () => clearInterval(t);
  }, [status, check]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* abaikan */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const remaining = tx?.expired_time ? Math.max(0, tx.expired_time * 1000 - now) : 0;
  const hh = Math.floor(remaining / 3600000), mm = Math.floor((remaining % 3600000) / 60000), ss = Math.floor((remaining % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const deposit = tx?.order_items?.reduce((s, it) => s + it.price * (it.quantity || 1), 0) ?? (tx ? tx.amount - (tx.fee_customer || 0) : 0);

  const statusView = {
    PAID: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <CheckCircle2 size={18} />, text: 'Pembayaran berhasil — saldo sudah ditambahkan' },
    UNPAID: { cls: 'bg-orange-50 border-orange-200 text-orange-700', icon: <Clock size={18} />, text: 'Menunggu pembayaran' },
    EXPIRED: { cls: 'bg-gray-50 border-gray-200 text-gray-600', icon: <XCircle size={18} />, text: 'Transaksi kedaluwarsa' },
    FAILED: { cls: 'bg-red-50 border-red-200 text-red-700', icon: <XCircle size={18} />, text: 'Pembayaran gagal' },
  }[status] || { cls: 'bg-gray-50 border-gray-200 text-gray-600', icon: <Clock size={18} />, text: status };

  if (!tx && checking) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={24} /></div>;

  return (
    <div className="space-y-5 pb-6">
      <button onClick={() => navigate('/topup')} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-blue-600"><ArrowLeft size={18} /> Top Up</button>

      {!tx ? (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center text-sm font-bold text-orange-700">{error || 'Transaksi tidak ditemukan.'}</div>
      ) : (
        <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
          <div className="lg:col-span-3 space-y-5">
            <div className={`rounded-2xl border p-4 flex items-center gap-3 ${statusView.cls}`}>
              {statusView.icon}
              <p className="text-sm font-bold flex-1">{statusView.text}</p>
              {status === 'UNPAID' && remaining > 0 && <span className="text-xs font-black tabular-nums">{pad(hh)}:{pad(mm)}:{pad(ss)}</span>}
            </div>

            <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Bayar</p>
                  <p className="text-2xl font-black text-gray-800">{formatRp(tx.amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Metode</p>
                  <p className="text-sm font-bold text-gray-700">{tx.payment_name || tx.payment_method}</p>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 space-y-0.5">
                <p>Saldo masuk: <b className="text-emerald-600">{formatRp(deposit)}</b>{tx.fee_customer ? ` · Biaya ${formatRp(tx.fee_customer)}` : ''}</p>
                <p>Referensi: <span className="font-mono">{tx.reference}</span></p>
              </div>

              {status === 'UNPAID' && (
                <>
                  {tx.qr_url && (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <img src={tx.qr_url} alt="QR pembayaran" className="w-56 h-56 object-contain rounded-xl border border-gray-100 bg-white p-2" />
                      <p className="text-[11px] text-gray-500">Scan QR dengan aplikasi e-wallet / m-banking</p>
                    </div>
                  )}
                  {tx.pay_code && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1.5">Kode Bayar / Nomor VA</p>
                      <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <span className="font-mono text-lg font-black text-gray-800 break-all">{tx.pay_code}</span>
                        <button onClick={() => copy(tx.pay_code!)} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-black">
                          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Tersalin' : 'Salin'}
                        </button>
                      </div>
                    </div>
                  )}
                  {(tx.checkout_url || tx.pay_url) && (
                    <a href={tx.pay_url || tx.checkout_url} target="_blank" rel="noopener noreferrer" className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                      <ExternalLink size={18} /> Bayar Sekarang
                    </a>
                  )}
                </>
              )}

              <button onClick={() => check(true)} disabled={checking} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {checking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Cek Status Pembayaran
              </button>
              {status === 'UNPAID' && <p className="text-[10px] text-gray-400 text-center">Status dicek otomatis setiap 10 detik.</p>}
            </div>
          </div>

          {status === 'UNPAID' && tx.instructions && tx.instructions.length > 0 && (
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <p className="px-5 pt-5 pb-2 text-xs font-black uppercase tracking-wider text-gray-500">Cara Pembayaran</p>
              {tx.instructions.map((ins, i) => (
                <div key={i} className="border-t border-gray-50">
                  <button onClick={() => setOpenStep(openStep === i ? -1 : i)} className="w-full px-5 py-3 flex items-center justify-between text-left text-sm font-bold text-gray-700">
                    {ins.title}
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${openStep === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openStep === i && (
                    <ol className="px-5 pb-4 space-y-1.5 list-decimal list-inside text-xs text-gray-600">
                      {ins.steps.map((s, k) => <li key={k} dangerouslySetInnerHTML={{ __html: s.replace(/<(?!\/?b>)[^>]*>/gi, '') }} />)}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TopupPay;
