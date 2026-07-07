import React, { useState } from 'react';
import { MessageCircle, Send, Mail, X, ChevronRight, Music, Play, Pause } from 'lucide-react';

interface SupportBubbleProps {
  audioRef: React.MutableRefObject<HTMLAudioElement>;
  isMusicPlaying: boolean;
  setIsMusicPlaying: (val: boolean) => void;
}

const SupportBubble: React.FC<SupportBubbleProps> = ({
  audioRef,
  isMusicPlaying,
  setIsMusicPlaying
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'none' | 'main' | 'support' | 'music'>('none');

  const toggleVisibility = () => {
    if (!isOpen) {
      setIsOpen(true);
      setActiveMenu('main');
    } else {
      closeAll();
    }
  };

  const closeAll = () => {
    setIsOpen(false);
    setActiveMenu('none');
  };

  const handleToggleMusic = () => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play();
      setIsMusicPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {/* Overlay */}
      {isOpen && (
        <div 
          className="absolute inset-0 pointer-events-auto bg-black/0" 
          onClick={closeAll}
        />
      )}
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center transition-all duration-300 pointer-events-auto">
        {/* Sub Cards */}
        {activeMenu === 'support' && (
          <div className="mr-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-64 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveMenu('main')}>
                   <ChevronRight className="rotate-180" size={16} />
                </button>
                <h3 className="font-bold text-sm">Support</h3>
              </div>
              <button onClick={closeAll}>
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <a href="https://t.me/Panelkitalegalbot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white"><Send size={16} /></div>
                <div><p className="text-[10px] font-bold text-blue-400 uppercase leading-none mb-1">Telegram</p><p className="text-xs font-bold text-blue-700">Chat with us</p></div>
              </a>
              <a href="mailto:boosteryukid@gmail.com" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white"><Mail size={16} /></div>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Email</p><p className="text-xs font-bold text-gray-700">Send an Email</p></div>
              </a>
            </div>
          </div>
        )}

        {activeMenu === 'music' && (
          <div className="mr-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-56 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="bg-purple-600 p-3 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveMenu('main')}>
                   <ChevronRight className="rotate-180" size={14} />
                </button>
                <h3 className="font-bold text-xs">Music Player</h3>
              </div>
              <button onClick={closeAll}>
                <X size={14} />
              </button>
            </div>
            <div className="p-4 text-center">
              <div className={`w-12 h-12 bg-purple-50 rounded-full mx-auto flex items-center justify-center text-purple-600 mb-3 ${isMusicPlaying ? 'animate-pulse' : ''}`}>
                <Music size={24} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest">Background Music</p>
              <button 
                onClick={handleToggleMusic}
                className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${isMusicPlaying ? 'bg-red-50 text-red-500' : 'bg-purple-600 text-white shadow-lg shadow-purple-100'}`}
              >
                {isMusicPlaying ? <><Pause size={14} /> Stop</> : <><Play size={14} /> Play</>}
              </button>
            </div>
          </div>
        )}

        {/* Main Selection Menu */}
        {activeMenu === 'main' && (
          <div className="mr-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-48 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
             <div className="p-2 space-y-1">
                <button onClick={() => setActiveMenu('support')} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"><MessageCircle size={18} /></div>
                  <span className="text-sm font-bold text-gray-700">Support</span>
                </button>
                <button onClick={() => setActiveMenu('music')} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600"><Music size={18} /></div>
                  <span className="text-sm font-bold text-gray-700">Musik</span>
                </button>
             </div>
          </div>
        )}

        {/* Bubble Trigger */}
        <div 
          onClick={toggleVisibility}
          className={`bg-blue-600 h-14 w-14 rounded-l-full shadow-lg flex items-center justify-center text-white cursor-pointer transition-all duration-300 transform ${isOpen ? '-translate-x-0' : 'translate-x-10 hover:translate-x-8'}`}
        >
          <div className="flex items-center pr-1">
            {isOpen ? <X size={24} /> : <ChevronRight className="rotate-180" size={24} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportBubble;
