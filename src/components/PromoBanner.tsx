import React from 'react';
import { X, Send } from 'lucide-react';

interface PromoBannerProps {
  username: string;
  onClose: () => void;
}

/** Banner info kerja sama PanelKitaLegalbot, tampil di bawah header. */
const PromoBanner: React.FC<PromoBannerProps> = ({ username, onClose }) => (
  <div
    role="region"
    aria-label="Informasi kerja sama"
    className="relative bg-gradient-to-r from-[#0b1d4d] via-[#123a8a] to-[#0e5fbf] text-white shadow-md"
  >
    <div className="flex items-start gap-3 px-4 sm:px-5 py-2.5 pr-11 max-w-6xl lg:mx-auto">
      <div className="mt-0.5 w-7 h-7 rounded-full bg-[#229ED9] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(34,158,217,.7)]">
        <Send size={14} className="-ml-0.5" />
      </div>
      <p className="text-[11px] sm:text-xs leading-relaxed text-white/90">
        <span className="font-black text-white">Halo {username}</span>, Kami telah bekerja sama dengan{' '}
        <span className="font-black text-cyan-300">PanelKitaLegalbot</span> yang menyediakan banyak layanan Hosting seperti
        Panel Pterodactyl, VPS dan Suntik Sosmed yang pastinya harga terjangkau! Ayo kunjungi Bot-nya{' '}
        <a
          href="https://t.me/PanelKitaLegalbot"
          target="_blank"
          rel="noopener noreferrer"
          className="font-black text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
        >
          disini
        </a>
      </p>
    </div>
    <button
      onClick={onClose}
      aria-label="Tutup banner"
      className="absolute top-2 right-2 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
    >
      <X size={16} />
    </button>
  </div>
);

export default PromoBanner;
