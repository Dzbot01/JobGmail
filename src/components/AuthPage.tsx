import React, { useEffect, useState } from 'react';
import { signInWithGoogle } from '../supabase';
import LightTunnel from './LightTunnel';

interface AuthPageProps {
  onLogin: (role: 'user' | 'admin') => void;
}

// Animasi WebGL hanya dipasang di desktop (panel brand disembunyikan di mobile)
const useIsDesktop = () => {
  const query = '(min-width: 1024px)';
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
};

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const isDesktop = useIsDesktop();

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
        {/* Panel brand (desktop): animasi LightTunnel + kartu transparan */}
        <div className="hidden lg:block relative overflow-hidden bg-[#030712] min-h-[560px]">
          {isDesktop && (
          <div className="absolute inset-0">
          <LightTunnel
            cableColor="#06b6d4"
            pulseColor="#3b82f6"
            cableCount={56}
            pulseDensity={0.5}
            flowDirection="inward"
            mouseInteraction
            clickSurge
            tunnelColor="#ffffff"
            tunnelOpacity={0}
            speed={0.1}
            pulseSpeed={2}
            pulseLength={0.28}
            pulseBlend={0.6}
            pulseWidth={1}
            thickness={0.35}
            rimWidth={0.15}
            waviness={0.3}
            sway={0.5}
            bend={0.4}
            glow={1}
            size={1}
            fadeNear={0.5}
            fadeFar={2}
            brightness={1}
            colorVariance
            grain={false}
            mouseStrength={0.1}
            intro
            lightMode={false}
          />
          </div>
          )}
          <div className="relative z-10 h-full min-h-[560px] flex flex-col justify-between p-8 pointer-events-none">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">Job Gmail</p>
            <div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.35)] p-8 space-y-4 text-white">
              <h2 className="text-3xl font-black leading-tight">Kerjakan tugas, setor akun, dan tarik saldo dengan mudah.</h2>
              <p className="text-sm font-medium text-white/75 leading-relaxed">Pembayaran flat rate per akun, withdraw ke Dana, Gopay, atau QRIS, dan riwayat tugas yang transparan.</p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">© 2026 Job Gmail Digital Solution</p>
          </div>
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