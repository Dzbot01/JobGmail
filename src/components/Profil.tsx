import React, { useState, useEffect } from 'react';
import { HONOR_DEFAULT, HONOR_INFO, honorTier, HONOR_PENALTY_REJECT, HONOR_RECOVER_ACCEPT, HONOR_BLUE_MIN, HONOR_YELLOW_MIN } from '../lib/honor';
import { BadgeCheck, XCircle, Wallet, Info, ChevronRight, CheckCircle2, XCircle as XIcon, Users, CreditCard, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { Copy, Check, Gift, HardHat, Briefcase } from 'lucide-react';
import { useAccountMode } from '../lib/accountMode';
import { MIN_SALDO_PENCARI } from '../lib/tripay';
import { Lock } from 'lucide-react';
import { buildReferralLink, fetchReferralSummary, maskEmail, REFERRAL_REWARD, ReferralSummary } from '../lib/referral';

interface ProfilProps {
  tasksDone: number; // <- ini udah ga kepake tapi biarin aja biar ga error di App
  /** Honor score dari server (0..100) */
  honorScore?: number;
  totalIncome: number; // <- ini juga
  isVerified: boolean;
  userId: string;
  onNavigateToWithdraw: () => void;
  onNavigateToAbout: () => void;
  onLogout?: () => void;
  /** Saldo saat ini — mode Pencari Pekerja butuh minimal Rp 10.000 */
  balance?: number;
  onNavigateToTopup?: () => void;
}

const Profil: React.FC<ProfilProps> = ({ isVerified, userId, onNavigateToWithdraw, onNavigateToAbout, onLogout, balance = 0, onNavigateToTopup, honorScore = HONOR_DEFAULT }) => {
  const honor = HONOR_INFO[honorTier(honorScore)];
  const pencariLocked = balance < MIN_SALDO_PENCARI;
  const [nama, setNama] = useState('User Member');
  const [email, setEmail] = useState('Kesalahan: Harap Login ulang');

  // STATE BARU BUAT HITUNG DARI DB. UI TETEP SAMA
  const [tasksDone, setTasksDone] = useState(0);
  const [tasksRejected, setTasksRejected] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  // Mode akun (Pekerja / Pencari Pekerja)
  const { mode, setMode, saving: savingMode } = useAccountMode(userId);

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
        <div className={`p-3 rounded-xl border shadow-sm flex flex-col items-center ${honor.bg} ${honor.border}`} title={honor.desc}>
          <ShieldCheck size={16} className={`${honor.text} mb-1.5`} />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Honor Score</p>
          <p className={`text-base font-black ${honor.text}`}>{honorScore}%</p>
          <div className="w-full h-1.5 rounded-full bg-white/80 mt-1 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={honorScore} aria-label="Honor score">
            <div className={`h-full rounded-full ${honor.bar}`} style={{ width: `${honorScore}%` }} />
          </div>
          <p className={`text-[9px] font-black uppercase mt-1 ${honor.text}`}>{honor.label}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border-gray-100 shadow-sm flex flex-col items-center">
          <Wallet size={16} className="text-emerald-600 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Pendapatan</p>
          <p className="text-base font-black text-emerald-600">Rp. {totalIncome.toLocaleString('id-ID')}</p> {/* UDAH DARI DB */}
        </div>
      </div>

      {/* Detail Honor Score */}
      <div className={`rounded-2xl p-4 lg:p-5 shadow-sm border lg:col-span-2 ${honor.bg} ${honor.border}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-black text-xs text-gray-800 uppercase tracking-wider">Honor Score</h3>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-white ${honor.text}`}>{honorScore}% · {honor.label}</span>
        </div>
        <div className="h-2.5 rounded-full bg-white overflow-hidden flex" aria-hidden="true">
          <div className={`h-full ${honor.bar} transition-all`} style={{ width: `${honorScore}%` }} />
        </div>
        <div className="flex justify-between text-[9px] font-bold text-gray-400 mt-1">
          <span>0</span><span>Merah &lt; {HONOR_YELLOW_MIN}</span><span>Kuning {HONOR_YELLOW_MIN}–{HONOR_BLUE_MIN - 1}</span><span>Biru ≥ {HONOR_BLUE_MIN}</span>
        </div>
        <p className={`text-[11px] font-bold mt-2 ${honor.text}`}>{honor.desc}</p>
        <ul className="mt-2 space-y-1 text-[10px] text-gray-500 list-disc ml-4">
          <li>Setiap akun yang <b>ditolak</b> admin: honor −{HONOR_PENALTY_REJECT}.</li>
          <li>Setiap akun yang <b>diterima</b> admin: honor +{HONOR_RECOVER_ACCEPT} (maks 100).</li>
          <li><b className="text-blue-600">Biru</b> aman · <b className="text-amber-600">Kuning</b> hanya 1× kirim tugas per hari &amp; tanpa setor bulk · <b className="text-red-600">Merah</b> akun otomatis diblokir.</li>
        </ul>
      </div>

      {/* Mode Akun */}
      <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-sm border-gray-100 lg:col-span-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-xs text-gray-800 uppercase tracking-wider">Mode Akun</h3>
          {savingMode && <span className="text-[10px] text-gray-400 font-bold">Menyimpan…</span>}
        </div>
        <p className="text-[11px] text-gray-500 mb-3">Menentukan tampilan halaman <b>Cari Pekerjaan</b>.</p>
        <div role="radiogroup" aria-label="Mode akun" className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
          {([
            { key: 'pekerja', label: 'Pekerja', desc: 'Cari & kerjakan pekerjaan', icon: <HardHat size={18} /> },
            { key: 'pencari', label: 'Pencari Pekerja', desc: 'Buat pekerjaan & review', icon: <Briefcase size={18} /> },
          ] as const).map(opt => {
            const locked = opt.key === 'pencari' && pencariLocked && mode !== 'pencari';
            return (
            <button
              key={opt.key}
              role="radio"
              aria-checked={mode === opt.key}
              aria-disabled={locked}
              onClick={() => {
                if (locked) { onNavigateToTopup?.(); return; }
                setMode(opt.key);
              }}
              title={locked ? `Butuh saldo minimal Rp ${MIN_SALDO_PENCARI.toLocaleString('id-ID')}` : undefined}
              className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${mode === opt.key ? 'bg-white shadow-md text-blue-600' : locked ? 'text-gray-400' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {locked ? <Lock size={18} /> : opt.icon}
              <span className="min-w-0">
                <span className="block text-xs font-black">{opt.label}</span>
                <span className="block text-[10px] text-gray-400 truncate">{locked ? `Min. saldo Rp ${MIN_SALDO_PENCARI.toLocaleString('id-ID')}` : opt.desc}</span>
              </span>
            </button>
            );
          })}
        </div>
        {pencariLocked && (
          <div className="mt-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <p className="text-[11px] text-amber-800 leading-snug">
              Mode <b>Pencari Pekerja</b> membutuhkan saldo minimal <b>Rp {MIN_SALDO_PENCARI.toLocaleString('id-ID')}</b>. Saldo kamu Rp {balance.toLocaleString('id-ID')}.
            </p>
            <button onClick={onNavigateToTopup} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-black">Top Up</button>
          </div>
        )}
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