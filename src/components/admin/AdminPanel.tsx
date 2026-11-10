import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { supabase } from '../../supabase';
import { formatWIB, timeAgo } from '../../lib/datetime';
import { isPendingSubmission, submissionStatus } from '../../lib/submissionStatus';
import { Eye } from 'lucide-react';
import { ActivityItem, buildActivities, fetchRecentSpinWins } from '../../lib/activity';
import { Send, Gift, ArrowUpRight } from 'lucide-react';
import { Users, Database, CreditCard, Loader2, CheckCircle, Mail, Settings, Wallet, ClipboardList, LogOut, ChevronRight, User as UserIcon } from 'lucide-react';

interface AdminPanelProps {
  submissions: any[];
  withdrawRequests: any[];
  onUpdateStatus: (id: string, status: 'paid' | 'rejected' | 'review', reason?: string) => void;
  onUpdateWithdrawStatus: (id: string, status: 'paid' | 'rejected', reason?: string) => void;
  activeTab: 'dashboard' | 'setoran' | 'payout' | 'profil' | 'withdraw-settings' | 'task-settings';
  setTab: (tab: any) => void;
  onLogout: () => void;
  settings: any;
  updateSettings: (s: any) => void;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
  sgEarned: number;
  sgSpendable: number;
  isLoadingSg: boolean;
  /** Simpan pengaturan ke database (tabel app_settings) agar tersinkron ke semua user */
  onSaveSettings?: () => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  submissions, 
  withdrawRequests, 
  onUpdateStatus, 
  onUpdateWithdrawStatus, 
  activeTab, 
  setTab,
  sgEarned, 
  sgSpendable, 
  isLoadingSg, 
  onLogout,
  settings,
  updateSettings,
  showAlert,
  onSaveSettings
}) => {
  const [savingSettings, setSavingSettings] = useState(false);
  // Nama pengirim setoran: peta userId -> nama (fallback prefix email)
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from('pengguna').select('id, nama').then(({ data }: any) => {
      const map: Record<string, string> = {};
      (data || []).forEach((u: any) => { if (u.nama) map[u.id] = u.nama; });
      setSenderNames(map);
    });
  }, []);
  // Aktivitas terbaru: setoran, request withdraw, dan hadiah spin harian
  const [spinWins, setSpinWins] = useState<any[]>([]);
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    let alive = true;
    fetchRecentSpinWins().then(rows => { if (alive) setSpinWins(rows); });
    return () => { alive = false; };
  }, [activeTab]);
  const nameOf = (id?: string, fallbackEmail?: string) => senderNames[id || ''] || String(fallbackEmail || '').split('@')[0] || 'User';
  const activities: ActivityItem[] = buildActivities(submissions, withdrawRequests, spinWins, nameOf).slice(0, 8);

  const senderName = (sub: any) => sub.userName || senderNames[sub.userId] || String(sub.userEmail || '').split('@')[0] || '-';

  // Salin email ke clipboard (dengan tanda centang sesaat)
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1500);
  };
  const CopyBtn = ({ text, k, label }: { text: string; k: string; label: string }) => (
    <button
      type="button"
      onClick={() => copyText(text, k)}
      title={label}
      aria-label={label}
      className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${copiedKey === k ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
    >
      {copiedKey === k ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
  const saveAndBack = async (label: string) => {
    setSavingSettings(true);
    try {
      if (onSaveSettings) await onSaveSettings();
      showAlert('Berhasil!', `Setting ${label} disimpan & berlaku untuk semua user.`);
      setTab('dashboard');
    } catch (err: any) {
      showAlert('Gagal!', 'Gagal menyimpan setting: ' + (err?.message || err), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Halaman Setor & Pay hanya menampilkan yang masih perlu diproses (riwayat tetap ada di akun user)
  // Setoran yang belum diputuskan: status proses atau sedang direview admin
  const pendingSubmissions = submissions.filter((s: any) => isPendingSubmission(s.status));
  const reviewCount = pendingSubmissions.filter((s: any) => s.status === 'review').length;
  const pendingWithdraws = withdrawRequests.filter((w: any) => w.status === 'process');

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:col-span-2">
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
            <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-3">
              <Users size={20} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Saldo Utama</p>
            {isLoadingSg? (
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    ) : (
      <p className="text-2xl font-black text-gray-800">${sgEarned.toFixed(4)}</p> // earned
    )}
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
            <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 mb-3">
              <Database size={20} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Saldo Pending</p>
{isLoadingSg? (
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    ) : (
      <p className="text-2xl font-black text-gray-800">${sgSpendable.toFixed(4)}</p> // spendable
    )}
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 col-span-2 lg:col-span-1">
            <div className="bg-purple-50 w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 mb-3">
              <CreditCard size={20} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Pendapatan Sistem</p>
            <p className="text-2xl font-black text-gray-800">Rp. 13.587.200</p>
          </div>
        </div>

        {/* Setting Panel Card */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={20} className="text-gray-400" />
            <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Setting Panel</h3>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => setTab('withdraw-settings')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wallet size={18} className="text-blue-500" />
                <span className="text-sm font-bold text-gray-700">Sistem Withdraw</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            <button 
              onClick={() => setTab('task-settings')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={18} className="text-emerald-500" />
                <span className="text-sm font-bold text-gray-700">Sistem Tugas</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Aktivitas Terakhir</h3>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs font-bold text-gray-400 text-center py-6">Belum ada aktivitas user</p>
            ) : activities.map(a => (
              <div key={a.id} className="flex items-center gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${a.type === 'setoran' ? 'bg-blue-50 text-blue-600' : a.type === 'withdraw' ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'}`}>
                  {a.type === 'setoran' ? <Send size={15} /> : a.type === 'withdraw' ? <ArrowUpRight size={16} /> : <Gift size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 leading-snug"><b>{a.name}</b> {a.text}</p>
                  <p className="text-[10px] text-gray-400" title={formatWIB(a.at)}>{timeAgo(a.at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'withdraw-settings') {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setTab('dashboard')} className="p-2 bg-gray-50 rounded-full">
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <h2 className="text-xl font-bold">Setting Sistem Withdraw</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Jadwalkan Withdraw</label>
              <select 
                value={settings.withdrawSchedule}
                onChange={(e) => updateSettings({ ...settings, withdrawSchedule: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 font-bold text-gray-700 outline-none"
              >
                <option value="Selalu Buka">Selalu Buka</option>
                <option value="Senin - Jumat">Senin - Jumat</option>
                <option value="Sabtu - Minggu">Sabtu - Minggu</option>
                <option value="Kunci">Kunci (Tutup Sepenuhnya)</option>
              </select>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[10px] text-blue-700 font-medium leading-relaxed italic">
                * Jika diatur ke hari tertentu, tombol withdraw pada POV user hanya akan aktif pada hari tersebut.
              </p>
            </div>
            <button 
              onClick={() => saveAndBack('withdraw')}
              disabled={savingSettings}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {savingSettings && <Loader2 size={18} className="animate-spin" />} Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'task-settings') {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setTab('dashboard')} className="p-2 bg-gray-50 rounded-full">
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <h2 className="text-xl font-bold">Setting Sistem Tugas</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Bayaran Per Akun (IDR)</label>
              <input 
                type="number"
                value={settings.taskReward}
                onChange={(e) => updateSettings({ ...settings, taskReward: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password Tugas (Kunci)</label>
              <input 
                type="text"
                value={settings.taskPassword}
                onChange={(e) => updateSettings({ ...settings, taskPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Deskripsi Tugas</label>
              <textarea 
                rows={4}
                value={settings.taskDescription}
                onChange={(e) => updateSettings({ ...settings, taskDescription: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 font-medium text-sm outline-none resize-none"
              />
            </div>
            <button 
              onClick={() => saveAndBack('tugas')}
              disabled={savingSettings}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {savingSettings && <Loader2 size={18} className="animate-spin" />} Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'profil') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-white shadow-md">
            <UserIcon size={48} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Administrator</h2>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Main Admin Account</p>
          
          <div className="mt-10 border-t border-gray-50 pt-8">
            <button 
              onClick={onLogout}
              className="w-full py-4 rounded-2xl bg-white border border-red-100 text-red-500 font-bold shadow-lg flex items-center justify-center gap-2 active:bg-red-50"
            >
              <LogOut size={18} />
              Logout System
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'setoran') {
    return (
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h2 className="text-xl font-bold text-gray-800">Data Setoran User</h2>
          <span className="text-xs font-bold text-orange-600">{pendingSubmissions.length} menunggu proses{reviewCount > 0 && <span className="text-blue-600"> · {reviewCount} direview</span>}</span>
        </div>
        {pendingSubmissions.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-lg text-center text-gray-400">
             Tidak ada setoran yang menunggu diproses
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pendingSubmissions.map((sub) => (
            <div key={sub.id} className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                   <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Mail size={16} />
                   </div>
                   <p className="text-sm font-bold text-gray-700 break-all min-w-0 pt-1">{sub.email}</p>
                </div>
                <CopyBtn text={sub.email} k={`sub-${sub.id}`} label="Salin email setoran" />
              </div>

              {/* Pengirim setoran */}
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-black flex-shrink-0">
                  {senderName(sub).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Pengirim</p>
                  <p className="text-xs font-bold text-gray-700 truncate">{senderName(sub)}</p>
                  <p className="text-[10px] text-gray-400 truncate">{sub.userEmail || '-'}</p>
                </div>
                {sub.userEmail && <CopyBtn text={sub.userEmail} k={`user-${sub.id}`} label="Salin email pengirim" />}
              </div>
              
              <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                <div className="flex justify-between text-[10px]">
                   <span className="text-gray-400">Password</span>
                   <span className="font-bold text-gray-600">{sub.password}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                   <span className="text-gray-400">Status</span>
                   <span className={`px-2 py-0.5 rounded-md font-black uppercase ${submissionStatus(sub.status).badge}`}>{submissionStatus(sub.status).label}</span>
                </div>
              </div>

              {isPendingSubmission(sub.status) && (
                <div className="flex gap-2">
                  {/* Review (biru) = setoran sedang diproses admin; terlihat juga oleh user */}
                  {sub.status === 'process' ? (
                    <button
                      onClick={() => onUpdateStatus(sub.id, 'review')}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Eye size={14} /> Review
                    </button>
                  ) : (
                    <span className="flex-1 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                      <Eye size={14} /> Direview
                    </span>
                  )}
                  <button 
                    onClick={() => onUpdateStatus(sub.id, 'paid')}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                  >
                    Set Paid
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(sub.id, 'rejected')}
                    className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold"
                  >
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'payout') {
    return (
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-2 mb-2 px-2">
          <h2 className="text-xl font-bold text-gray-800">Withdrawal Requests</h2>
          <span className="text-xs font-bold text-orange-600">{pendingWithdraws.length} menunggu proses</span>
        </div>
        {pendingWithdraws.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-lg text-center text-gray-400">
             Tidak ada request withdraw yang menunggu diproses
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pendingWithdraws.map((req) => (
            <div key={req.id} className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                 <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Amount</p>
                    <p className="text-lg font-black text-gray-800">Rp. {req.amount.toLocaleString('id-ID')}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Method</p>
                    <p className="text-sm font-bold text-blue-600">{req.method || 'E-Wallet'}</p>
                 </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl mb-4 space-y-2">
                 <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Nomor/Account</span>
                    <span className="font-bold text-gray-800">{req.walletNumber || '0812XXXXXXXX'}</span>
                 </div>
                 <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Nama Pengguna</span>
                    <span className="font-bold text-gray-800 truncate">{req.userName || nameOf(req.userId, req.userEmail)}</span>
                 </div>
                 <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Tanggal</span>
                    <span className="font-bold text-gray-800">{formatWIB(req.date)}</span>
                 </div>
              </div>

              {req.status === 'process' ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => onUpdateWithdrawStatus(req.id, 'paid')}
                    className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle size={16} />
                    Bayar
                  </button>
                  <button 
                    onClick={() => onUpdateWithdrawStatus(req.id, 'rejected')}
                    className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-bold shadow-sm"
                  >
                    Tolak
                  </button>
                </div>
              ) : (
                <div className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed ${req.status === 'paid' ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-400'}`}>
                  <CheckCircle size={16} />
                  {req.status === 'paid' ? 'Sudah Terbayar' : 'Ditolak'}
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default AdminPanel;
