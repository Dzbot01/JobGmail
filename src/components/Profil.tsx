import React from 'react';
import { BadgeCheck, XCircle, Wallet, Info, ChevronRight } from 'lucide-react';

interface ProfilProps {
  tasksDone: number
  totalIncome: number  
  isVerified: boolean
  onNavigateToWithdraw: () => void
  onLogout?: () => void // TAMBAH INI kalo belum ada
}

const Profil: React.FC<ProfilProps> = ({ tasksDone, totalIncome, isVerified, onNavigateToWithdraw }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center relative overflow-hidden">
        <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white shadow-sm relative">
          <div className="text-blue-500 text-4xl font-bold italic">U</div>
          <div className="absolute -bottom-1 -right-1">
            {isVerified ? (
              <div className="bg-blue-600 text-white p-1 rounded-full border-2 border-white flex items-center gap-1 px-2 shadow-sm">
                <BadgeCheck size={14} />
                <span className="text-[10px] font-bold">Verified</span>
              </div>
            ) : (
              <div className="bg-gray-400 text-white p-1 rounded-full border-2 border-white flex items-center gap-1 px-2 shadow-sm">
                <XCircle size={14} />
                <span className="text-[10px] font-bold">Non Verified</span>
              </div>
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold flex items-center justify-center gap-2 text-gray-800">
          User Member
          {isVerified && <BadgeCheck size={20} className="text-blue-500" />}
        </h2>
        <p className="text-[10px] font-bold text-gray-400 mt-1">ID: PGM-9923841</p>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Tugas Selesai</p>
            <p className="text-xl font-bold text-gray-800">{tasksDone}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Pendapatan</p>
            <p className="text-xl font-bold text-blue-600">Rp. {totalIncome.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
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
          <button className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors text-left">
            <div className="flex items-center gap-3">
              <Info size={18} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Tentang Kami</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="w-full mt-4 py-4 rounded-2xl bg-white border border-red-100 text-red-500 font-bold shadow-lg active:bg-red-50"
      >
        Logout
      </button>
    </div>
  );
};

export default Profil;
