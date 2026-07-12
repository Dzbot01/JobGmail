import React, { useState, useEffect } from 'react';
import { ChevronRight, Send, Eye, EyeOff } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface SetoranProps {
  isLoading: boolean;
  onTaskSubmit: (data: { email: string, pass: string }) => void;
  showAlert: (message: string, subtext: string, type: 'success' | 'error') => void;
}

interface SetoranProps {
  isLoading: boolean;
  onTaskSubmit: (data: { email: string, pass: string }) => void;
  showAlert: (message: string, subtext: string, type: 'success' | 'error') => void;
  settings: {
    taskReward: number;
    taskPassword: string;
    taskDescription: string;
    withdrawDetailsSet?: boolean;
  };
}

const Setoran: React.FC<SetoranProps> = ({ isLoading, onTaskSubmit, showAlert, settings }) => {
  // Single Account State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Bulk Account State
  const [bulkEmailsText, setBulkEmailsText] = useState('');
  const [bulkPassword, setBulkPassword] = useState('');
  const [isBulkSaved, setIsBulkSaved] = useState(false);
  const [bulkAgreed, setBulkAgreed] = useState(false);

  const emailList = bulkEmailsText.split('\n').filter(e => e.trim() !== '');

 const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    
    if (!email.endsWith('@gmail.com')) {
      showAlert('Gagal!', 'Alamat email tidak valid! Harus menggunakan @gmail.com', 'error');
      return;
    }

    if (password !== settings.taskPassword) {
      showAlert('Gagal!', `Password harus sesuai dengan deskripsi tugas: ${settings.taskPassword}`, 'error');
      return;
    }

    if (!settings.withdrawDetailsSet) {
      showAlert('Akses Ditolak!', 'Harap isi alamat penarikan di menu Profil terlebih dahulu sebelum mengerjakan tugas.', 'error');
      return;
    }

    onTaskSubmit({ email, pass: password });
    setEmail('');
    setPassword('');
    setAgreed(false);
  };

  const handleBulkSave = () => {
    if (emailList.length === 0) {
      showAlert('Gagal!', 'Harap isi daftar alamat email terlebih dahulu!', 'error');
      return;
    }
    const invalid = emailList.find(e => !e.trim().endsWith('@gmail.com'));
    if (invalid) {
      showAlert('Gagal!', `Email ${invalid} tidak valid! Semua email wajib @gmail.com`, 'error');
      return;
    }
    setIsBulkSaved(true);
    setTimeout(() => setIsBulkSaved(false), 5000);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAgreed) return;

    if (emailList.length < 10) {
      showAlert('Gagal!', 'Minimal harus 10 alamat email untuk setoran!', 'error');
      return;
    }

    const invalid = emailList.find(e => !e.trim().endsWith('@gmail.com'));
    if (invalid) {
      showAlert('Gagal!', `Email ${invalid} tidak valid! Semua email wajib @gmail.com`, 'error');
      return;
    }

    if (bulkPassword !== settings.taskPassword) {
      showAlert('Gagal!', `Password harus sesuai dengan deskripsi tugas: ${settings.taskPassword}`, 'error');
      return;
    }

    if (!settings.withdrawDetailsSet) {
      showAlert('Akses Ditolak!', 'Harap isi alamat penarikan di menu Profil terlebih dahulu sebelum mengerjakan tugas.', 'error');
      return;
    }

    // Submit all accounts
    emailList.forEach(mail => {
      onTaskSubmit({ email: mail.trim(), pass: bulkPassword });
    });

    setBulkEmailsText('');
    setBulkPassword('');
    setBulkAgreed(false);
    showAlert('Sukses!', `${emailList.length} Akun berhasil disetorkan!`, 'success');
  };

  return (
    <div className="space-y-8 pb-10">
      {/* SECTION 1: SINGLE */}
      <div className="space-y-3">
        <p className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
          Dapatkan bayaran instan dengan hanya setor 1 akun
        </p>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Setoran Akun Gmail</h2>
          
          <div className="bg-blue-50/50 rounded-xl p-4 mb-5 border border-blue-100 space-y-3 relative">
            <div 
              onClick={() => window.location.href = '/#warning'}
              className="absolute top-2 right-2 w-12 h-12 bg-white rounded-full shadow-md border border-blue-100 cursor-pointer overflow-hidden flex items-center justify-center p-1 active:scale-95 transition-transform"
            >
              <DotLottieReact
                src="https://lottie.host/06c4fcf8-4876-486d-a063-3f8682025985/r1cCpDZmkU.lottie"
                loop
                autoplay
              />
            </div>

            <p className="text-sm text-gray-600 leading-relaxed font-medium pr-10">
              {settings.taskDescription}
            </p>
            <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
              <p className="text-[11px] font-bold text-blue-700 uppercase mb-2">Instruksi Tugas:</p>
              <ol className="text-[11px] text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Buat dengan nama dari database di bawah ini untuk mendapatkan reward: <span className="font-bold text-emerald-600">Rp. {settings.taskReward.toLocaleString('id-ID')}</span></li>
                <li>Gunakan Password: <span className="font-bold text-blue-600">{settings.taskPassword}</span></li>
              </ol>
            </div>
          </div>

          <a 
            href="https://www.fakenamegenerator.com/gen-male-us-us.php" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 text-sm font-bold hover:underline mb-6"
          >
            Ambil nama untuk alamat email <ChevronRight size={16} />
          </a>

          <form onSubmit={handleSubmitSingle} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Alamat Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@gmail.com"
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:border-blue-400 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:border-blue-400 focus:bg-white outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <input 
                type="checkbox" 
                id="terms" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-gray-500 font-medium cursor-pointer">
                Saya menyetujui syarat dan ketentuan yang berlaku dalam penyetoran akun Gmail ini.
              </label>
            </div>

   <button 
  type="submit"
  disabled={!agreed || isLoading} // 1. Tambah isLoading ke disabled
  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg ${
    agreed && !isLoading ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed' // 2. Tambah !isLoading
  }`}
>
  {isLoading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />} {/* 3. Ganti icon pas loading */}
  {isLoading ? 'Mengirim...' : 'Kirim Setoran'} {/* 4. Ganti text pas loading */}
</button>
          </form>
        </div>
      </div>

      {/* SECTION 2: BULK */}
      <div className="space-y-3">
        <p className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
          Dapatkan bayaran lebih tinggi dengan setor minimal 10 Akun
        </p>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Setor sekaligus 10 Akun</h2>
          
          <div className="bg-emerald-50/50 rounded-xl p-4 mb-5 border border-emerald-100 space-y-3 relative">
            <div 
              onClick={() => window.location.href = '/#warning'}
              className="absolute top-2 right-2 w-12 h-12 bg-white rounded-full shadow-md border border-emerald-100 cursor-pointer overflow-hidden flex items-center justify-center p-1 active:scale-95 transition-transform"
            >
              <DotLottieReact
                src="https://lottie.host/06c4fcf8-4876-486d-a063-3f8682025985/r1cCpDZmkU.lottie"
                loop
                autoplay
              />
            </div>

            <p className="text-sm text-gray-600 leading-relaxed font-medium pr-10">
              Setor sekaligus 10 Akun untuk mendapatkan <span className="text-emerald-600 font-black underline decoration-emerald-200">Reward Spesial Rp. 20.000</span>
            </p>
            <div className="bg-white/80 p-3 rounded-lg border border-emerald-100">
              <p className="text-[11px] font-bold text-emerald-700 uppercase mb-2 tracking-tighter">Syarat Bulk:</p>
              <ul className="text-[10px] text-gray-600 space-y-1 ml-4 list-disc font-bold uppercase">
                <li>Minimal 10 Alamat Email</li>
                <li>Email wajib berakhiran @gmail.com</li>
                <li>Password wajib sama</li>
              </ul>
            </div>
          </div>

          <a 
            href="https://www.fakenamegenerator.com/gen-male-us-us.php" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 text-sm font-bold hover:underline mb-6"
          >
            Ambil nama untuk alamat email <ChevronRight size={16} />
          </a>

          <form onSubmit={handleBulkSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Daftar Alamat Email (Satu per baris)</label>
              <textarea 
                rows={6}
                required
                value={bulkEmailsText}
                onChange={(e) => setBulkEmailsText(e.target.value)}
                placeholder="email1@gmail.com&#10;email2@gmail.com&#10;..."
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:border-emerald-400 focus:bg-white outline-none font-medium text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password (Wajib Sama Semua)</label>
              <input 
                type="text" 
                required
                value={bulkPassword}
                onChange={(e) => setBulkPassword(e.target.value)}
                placeholder="Ajax1122*"
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:border-emerald-400 focus:bg-white outline-none font-bold"
              />
            </div>

            {/* Email confirmation preview */}
            {emailList.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                 <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Konfirmasi Email ({emailList.length}):</p>
                 <div className="max-h-24 overflow-y-auto space-y-1">
                    {emailList.map((m, i) => (
                      <p key={i} className="text-[10px] text-emerald-600 font-bold">{i+1}. {m}</p>
                    ))}
                 </div>
              </div>
            )}

            <div className="flex items-start gap-3 py-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <input 
                type="checkbox" 
                id="terms-bulk" 
                checked={bulkAgreed}
                onChange={(e) => setBulkAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="terms-bulk" className="text-xs text-gray-500 font-medium cursor-pointer">
                Saya menyetujui syarat dan ketentuan bulk.
              </label>
            </div>

            <div className="space-y-3">
              {isBulkSaved && (
                <p className="text-[10px] text-emerald-600 font-black text-center animate-bounce uppercase">
                   Data akun telah disimpan, Buat lagi dan Lengkapi hingga 10 akun untuk bisa Setor
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={handleBulkSave}
                  className="py-3 px-4 rounded-xl border-2 border-emerald-100 bg-white text-emerald-600 text-xs font-black uppercase active:scale-95 transition-transform"
                >
                  Simpan Dulu
                </button>
                <button 
                  type="submit"
                  disabled={!bulkAgreed || emailList.length < 10}
                  className={`py-3 px-4 rounded-xl font-black text-xs uppercase shadow-lg transition-all ${
                    bulkAgreed && emailList.length >= 10 ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  Setor Sekarang
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Setoran;
