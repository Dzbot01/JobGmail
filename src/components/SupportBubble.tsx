import React, { useState } from 'react';
import { MessageCircle, Send, Mail, X, ChevronRight } from 'lucide-react';

const SupportBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleVisibility = () => {
    setIsOpen(!isOpen);
    if (isExpanded) setIsExpanded(false);
  };

  const toggleCard = () => {
    setIsExpanded(!isExpanded);
  };

  const closeAll = () => {
    setIsOpen(false);
    setIsExpanded(false);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {/* Overlay to close when clicking outside */}
      {isOpen && (
        <div 
          className="absolute inset-0 pointer-events-auto bg-black/0" 
          onClick={closeAll}
        />
      )}
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center transition-all duration-300 pointer-events-auto">
        {/* Support Card */}
        {isExpanded && (
          <div className="mr-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-64 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-sm">Contact Support</h3>
              <button onClick={closeAll}>
                <X size={16} />
              </button>
            </div>
          <div className="p-4 space-y-3">
            <a 
              href="https://t.me/Panelkitalegalbot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <Send size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase leading-none mb-1">Telegram</p>
                <p className="text-xs font-bold text-blue-700">Chat with us</p>
              </div>
            </a>
            
            <a 
              href="mailto:boosteryukid@gmail.com"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white">
                <Mail size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Email</p>
                <p className="text-xs font-bold text-gray-700">Send an Email</p>
              </div>
            </a>
          </div>
            <div className="bg-gray-50 p-3 text-center">
               <p className="text-[10px] text-gray-400 font-medium italic">Online 24/7 Support</p>
            </div>
          </div>
        )}

        {/* Bubble Trigger */}
        <div 
          onClick={isOpen ? toggleCard : toggleVisibility}
          className={`bg-blue-600 h-14 w-14 rounded-l-full shadow-lg flex items-center justify-center text-white cursor-pointer transition-all duration-300 transform ${isOpen ? '-translate-x-0' : 'translate-x-10 hover:translate-x-8'}`}
        >
          <div className="flex items-center pr-1">
            {isOpen ? (
              <MessageCircle size={24} />
            ) : (
              <ChevronRight className="rotate-180" size={24} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportBubble;
