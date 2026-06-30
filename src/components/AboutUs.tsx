import React from 'react';
import { ArrowLeft, BookOpen, Globe, Mail, ShieldCheck } from 'lucide-react';

interface AboutUsProps {
  onBack: () => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onBack }) => {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-gray-100 active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Tentang Kami</h2>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 z-0" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3 text-blue-600">
            <BookOpen size={24} />
            <h3 className="font-black text-lg">Visi & Misi Kami</h3>
          </div>

          <div className="prose prose-sm text-gray-600 leading-relaxed font-medium">
            <p>
              Selamat datang di <span className="text-blue-600 font-bold">Job Gmail</span>, platform penyedia layanan verifikasi dan manajemen akun terpercaya yang menghubungkan ribuan pekerja digital di seluruh Indonesia.
            </p>
            <p className="mt-4">
              Kami berfokus pada campaign optimasi ekosistem digital melalui pembuatan akun Gmail yang berkualitas. Misi kami adalah memberikan peluang penghasilan tambahan yang mudah diakses oleh siapa saja, di mana saja, hanya dengan bermodalkan perangkat smartphone.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-6">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase mb-1">Jangkauan Global</h4>
                <p className="text-[10px] text-gray-500 leading-tight">Mendukung pertumbuhan bisnis internasional melalui penyediaan data yang ter-filter dengan baik.</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase mb-1">Keamanan Data</h4>
                <p className="text-[10px] text-gray-500 leading-tight">Menjamin keamanan setiap data yang disetorkan dengan enkripsi tingkat tinggi dan audit manual.</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-100">
             <div className="flex items-center gap-2 mb-3">
                <Mail size={18} />
                <h4 className="font-black uppercase text-xs tracking-widest">Campaign Gmail</h4>
             </div>
             <p className="text-[11px] leading-relaxed opacity-90">
               Campaign pembuatan akun Gmail ini dirancang khusus untuk memenuhi standar industri. Kami menghargai setiap kerja keras Anda dengan sistem pembayaran flat rate yang kompetitif dan proses withdraw yang transparan. Bergabunglah bersama komunitas kami dan mulailah membangun aset digital Anda hari ini!
             </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 text-center">
         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2026 Job Gmail Digital Solution</p>
      </div>
    </div>
  );
};

export default AboutUs;
