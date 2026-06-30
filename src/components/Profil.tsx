import React from 'react';
import { BadgeCheck, XCircle, Wallet, Info, ChevronRight, CheckCircle2, XCircle as XIcon, Users, CreditCard, ShieldCheck } from 'lucide-react';

interface ProfilProps {
  tasksDone: number;
  totalIncome: number;
  isVerified: boolean;
  onNavigateToWithdraw: () => void;
  onNavigateToAbout: () => void;
  onLogout: () => void; // <-- 1. GANTI: JANGAN RELOAD, PAKE INI
}

const Profil: React.FC<ProfilProps> = ({ tasksDone, totalIncome, isVerified, onNavigateToWithdraw, onNavigateToAbout, onLogout }) => {
  return (
    <div className="space-y-4 pb-6">
      {/* Header Profile Card - UI TETAP SAMA */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-gray-100 text-center relative overflow-hidden">
        <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white shadow-sm relative">
          <div className="text-blue-500 text-4xl font-black italic">U</div>
          <div className="absolute -bottom-1 -right-1">
            {isVerified ? (
              <div className="bg-blue-600 text-white p-1 rounded-full border-2 border-white flex items-center gap-1 px-2 shadow-sm">
                <BadgeCheck size={14} />
                <span className="text- font-bold">Verified</span>
              </div>
            ) : (
              <div className="bg-gray-400 text-white p-1 rounded-full border-2 border-white flex items-center gap-1 px-2 shadow-sm">
                <XCircle size={14} />
                <span className="text- font-bold">Non Verified</span>
              </div>
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold flex items-center justify-center gap-2 text-gray-800">
          User Member
          {isVerified && <BadgeCheck size={20} className="text-blue-500" />}
        </h2>
        <p className="text- font-black text-gray-400 mt-1 tracking-[0.2em] uppercase">ID: PGM-9923841</p>
      </div>

      {/* Grid Stats - Separated - UI TETAP SAMA */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border-gray-100 shadow-lg flex-col items-center">
          <CheckCircle2 size={16} className="text-emerald-500 mb-2" />
          <p className="text- font-black text-gray-400 uppercase tracking-tight">Tugas Diterima</p>
          <p className="text-lg font-black text-gray-800">{tasksDone}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-gray-100 shadow-lg flex-col items-center">
          <XIcon size={16} className="text-red-500 mb-2" />
          <p className="text- font-black text-gray-400 uppercase tracking-tight">Tugas Ditolak</p>
          <p className="text-lg font-black text-gray-800">0</p> 
        </div>
        <div className="bg-white p-4 rounded-2xl border-gray-100 shadow-lg flex-col items-center">
          <Users size={16} className="text-blue-500 mb-2" />
          <div className="flex flex-col items-center">
             <p className="text- font-black text-gray-400 uppercase tracking-tight">Referrals</p>
             <span className="text- bg-blue-50 text-blue-600 px-1 rounded font-black -mt-0.5">COMING SOON</span>
          </div>
          <p className="text-lg font-black text-gray-800">0</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-gray-100 shadow-lg flex-col items-center">
          <CreditCard size={16} className="text-purple-500 mb-2" />
          <p className="text- font-black text-gray-400 uppercase tracking-tight">Income Referral</p>
          <p className="text-lg font-black text-gray-800">Rp. 0</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-gray-100 shadow-lg flex flex-col items-center">
          <ShieldCheck size={16} className="text-blue-600 mb-2" />
          <p className="text- font-black text-gray-400 uppercase tracking-widest">Honor Score</p>
          <p className="text-lg font-black text-gray-800">100%</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-gray-100 shadow-lg flex-col items-center">
          <Wallet size={16} className="text-emerald-600 mb-2" />
          <p className="text- font-black text-gray-400 uppercase tracking-widest">Total Pendapatan</p>
          <p className="text-lg font-black text-emerald-600">Rp. {totalIncome.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Referral Card - UI TETAP SAMA */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50" />
        <h3 className="font-black text-xs text-blue-600 uppercase tracking-wider mb-2">URL Referral</h3>
        <p className="text- text-gray-500 font-bold leading-relaxed mb-4">
          Ayo undang teman mu untuk bergabung dalam Campaign ini dan dapatkan komisi di setiap user yang berhasil registrasi sebanyak <span className="text-emerald-600 font-black">Rp. 500</span>
        </p>
        <div className="bg-gray-50 p-2.5 rounded-xl border-dashed border-gray-200 flex items-center justify-between">
           <span className="text- text-gray-400 font-mono">https://pusatgmail.com/ref/9923841</span>
           <button className="bg-blue-600 text-white px-3 py-1 rounded-lg text- font-black uppercase shadow-md shadow-blue-100 active:scale-95">Copy</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-lg border-gray-100">
        <h3 className="font-bold mb-4 text-gray-800">Pengaturan Akun</h3>
        <div className="space-y-1">
          <button 
            onClick={onNavigateToWithdraw}
            className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Wallet size={18} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Alamat Penarikan</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button 
            onClick={onNavigateToAbout}
            className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Info size={18} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Tentang Kami</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      <button 
        onClick={onLogout} // <-- 2. GANTI: PAKE onLogout DARI APP.TSX
        className="w-full mt-4 py-4 rounded-2xl bg-white border-red-100 text-red-500 font-bold shadow-lg active:bg-red-50"
      >
        Logout
      </button>
    </div>
  );
};

export default Profil;