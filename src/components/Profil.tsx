import React, { useState, useEffect } from 'react'; // <- 1. Tambah useState, useEffect
import { BadgeCheck, XCircle, Wallet, Info, ChevronRight, CheckCircle2, XCircle as XIcon, Users, CreditCard, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase';

interface ProfilProps {
  tasksDone: number;
  totalIncome: number;
  isVerified: boolean;
  userId: string;
  onNavigateToWithdraw: () => void;
  onNavigateToAbout: () => void;
  onLogout?: () => void;
}

const Profil: React.FC<ProfilProps> = ({ tasksDone, totalIncome, isVerified, userId, onNavigateToWithdraw, onNavigateToAbout, onLogout }) => { // <- 3. Tambah userId di destruct
  // <- 4. STATE BARU UNTUK NAMA & EMAIL
  const [nama, setNama] = useState('User Member'); // Default biar ga ngeblink
  const [email, setEmail] = useState('Kesalahan: Harap Login ulang'); // Default biar ga ngeblink

  // <- 5. AMBIL DATA DARI DB PAS KOMPONEN MUNCUL
  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
      .from('pengguna')
      .select('nama, email') // Ambil 2 kolom aja biar ringan
      .eq('id', userId) // Pake 'id'. Ganti ke 'uuid' kalo PK lu uuid
      .single();

      if (data) {
        setNama(data.nama || 'User');
        setEmail(data.email || '-');
      }
      if (error) console.error('Gagal load profil:', error);
    };

    fetchProfile();
  }, [userId]);

  return (
    <div className="space-y-3 pb-6"> {/* space-y diperkecil dari 4 ke 3 */}

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center relative overflow-hidden">
        {/* Ukuran Avatar diperkecil dari w-24 h-24 menjadi w-20 h-20 */}
        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center border-4 border-white shadow-sm relative">
          <div className="text-blue-500 text-3xl font-black italic">U</div>
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
          {nama} {/* <- 6. GANTI User Member -> {nama} */}
          {isVerified && <BadgeCheck size={18} className="text-blue-500" />}
        </h2>
        <p className="text-[9px] font-black text-gray-400 mt-0.5 tracking-[0.2em] uppercase">
          {email} {/* <- 7. GANTI PGM-9923841 -> {email} */}
        </p>
      </div>

      {/* Grid Stats - Separated */}
      <div className="grid grid-cols-2 gap-2.5"> {/* gap diperkecil dari 3 ke 2.5 */}
        {/* Card padding diperkecil jadi p-3 (sebelumnya p-4), font value jadi text-base (sebelumnya text-lg) */}
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
          <CheckCircle2 size={16} className="text-emerald-500 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Tugas Diterima</p>
          <p className="text-base font-black text-gray-800">{tasksDone}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
          <XIcon size={16} className="text-red-500 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Tugas Ditolak</p>
          <p className="text-base font-black text-gray-800">0</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
          <Users size={16} className="text-blue-500 mb-1.5" />
          <div className="flex flex-col items-center">
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Referrals</p>
             <span className="text-[7px] bg-blue-50 text-blue-600 px-1 rounded font-black -mt-0.5">COMING SOON</span>
          </div>
          <p className="text-base font-black text-gray-800">0</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
          <CreditCard size={16} className="text-purple-500 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Income Referral</p>
          <p className="text-base font-black text-gray-800">Rp. 0</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
          <ShieldCheck size={16} className="text-blue-600 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Honor Score</p>
          <p className="text-base font-black text-gray-800">100%</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
          <Wallet size={16} className="text-emerald-600 mb-1.5" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Pendapatan</p>
          <p className="text-base font-black text-emerald-600">Rp. {totalIncome.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Referral Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50" />
        <h3 className="font-black text-xs text-blue-600 uppercase tracking-wider mb-1.5">URL Referral</h3>
        <p className="text-[10px] text-gray-500 font-medium leading-snug mb-3 pr-2">
          Ayo undang teman mu untuk bergabung dan dapatkan komisi registrasi sebanyak <span className="text-emerald-600 font-black">Rp. 500</span>
        </p>
        <div className="bg-gray-50 p-2 rounded-xl border-dashed border-gray-200 flex items-center justify-between">
           <span className="text-[9px] text-gray-400 font-mono truncate mr-2">Coming Soon..</span>
           <button className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 whitespace-nowrap">Copy</button>
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
        className="w-full mt-2 py-3 rounded-xl bg-white border-red-100 text-red-500 text-sm font-bold shadow-sm active:bg-red-50"
      >
        Logout
      </button>
    </div>
  );
};

export default Profil;