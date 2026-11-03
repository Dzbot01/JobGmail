import React, { useState } from 'react';
import { signInWithGoogle } from '../supabase';

interface AuthPageProps {
  onLogin: (role: 'user' | 'admin') => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // jangan panggil onLogin di sini, biarin App.tsx yg handle dari onAuthStateChange
    } catch (error: any) {
      console.error('Login error:', error);
      alert('Gagal login: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
      <div className="w-full max-w-md lg:max-w-5xl bg-white rounded-3xl shadow-xl border-gray-100 overflow-hidden lg:grid lg:grid-cols-2">
        {/* Panel brand (desktop) */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#118eea] to-[#005cbb] p-12 text-white relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
          <p className="relative text-[11px] font-black uppercase tracking-[0.25em] opacity-80">Job Gmail</p>
          <div className="relative space-y-4">
            <h2 className="text-3xl font-black leading-tight">Kerjakan tugas, setor akun, dan tarik saldo dengan mudah.</h2>
            <p className="text-sm font-medium opacity-80 leading-relaxed">Pembayaran flat rate per akun, withdraw ke Dana, Gopay, atau QRIS, dan riwayat tugas yang transparan.</p>
          </div>
          <p className="relative text-[10px] font-bold uppercase tracking-widest opacity-60">© 2026 Job Gmail Digital Solution</p>
        </div>

        <div className="flex flex-col">
        <div className="p-8 lg:p-12 flex-1 flex flex-col justify-center">
          <div className="flex justify-center mb-8">
            <img
              src="https://cdn.phototourl.com/member/2026-06-24-82f2ee5b-333f-41b2-a310-7686368b2cec.png"
              alt="Logo"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">
              {isRegister? 'Buat Akun Baru' : 'Selamat Datang'}
            </h1>
            <p className="text-sm text-gray-400 font-medium mt-1">
              {isRegister? 'Daftar untuk mulai mengelola Gmail' : 'Pusat Gmail - Kelola Akun Anda'}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border-2 border-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm text-sm"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Login via Google
            </button>

            {/* HAPUS 2 tombol ini biar ga kacau */}
            {/* <button onClick={() => onLogin('user')}>Login with User</button> */}
            {/* <button onClick={() => onLogin('admin')}>Login with Admin</button> */}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              {isRegister? 'Sudah punya akun? Login' : 'Belum punya akun? Register'}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 leading-relaxed font-medium uppercase tracking-widest">
            Dengan masuk, Anda menyetujui <br />
            <span className="text-gray-600">Syarat Layanan</span> dan <span className="text-gray-600">Kebijakan Keamanan</span>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;