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
    <div className="min-h-screen bg-gray-50 flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-gray-100 overflow-hidden">
        <div className="p-8">
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
  );
};

export default AuthPage;