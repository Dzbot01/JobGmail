import React from 'react';
import { Mail, Clock, CheckCircle, X } from 'lucide-react';

interface HistoryItem {
  id: string;
  email: string;
  status: 'process' | 'paid' | 'rejected';
  timestamp: string;
  reason?: string;
}

interface UserHistoryProps {
  submissions: HistoryItem[];
}

const UserHistory: React.FC<UserHistoryProps> = ({ submissions }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-black text-gray-800 mb-2 px-2 uppercase tracking-wide">Riwayat Tugas</h2>
      {submissions.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-3">
            <Mail size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400">Belum ada riwayat</p>
        </div>
      ) : (
        submissions.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-50 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  item.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                  item.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {item.status === 'paid' ? <CheckCircle size={18} /> : 
                   item.status === 'rejected' ? <X size={18} /> : <Clock size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-800 truncate max-w-[140px] uppercase">{item.email}</p>
                  <p className="text-[9px] text-gray-400 font-bold">{item.timestamp}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${
                  item.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 
                  item.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
            {item.status === 'rejected' && item.reason && (
              <div className="px-4 pb-3">
                <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                  <p className="text-[9px] font-black text-red-400 uppercase mb-0.5">Ditolak:</p>
                  <p className="text-[10px] text-red-700 font-bold leading-tight">{item.reason}</p>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default UserHistory;
