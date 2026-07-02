import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Copy, CheckCircle2, ChevronDown, Bell, CreditCard, Mail, AlertTriangle } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import ElectricBorder from './ElectricBorder';
import { Autoplay, Pagination } from 'swiper/modules';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import 'swiper/css';
import 'swiper/css/pagination';

interface DashboardProps {
  balance: number;
  onWithdraw: () => void;
  isMusicPlaying: boolean;
  settings: {
    taskReward: number;
    withdrawSchedule: string;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ balance, onWithdraw, settings, isMusicPlaying }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [fakeLogs, setFakeLogs] = useState<any[]>([]);
  const warningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#warning' && warningRef.current) {
        warningRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fake logs generation (Logic murni dari file lama)
  useEffect(() => {
    const names = ["Andi", "Budi", "Citra", "Dewi", "Eko", "Fani", "Gita", "Hadi", "Indra", "Joko", "Karin", "Lutfi", "Maya", "Nita", "Oki", "Putra", "Rina", "Santi", "Taufik", "Umar", "Vina", "Wawan", "Yanto", "Zaki", "Ani", "Bambang", "Chandra", "Dini", "Endah", "Farhan", "Galih", "Hana", "Iwan", "Julia", "Kurnia", "Lia", "Maman", "Novi", "Oscar", "Pratiwi", "Rian", "Siska", "Tono", "Utami", "Veri", "Wati", "Yulia", "Zul"];

    const generateLog = () => {
      const isWithdraw = Math.random() > 0.5;
      const name = names[Math.floor(Math.random() * names.length)];
      const censoredName = name.length > 2? name.substring(0, 2) + "***" : name + "***";

      if (isWithdraw) {
        let amount;
        const roll = Math.random();
        if (roll < 0.7) {
          amount = Math.floor(Math.random() * 9001) + 1000;
        } else if (roll < 0.95) {
          amount = Math.floor(Math.random() * 40001) + 10000;
        } else {
          amount = Math.floor(Math.random() * 50001) + 50000;
        }

        return {
          id: Math.random(),
          title: "Sukses Withdraw",
          user: censoredName,
          amount: amount,
          type: 'wd'
        };
      } else {
        const emailPrefix = Math.random().toString(36).substring(2, 6);
        return {
          id: Math.random(),
          title: "Sukses Submit Tugas",
          user: censoredName,
          email: emailPrefix + "***@gmail.com",
          type: 'task'
        };
      }
    };

    setFakeLogs([generateLog(), generateLog(), generateLog()]);

    const interval = setInterval(() => {
      setFakeLogs(prev => [generateLog(),...prev.slice(0, 2)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const faqs = [
    {
      q: "Kenapa tugas saya ditolak?",
      a: "Tugas ditolak karena tidak memenuhi syarat dan ketentuan yang berlaku seperti nama yang digunakan tidak masuk kriteria atau alasan keamanan lainnya."
    },
    {
      q: "Kenapa withdraw saya ditolak?",
      a: "Withdraw ditolak karena tidak memenuhi syarat dan ketentuan yang berlaku yaitu terdapat biaya admin/fee pada alamat penarikan nya."
    }
  ];
  
  const [names, setNames] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateNames = () => {
    setIsGenerating(true);
    const prefixes = ['John', 'Emily', 'Michael', 'Sarah', 'David', 'Jessica', 'Robert', 'Ashley', 'William', 'Taylor', 'James', 'Linda', 'Brian', 'Karen', 'Steven', 'Susan', 'Kevin', 'Donna', 'Jason', 'Carol'];
    const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

    setTimeout(() => {
      const newNames = Array.from({ length: 5 }, () => {
        const p = prefixes[Math.floor(Math.random() * prefixes.length)];
        const s = surnames[Math.floor(Math.random() * surnames.length)];
        const num = Math.floor(Math.random() * 99) + 1;
        return `${p.toLowerCase()}${s.toLowerCase()}${num}@gmail.com`;
      });
      setNames(newNames);
      setIsGenerating(false);
    }, 600);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Balance Card - (UI dari file baru, dengan penyesuaian logic (balance ?? 0) dari file lama) */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
        <p className="text-gray-500 text-sm font-medium">Saldo Utama</p>
        <h2 className="text-3xl font-bold mt-1 text-gray-900">Rp. {(balance ?? 0).toLocaleString('id-ID')}</h2>
        
        <div className="mt-6 flex items-center justify-between bg-blue-50/50 p-3 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2">
            <p className="text-xs text-blue-700 font-medium">Minimal penarikan: <span className="font-bold">Rp. 1.000</span></p>
          </div>
          <button 
            onClick={onWithdraw}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md active:scale-95"
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Marquee Welcome Line - WHITE, FULL WIDTH ON MOBILE */}
      <div className="bg-white -mx-4 px-4 py-3 shadow-sm border-y border-gray-100">
        <div className="overflow-hidden">
          <div className="whitespace-nowrap animate-marquee flex items-center gap-4">
             <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">
               Selamat datang! Kerjakan tugas untuk mulai dapatkan penghasilan pertama mu. &bull; 
               Selamat datang! Kerjakan tugas untuk mulai dapatkan penghasilan pertama mu. &bull; 
               Selamat datang! Kerjakan tugas untuk mulai dapatkan penghasilan pertama mu.
             </span>
          </div>
        </div>
      </div>

      {/* Flat Rate Info - ELECTRIC BORDER */}
      <ElectricBorder
        color="#10b981"
        speed={1}
        chaos={0.15}
        borderRadius={16}
      >
        <div className="bg-white rounded-2xl p-6 shadow-lg text-emerald-600 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-black text-lg leading-tight uppercase tracking-tight">Pembayaran Flat Rate</h4>
              <p className="text-2xl font-black mt-1">Rp. {settings.taskReward.toLocaleString('id-ID')} <span className="text-xs font-bold text-emerald-400">/ akun</span></p>
            </div>
            {isMusicPlaying && (
              <div className="w-16 h-16 -mt-2 -mr-2 flex items-center justify-center">
                {/* @ts-ignore */}
                <dotlottie-wc 
                  src="https://lottie.host/3eececda-841f-4894-8c0a-46376e8701ce/4vtOMazaWa.lottie" 
                  autoplay 
                  loop
                  style={{ width: '100%', height: '100%' }}
                ></dotlottie-wc>
              </div>
            )}
          </div>
          <p className="text-[11px] mt-3 leading-relaxed font-bold">
            Kamu bisa buat dan setorkan sebanyak-banyaknya tanpa batasan pembayaran (max pay out). Sistem pembayaran cepat!
          </p>
        </div>
      </ElectricBorder>

      {/* Slider */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 3000 }}
          pagination={{ clickable: true }}
          className="h-40"
        >
          <SwiperSlide>
            <img src="/slider1.jpg" alt="Promo 1" className="w-full h-full object-cover" />
          </SwiperSlide>
          <SwiperSlide>
            <img src="/slider2.jpg" alt="Promo 2" className="w-full h-full object-cover" />
          </SwiperSlide>
        </Swiper>
      </div>

      {/* Log Fake User Activity */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-blue-600" size={18} />
          <h3 className="font-black text-xs text-gray-800 uppercase tracking-widest">Aktivitas Terbaru</h3>
        </div>
        <div className="space-y-3">
          {fakeLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.type === 'wd' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {log.type === 'wd' ? <CreditCard size={14} /> : <Mail size={14} />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{log.title}</p>
                  <p className="text-xs font-bold text-gray-700">
                    {log.user} {log.type === 'wd' ? '' : `- ${log.email}`}
                  </p>
                </div>
              </div>
              {log.type === 'wd' && (
                <span className="text-[11px] font-black text-emerald-600">
                  Rp {log.amount.toLocaleString('id-ID')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generate Name Card */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Generate Nama Amerika</h3>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed font-medium">
            Fitur ini adalah cara cepat kamu mendapatkan nama random yang sudah ter-filter sistem untuk di daftarkan pada aplikasi Gmail lalu di setorkan kesini.
          </p>
          <p className="text-[10px] text-orange-500 font-bold mt-2 italic">
            * Alamat email ini bersifat random dan mungkin saja sudah terdaftar, ini hanya sebagai referensi cepat.
          </p>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Buat nama dari Amerika (ini)</span>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold">Rp. 1.000</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Buat nama dari database</span>
            <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-bold">Rp. 1.600</span>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button 
            onClick={generateNames}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 px-5 py-2.5 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            {names.length > 0 ? 'Re generate' : 'Generate'}
          </button>
        </div>

        {names.length > 0 && (
          <div className="space-y-2">
            {names.map((name, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-semibold text-gray-700">{name}</span>
                <button 
                  onClick={() => copyToClipboard(name, idx)}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors relative"
                >
                  {copiedIndex === idx ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real-time Activity Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="press">
          <div className="sheet"></div>
          <div className="roll"></div>
          <div className="sheet"></div>
          <div className="roll"></div>
          <div className="sheet"></div>
          <div className="roll"></div>
          <div className="sheet"></div>
          <div className="sheet"></div>
          <div className="sheet"></div>
          <div className="sheet"></div>
          <div className="sheet"></div>
          <div className="roll"></div>
        </div>
        <div className="p-4 bg-white">
           <p className="text-[10px] text-gray-500 text-left leading-relaxed font-bold">
             Banyak orang sedang membuat nama dan mengerjakan tugas secara real time..
           </p>
        </div>
      </div>

      {/* Web View Section */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <h3 className="font-bold text-lg mb-2 text-gray-800">Cek Ketersediaan Email</h3>
        <p className="text-xs text-gray-500 mb-4">Kamu bisa cek ketersediaan alamat email dari nama random disini.</p>
        <div className="flex justify-start">
          <a 
            href="https://www.gmailchecklive.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-sm hover:bg-blue-700 transition-colors inline-block"
          >
            Buka Gmail Checker
          </a>
        </div>
      </div>

      {/* Warning Animation Card */}
      <div ref={warningRef} id="warning" className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex justify-center mb-4">
          <div className="w-48 h-48">
            <DotLottieReact
              src="https://lottie.host/06c4fcf8-4876-486d-a063-3f8682025985/r1cCpDZmkU.lottie"
              loop
              autoplay
            />
          </div>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-yellow-600" size={16} />
            <span className="text-xs font-black text-yellow-700 uppercase tracking-widest">Warning</span>
          </div>
          <p className="text-[10px] text-yellow-800 font-bold leading-relaxed text-justify">
            Hindari penggunaan Alamat email yang terlalu panjang seperti terlalu banyak angka di belakang dan nama yang tidak terdeteksi sebagai nama manusia, Syarat dan ketentuan utama dalam Campaign ini adalah menggunakan nama Manusia (LK/PR) yang lebih merujuk kepada nama orang Amerika. Jika Alamat email yang di setorkan memiliki angka terlalu banyak di belakang nama (max 4) dan Nama yang tidak terdeteksi sebagai manusia (Amerika) maka akan terdeteksi sebagai Alamat email Robot dan Tugas akan ditolak.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <h3 className="font-bold text-lg mb-4 text-gray-800">FAQ</h3>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-sm font-bold text-gray-700">{faq.q}</span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="p-4 bg-white border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                  <p className="text-xs text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;