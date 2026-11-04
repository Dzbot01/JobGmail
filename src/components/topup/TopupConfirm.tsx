import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { TripayChannel, channelMax, channelMin, createTopup, customerFee, fetchChannels, formatRp, QUICK_TOPUP } from '../../lib/tripay';

interface Props {
  userId: string;
  userEmail: string;
  username: string;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

const CACHE_KEY = 'jg_tripay_channels';

const TopupConfirm: React.FC<Props> = ({ userId, userEmail, username, showAlert }) => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<TripayChannel | null>(() => {
    try { return (JSON.parse(sessionStorage.getItem(CACHE_KEY) || '[]') as TripayChannel[]).find(c => c.code === code) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(!channel);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (channel) return;
    fetchChannels()
      .then(list => setChannel(list.find(c => c.code === code) || null))
      .catch(() => setChannel(null))
      .finally(() => setLoading(false));
  }, [code, channel]);

  if (loading) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={24} /></div>;
  if (!channel) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/topup')} className="flex items-center gap-2 text-sm font-bold text-gray-600"><ArrowLeft size={18} /> Top Up</button>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center text-sm font-bold text-orange-700">Channel pembayaran tidak ditemukan atau sedang tidak aktif.</div>
      </div>
    );
  }

  const min = channelMin(channel);
  const max = channelMax(channel);
  const value = parseInt(amount) || 0;
  const fee = value ? customerFee(channel, value) : 0;
  const invalid = value > 0 && (value < min || value > max);
  const quick = QUICK_TOPUP.filter(v => v <= max);

  const confirm = async () => {
    if (!value || invalid) {
      showAlert('Nominal Tidak Valid', `Masukkan nominal antara ${formatRp(min)} - ${formatRp(max)}.`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const tx = await createTopup({ userId, email: userEmail, name: username, channel, amount: value });
      try { sessionStorage.setItem(`jg_tx_${tx.reference}`, JSON.stringify(tx)); } catch { /* abaikan */ }
      navigate(`/topup/pay/${encodeURIComponent(tx.reference)}`);
    } catch (e: any) {
      showAlert('Gagal!', e?.message || 'Gagal membuat transaksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <button onClick={() => navigate('/topup')} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-blue-600"><ArrowLeft size={18} /> Pilih channel lain</button>

      <div className="lg:max-w-3xl space-y-5">
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 flex items-center gap-4">
          <span className="w-16 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {channel.icon_url ? <img src={channel.icon_url} alt="" className="max-w-full max-h-full object-contain" /> : <Wallet className="text-gray-400" size={18} />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Konfirmasi Top Up</p>
            <h2 className="text-lg font-black text-gray-800 truncate">{channel.name}</h2>
            <p className="text-[11px] text-gray-400">{channel.group} · Min. {formatRp(min)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100 space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Pilih Nominal Cepat</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quick.map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  disabled={v < min}
                  className={`py-3 rounded-xl border text-sm font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${value === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-emerald-300'}`}
                >
                  {formatRp(v)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="topup-amount" className="block text-xs font-bold text-gray-400 uppercase mb-2">Atau Masukkan Nominal</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rp</span>
              <input
                id="topup-amount"
                type="tel"
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder={min.toLocaleString('id-ID')}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border outline-none font-bold text-lg focus:bg-white ${invalid ? 'border-red-300' : 'border-gray-100 focus:border-emerald-400'}`}
              />
            </div>
            {invalid && <p className="text-[11px] text-red-500 font-bold mt-1.5">Nominal harus antara {formatRp(min)} - {formatRp(max)}.</p>}
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Nominal top up</span><span className="font-bold">{formatRp(value)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Biaya layanan</span><span className="font-bold">{formatRp(fee)}</span></div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between"><span className="font-bold text-gray-700">Total bayar</span><span className="font-black text-emerald-600 text-base">{formatRp(value + fee)}</span></div>
            <p className="text-[10px] text-gray-400">Saldo yang masuk: {formatRp(value)}. Biaya akhir mengikuti tagihan Tripay.</p>
          </div>

          <button
            onClick={confirm}
            disabled={submitting || !value || invalid}
            className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopupConfirm;
