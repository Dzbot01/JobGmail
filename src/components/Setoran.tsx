import React, { useState } from 'react';
import { ChevronRight, Send, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase'; // <-- 1. TAMBAH INI
import { v4 as uuidv4 } from 'uuid'; // <-- 1. TAMBAH INI
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface SetoranProps {
  onTaskSubmit: (data: { email: string, pass: string }) => void;
  showAlert: (message: string, subtext: string, type: 'success' | 'error') => void;
  settings: {
    taskReward: number;
    taskPassword: string;
    taskDescription: string;
    withdrawDetailsSet?: boolean;
  };
}

const Setoran: React.FC<SetoranProps> = ({ onTaskSubmit, showAlert, settings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false); // <-- 2. TAMBAH LOADING

  // === 3. handleSubmit DISAMAIN PLEK KAYAK FILE LAMA ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || loading) return; // <-- TAMBAH LOADING
    
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

    setLoading(true);

    try {
      const { data: { user }} = await supabase.auth.getUser();
      if (!user) throw new Error('User belum login');

      const { data: userData, error: fetchError } = await supabase
        .from('pengguna')
        .select('history')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      let historyArr = userData?.history || [];

      const newTask = {
        id: uuidv4(),
        email: email,
        password: password,
        status: 'process',
        reason: null,
        timestamp: new Date().toISOString()
      };

      historyArr = [newTask, ...historyArr];

      if (historyArr.length > 10) {
        historyArr = historyArr.slice(0, 10);
      }

      const { error: updateError } = await supabase
        .from('pengguna')
        .update({ history: historyArr })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onTaskSubmit({ email, pass: password });

      showAlert('Sukses!', 'Tugas dikirim, menunggu verifikasi admin', 'success');
      setEmail('');
      setPassword('');
      setAgreed(false);

    } catch (err: any) {
      showAlert('Gagal!', err.message || 'Terjadi kesalahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border-gray-100">
        <h2 className="text-xl font-bold mb-2 text-gray-800">Setoran Akun Gmail</h2>
        
        {/* Description card - UI TETAP SAMA */}
        <div className="bg-blue-50/50 rounded-xl p-4 mb-5 border-blue-100 space-y-3 relative">
          {/* Lottie Bubble Trigger - UI TETAP SAMA */}
          <div 
            onClick={() => window.location.href = '/#warning'}
            className="absolute top-2 right-2 w-12 h-12 bg-white rounded-full shadow-md border-blue-100 cursor-pointer overflow-hidden flex items-center justify-center p-1 active:scale-95 transition-transform"
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
          <div className="bg-white/80 p-3 rounded-lg border-blue-100">
            <p className="text- font-bold text-blue-700 uppercase mb-2">Instruksi Tugas:</p>
            <ol className="text- text-gray-600 space-y-1 ml-4 list-decimal">
              <li>Buat dengan nama dari database di bawah ini untuk mendapatkan reward: <span className="font-bold text-emerald-600">Rp. {settings.taskReward.toLocaleString('id-ID')}</span></li>
              <li>Gunakan Password: <span className="font-bold text-blue-600">{settings.taskPassword}</span></li>
            </ol>
          </div>
        </div>

        <a 
          href="https://www.fakenamegenerator.com/gen-male-us.php" // <-- UI TETAP SAMA
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 text-sm font-bold hover:underline mb-6"
        >
          Ambil nama untuk alamat email <ChevronRight size={16} />
        </a>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Alamat Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@gmail.com"
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border-gray-100 focus:border-blue-400 focus:bg-white outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password</label>
            <div className="relative">
              <input 
                type={showPassword? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border-gray-100 focus:border-blue-400 focus:bg-white outline-none"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2 bg-gray-50/50 p-3 rounded-xl border-gray-100">
            <input 
              type="checkbox" 
              id="terms" 
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-gray-500 leading-tight font-medium cursor-pointer">
              Saya menyetujui syarat dan ketentuan yang berlaku dalam penyetoran akun Gmail ini.
            </label>
          </div>

          <button 
            type="submit"
            disabled={!agreed || loading} // <-- 4. TAMBAH LOADING
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg ${
              agreed && !loading? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
            {loading? 'Mengirim...' : 'Kirim Setoran'} // <-- 4. TEXT LOADING
          </button>
        </form>
      </div>
    </div>
  );
};

export default Setoran;