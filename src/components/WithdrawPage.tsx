import React, { useState } from 'react';
import { Wallet, History, ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';

export interface HistoryItem {
  id: string;
  amount: number;
  status: 'process' | 'paid' | 'rejected';
  date: string;
  walletNumber?: string;
  userName?: string;
  method?: string;
  reason?: string;
}

interface WithdrawPageProps {
  balance: number;
  history: HistoryItem[];
  onBack: () => void;
  onWithdrawSuccess: (amount: number) => void;
  showAlert: (message: string, subtext: string, type: 'success' | 'error') => void;
}

const WithdrawPage: React.FC<WithdrawPageProps> = ({ balance, history, onBack, onWithdrawSuccess, showAlert }) => {
  const [activeSubTab, setActiveSubTab] = useState<'withdraw' | 'history'>('withdraw');
  const [amount, setAmount] = useState<string>('');
  
  const quickAmounts = [1000, 3000, 5000, 10000, 50000, 100000];

  const handleWithdraw = () => {
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount < 1000) {
      showAlert("Gagal!", "Minimal penarikan Rp. 1.000", "error");
      return;
    }
    if (numAmount > balance) {
      showAlert("Gagal!", "Saldo tidak mencukupi", "error");
      return;
    }
    
    // Add delay for animation
    const container = document.querySelector('.u-container');
    if (container) {
      container.classList.add('animating');
      setTimeout(() => {
        onWithdrawSuccess(numAmount);
        setAmount('');
        setActiveSubTab('history');
        container.classList.remove('animating');
      }, 1500); // Wait for animation
    } else {
      onWithdrawSuccess(numAmount);
      setAmount('');
      setActiveSubTab('history');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">Withdraw</h2>
      </div>

      <div className="bg-white rounded-2xl p-1 shadow-md border border-gray-100 flex">
        <button 
          onClick={() => setActiveSubTab('withdraw')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${activeSubTab === 'withdraw' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}
        >
          <Wallet size={16} />
          Withdraw
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${activeSubTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}
        >
          <History size={16} />
          Riwayat
        </button>
      </div>

      {activeSubTab === 'withdraw' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-4">Pilih Nominal Cepat</p>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((val) => (
                <button 
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className="py-3 px-1 rounded-xl border border-gray-100 bg-gray-50 text-xs font-bold text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors active:scale-95"
                >
                  Rp {val.toLocaleString('id-ID')}
                </button>
              ))}
            </div>

              <div className="mt-8">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Jumlah Withdraw</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rp</span>
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan nominal"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-blue-400 focus:bg-white outline-none font-bold text-lg"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">Minimal penarikan Rp. 1.000</p>
              </div>

              {/* T&C Withdraw */}
              <div className="mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-100 shadow-inner">
                <h4 className="text-xs font-black text-gray-700 uppercase mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full" />
                  Syarat & Ketentuan Penarikan
                </h4>
                <ol className="space-y-2">
                  {[
                    "Minimal penarikan adalah Rp. 1.000",
                    "Pastikan alamat penarikan sudah benar dan sesuai",
                    "Proses penarikan memakan waktu 1-24 jam kerja",
                    "Terdapat biaya admin sesuai dengan metode penarikan yang dipilih",
                    "Penarikan yang sudah diproses tidak dapat dibatalkan"
                  ].map((text, i) => (
                    <li key={i} className="flex gap-2 text-[10px] text-gray-500 leading-relaxed">
                      <span className="font-bold text-blue-600">{i + 1}.</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ol>
              </div>

            <div className="flex justify-center mt-8">
              <div className="u-container" onClick={handleWithdraw}>
                <div className="left-side">
                  <div className="u-card">
                    <div className="card-line"></div>
                    <div className="buttons"></div>
                  </div>
                  <div className="post">
                    <div className="post-line"></div>
                    <div className="screen">
                      <div className="dollar">$</div>
                    </div>
                    <div className="numbers"></div>
                    <div className="numbers-line2"></div>
                  </div>
                </div>
                <div className="right-side">
                  <div className="new">Konfirmasi Withdraw</div>
                  <svg viewBox="0 0 451.846 451.847" height="512" width="512" xmlns="http://www.w3.org/2000/svg" className="arrow"><path fill="#cfcfcf" data-old_color="#000000" className="active-path" data-original="#000000" d="M345.441 248.292L151.154 442.573c-12.359 12.365-32.397 12.365-44.75 0-12.354-12.354-12.354-32.391 0-44.744L278.318 225.92 106.409 54.017c-12.354-12.359-12.354-32.394 0-44.748 12.354-12.359 32.391-12.359 44.75 0l194.287 194.284c6.177 6.18 9.262 14.271 9.262 22.366 0 8.099-3.091 16.196-9.267 22.373z"></path></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                <History size={32} />
              </div>
              <p className="text-sm font-medium text-gray-400">Belum ada riwayat penarikan</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-3 shadow-lg border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.status === 'paid' ? 'bg-green-50 text-green-500' : 
                    item.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
                  }`}>
                    {item.status === 'paid' ? <CheckCircle size={16} /> : 
                     item.status === 'rejected' ? <XCircle size={16} /> : <Clock size={15} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Rp {item.amount.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-gray-400">{item.date}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  item.status === 'paid' ? 'bg-green-100 text-green-600' : 
                  item.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default WithdrawPage;
