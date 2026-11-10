import React from 'react';
import { Mail, Clock, CheckCircle, X, Eye } from 'lucide-react';
import { submissionStatus } from '../lib/submissionStatus';
import { formatWIB } from '../lib/datetime';
import { HISTORY_LIMIT } from '../lib/jobs';

interface HistoryItem {
  id: string;
  email: string;
  status: 'process' | 'review' | 'paid' | 'rejected';
  timestamp: string;
  reason?: string;
}

interface UserHistoryProps {
  submissions: HistoryItem[];
}

const UserHistory: React.FC<UserHistoryProps> = ({ submissions }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2 mb-2 px-2">
        <h2 className="text-base font-black text-gray-800 uppercase tracking-wide">Riwayat Setor</h2>
        {submissions.length > HISTORY_LIMIT && (
          <span className="text-[10px] font-bold text-gray-400">{HISTORY_LIMIT} terbaru dari {submissions.length}</span>
        )}
      </div>
      {submissions.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-3">
            <Mail size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400">Belum ada riwayat</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {submissions.slice(0, HISTORY_LIMIT).map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-50 overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center ${submissionStatus(item.status).soft}`}>
                  {item.status === 'paid' ? <CheckCircle size={18} /> : 
                   item.status === 'rejected' ? <X size={18} /> :
                   item.status === 'review' ? <Eye size={18} /> : <Clock size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-800 truncate uppercase">{item.email}</p>
                  <p className="text-[9px] text-gray-400 font-bold">{formatWIB(item.timestamp)}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${submissionStatus(item.status).badge}`}>
                  {submissionStatus(item.status).label}
                </span>
              </div>
            </div>
            {item.status === 'review' && (
              <p className="px-4 pb-3 text-[10px] font-bold text-blue-600">Setoran ini sedang diproses admin.</p>
            )}
            {item.status === 'rejected' && item.reason && (
              <div className="px-4 pb-3">
                <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                  <p className="text-[9px] font-black text-red-400 uppercase mb-0.5">Ditolak:</p>
                  <p className="text-[10px] text-red-700 font-bold leading-tight">{item.reason}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

export default UserHistory;
