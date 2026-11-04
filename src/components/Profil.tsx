import React, { useState, useEffect } from 'react';
import { BadgeCheck, XCircle, Wallet, Info, ChevronRight, CheckCircle2, XCircle as XIcon, Users, CreditCard, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { Copy, Check, Gift } from 'lucide-react';
import { buildReferralLink, fetchReferralSummary, maskEmail, REFERRAL_REWARD, ReferralSummary } from '../lib/referral';

interface ProfilProps {
  tasksDone: number; // <- ini udah ga kepake tapi biarin aja biar ga error di App
  totalIncome: number; // <- ini juga
  isVerified: boolean;
  userId: string;
  onNavigateToWithdraw: () => void;
  onNavigateToAbout: () => void;
  onLogout?: () => void;
}

const Profil: React.FC<ProfilProps> = ({ isVerified, userId, onNavigateToWithdraw, onNavigateToAbout, onLogout }) => {
  const [nama, setNama] = useState('User Member');
  const [email, setEmail] = useState('Kesalahan: Harap Login ulang');

  // STATE BARU BUAT HITUNG DARI DB. UI TETEP SAMA
  const [tasksDone, setTasksDone] = useState(0);
  const [tasksRejected, setTasksRejected] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  // Referral
  const [referral, setReferral] = useState<ReferralSummary>({ invitees: [], earnings: 0, available: true });
  const [copied, setCopied] = useState(false);
  const referralLink = userId ? buildReferralLink(userId) : '';

  useEffect(() => {
    if (!userId) return;
    fetchReferralSummary(userId).then(setReferral).catch(err => console.error('Gagal load referral:', err));
  }, [userId]);

  const copyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // Fallback untuk browser yang memblokir clipboard API
      const ta = document.createElement('textarea');
      ta.value = referralLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
     .from('pengguna')
     .select('nama, email, history') // <- TAMBAH history
     .eq('id', userId)
     .single();

      if (error) console.error('Gagal load profil:', error);

      if (data) {
        setNama(data.nama || 'User');
        setEmail(data.email || '-');

        // HITUNG DARI HISTORY. GA NGARUH KE UI
        const history = data.history || [];
        const paidTasks = history.filter((t: any) => t.status === 'paid');
        const rejectedTasks = history.filter((t: any) => t.status === 'rejected');

        setTasksDone(paidTasks.length);
        setTasksRejected(rejectedTasks.length);
        setTotalIncome(paidTasks.length * 1600); // 1600 = reward per tugas
      }
    };

    fetchProfile();
  }, [userId]);

  return (
    <div className="space-y-3 pb-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:items-start">

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-5 lg:p-8 shadow-sm border-gray-100 text-center relative overflow-hidden lg:row-span-2">
        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center border-4 border-white shadow-sm relative">
          <div className="text-blue-500 text-3xl font-black italic">{nama.charAt(0).toUpperCase()}</div>
          <div className="absolute -bottom-1 -right-1">
            {isVerified? (
              <div className="bg-blue-600 text-white p-0.5 rounded-full border-2 border-white flex items-center gap-1 px-1.5 shadow-sm">
                <BadgeCheck size={12} />
                <span className="text-[9px] font-bold">Verified</span>
              </div>
            ) : (
              <div className="bg-gray-400 text-white p-0.5 rounded-full border-2 border-white flex items-center gap-1 px-1.5 shadow-sm">
                <XCircle size={12} />
                <span className="text-[9px] font-bold">Non Verified</span>
              </div>
            )}
          </div>
        </div>
        <h2 className="text-lg font-bold flex items-center justify-center gap-1.5 text-gray-800">
          {nama}
          {isVerified && <BadgeCheck size={18} className="text-blue-500" />}
        </h2>
        <p className="text-[9px] font-black text-gray-400 mt-0.5 tracking-[0.2em] uppercase">
          {email}
        </p>
      </div>

      {/* Grid Stats - Separated */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 lg:gap-4 lg:col-span-2">
        <div className="bg-white p-3 rounded-xl border-gray-100 shadow-sm flex flex-col items-center">
          <CheckCircle2 size={16} className="text-emerald-500 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Tugas Diterima</p>
          <p className="text-base font-black text-gray-800">{tasksDone}</p> {/* UDAH DARI DB */}
        </div>
        <div className="bg-white p-3 rounded-xl border-gray-100 shadow-sm flex flex-col items-center">
          <XIcon size={16} className="text-red-500 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Tugas Ditolak</p>
          <p className="text-base font-black text-gray-800">{tasksRejected}</p> {/* UDAH DARI DB */}
        </div>
        <div className="bg-white p-3 rounded-xl border-gray-100 shadow-sm flex flex-col items-center">
          <Users size={16} className="text-blue-500 mb-1.5" />
          <div className="flex flex-col items-center">
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Referrals</p>
          </div>
          <p className="text-base font-black text-gray-800">{referral.invitees.length}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border-gray-100 shadow-sm flex flex-col items-center">
          <CreditCard size={16} className="text-purple-500 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Income Referral</p>
          <p className="text-base font-black text-purple-600">Rp. {referral.earnings.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border-gray-100 shadow-sm flex flex-col items-center">
          <ShieldCheck size={16} className="text-blue-600 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Honor Score</p>
          <p className="text-base font-black text-gray-800">100%</p>
        </div>
        <div className="bg-white p-3 rounded-xl border-gray-100 shadow-sm flex flex-col items-center">
          <Wallet size={16} className="text-emerald-600 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Pendapatan</p>
          <p className="text-base font-black text-emerald-600">Rp. {totalIncome.toLocaleString('id-ID')}</p> {/* UDAH DARI DB */}
        </div>
      </div>

      {/* Referral Card */}
      <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-sm border-gray-100 overflow-hidden relative lg:col-span-2">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-10 -mt-10 opacity-70" />
        <div className="relative flex items-center gap-2 mb-1.5">
          <Gift size={16} className="text-purple-600" />
          <h3 className="font-black text-xs text-purple-600 uppercase tracking-wider">URL Referral</h3>
        </div>
        <p className="relative text-[11px] text-gray-500 font-medium leading-snug mb-3 pr-2">
          Undang teman mu untuk bergabung. Kamu dapat bonus saldo <span className="text-emerald-600 font-black">Rp {REFERRAL_REWARD}</span> setiap
          kali tugas teman yang kamu undang <b>diterima admin</b> (tugas berstatus proses atau ditolak tidak dihitung).
        </p>
        <div className="relative bg-gray-50 p-2 rounded-xl border border-dashed border-gray-200 flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-600 font-mono truncate" title={referralLink}>{referralLink || '-'}</span>
          <button
            onClick={copyReferral}
            disabled={!referralLink}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm active:scale-95 whitespace-nowrap ${copied ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Tersalin' : 'Copy'}
          </button>
        </div>

        {!referral.available && (
          <p className="relative text-[10px] text-orange-500 font-bold mt-2">Fitur referral sedang disiapkan.</p>
        )}

        <div className="relative mt-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Teman yang diundang ({referral.invitees.length})</p>
          {referral.invitees.length === 0 ? (
            <p className="text-[11px] text-gray-400">Belum ada teman yang mendaftar lewat link kamu.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {referral.invitees.map((inv, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-[11px] font-bold text-gray-700 truncate">{maskEmail(inv.email)}</span>
                  <span className="text-[10px] font-black text-emerald-600 whitespace-nowrap">
                    {inv.paidTasks} tugas · +Rp {(inv.paidTasks * REFERRAL_REWARD).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pengaturan Akun */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border-gray-100">
        <h3 className="font-bold text-sm mb-3 text-gray-800">Pengaturan Akun</h3>
        <div className="space-y-1">
          <button
            onClick={onNavigateToWithdraw}
            className="w-full flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Wallet size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Alamat Penarikan</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button
            onClick={onNavigateToAbout}
            className="w-full flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Info size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Tentang Kami</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="w-full mt-2 lg:mt-0 py-3 rounded-xl bg-white border-red-100 text-red-500 text-sm font-bold shadow-sm active:bg-red-50 lg:col-start-1"
      >
        Logout
      </button>
    </div>
  );
};

export default Profil;