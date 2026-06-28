import React, { useEffect, useState } from 'react';
import { Users, Database, CreditCard, CheckCircle, Mail, Settings, Wallet, ClipboardList, LogOut, ChevronRight, User as UserIcon } from 'lucide-react';
import { supabase } from '../../supabase';

interface AdminPanelProps {
  submissions: any[];
  onUpdateStatus: (id: string, status: 'paid' | 'rejected', reason?: string) => void;
  onUpdateWithdrawStatus: (id: string, status: 'paid' | 'rejected', reason?: string) => void;
  activeTab: 'dashboard' | 'setoran' | 'payout' | 'profil' | 'withdraw-settings' | 'task-settings';
  setTab: (tab: any) => void;
  onLogout: () => void;
  settings: any;
  updateSettings: (s: any) => void;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

const handleUpdateWithdrawStatus = async (withdrawId: string, status: 'paid' | 'rejected', reason?: string) => {
  try {
    // 1. Cari withdraw data dari state admin
    const req = withdrawRequests.find(r => r.id === withdrawId);
    if (!req?.userEmail) { // pake userEmail aja, userId ga ada di HistoryItem
      showAlert('Error', 'Data withdraw tidak ditemukan', 'error');
      return;
    }

    // 2. Cari userId dari email, karena HistoryItem ga nyimpen userId
    const { data: userData, error: fetchError } = await supabase
      .from('pengguna')
      .select('id, withdraw_history, saldo')
      .eq('email', req.userEmail) // <-- pake email buat cari user
      .single();

    if (fetchError) throw fetchError;
    if (!userData) throw new Error('User tidak ditemukan');

    // 3. Update status withdraw di array withdraw_history
    let newHistory = (userData.withdraw_history || []).map((h: any) =>
      h.id === withdrawId
        ? {...h, status, reason: status === 'rejected'? (reason || 'Ditolak admin') : null }
        : h
    );

    // 4. Kalo ditolak, balikin saldo
    let newSaldo = userData.saldo;
    if (status === 'rejected') {
      const reqAmount = newHistory.find((h: any) => h.id === withdrawId)?.amount || 0;
      newSaldo = userData.saldo + reqAmount;
    }

    // 5. Update ke DB kolom withdraw_history + saldo
    const { error: updateError } = await supabase
      .from('pengguna')
      .update({ 
        withdraw_history: newHistory,
        saldo: newSaldo // <-- balikin saldo kalo ditolak
      })
      .eq('id', userData.id);

    if (updateError) throw updateError;

    showAlert('Sukses!', `Withdraw diubah ke ${status}`, 'success');
    
    // 6. Update state admin biar ga perlu refresh
    onUpdateWithdrawStatus(withdrawId, status, reason); // panggil prop dari App.tsx

  } catch (err: any) {
    showAlert('Gagal!', err.message, 'error');
    console.error(err);
  }
};

const AdminPanel: React.FC<AdminPanelProps> = ({
  submissions,
  withdrawRequests,
  onUpdateStatus: onUpdateStatusProp,
  onUpdateWithdrawStatus,
  activeTab,
  setTab,
  onLogout,
  settings,
  updateSettings,
  showAlert
}) => {
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [withdrawData, setWithdrawData] = useState<any[]>([]); // state baru buat payout

  // Fetch semua history dari semua user
  const fetchAllSubmissions = async () => {
    const { data, error } = await supabase
    .from('pengguna')
    .select('id, email, history')
    .not('history', 'is', null);

    if (error) {
      console.error(error);
      return;
    }

    const flat = (data || []).flatMap(user =>
      (user.history || [])
      .filter(task => task && task.id && task.type!== 'withdraw') // buang withdraw dari setoran
      .map((task: any) => ({
        ...task,
         userId: user.id,
         userEmail: user.email
       }))
    );

    setAllSubmissions(flat.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  };

  // Fetch withdraw + gabungin data payment user
const fetchWithdrawRequests = async () => {
  const { data, error } = await supabase
    .from('pengguna')
    .select('id, email, payment, withdraw_history') // <-- AMBIL withdraw_history
    .not('withdraw_history', 'is', null); // <-- FILTER yg ada isinya

  if (error) {
    console.error(error);
    return;
  }

  const requests = data.flatMap(user => {
    const payment = user.payment || {};

    return (user.withdraw_history || []) // <-- BACA DARI SINI
      .filter((h: any) => h.status === 'process') // <-- GA USAH CEK type, karena ini udah pasti withdraw
      .map((h: any) => ({
         id: h.id,
         userId: user.id,
         userEmail: h.userEmail || user.email, // <-- pake yg dari item, fallback ke email user
         amount: h.amount,
         date: h.date, // <-- lu udah format id-ID di App, jadi ga usah new Date lagi
         status: h.status,
         method: h.method || payment.method || 'E-Wallet', // <-- ambil dari item dulu
         walletNumber: h.walletNumber || payment.number || '-',
         userName: h.userName || payment.name || '-',
         qrisUrl: h.qrisUrl || payment.qris_url || null
       }));
  });

  setWithdrawData(requests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
};

  // Override onUpdateStatus biar update ke Supabase
  const handleUpdateStatus = async (taskId: string, status: 'paid' | 'rejected', reason?: string) => {
    try {
      const task = allSubmissions.find(t => t.id === taskId);
      if (!task?.userId) {
        showAlert('Error', 'userId kosong. Refresh dulu admin panel', 'error');
        return;
      }

      const { data: userData, error: fetchError } = await supabase
      .from('pengguna')
      .select('history, saldo')
      .eq('id', task.userId)
      .single();

      if (fetchError) throw fetchError;

      const historyArr = (userData?.history || []).map((t: any) =>
        t.id === taskId
        ? {...t, status, reason: status === 'rejected'? (reason || 'Ditolak admin') : null }
         : t
      );

      const newSaldo = status === 'paid'
       ? (userData?.saldo?? 0) + (settings.taskReward || 1000)
        : userData?.saldo;

      const { error: updateError } = await supabase
      .from('pengguna')
      .update({ history: historyArr, saldo: newSaldo })
      .eq('id', task.userId);

      if (updateError) throw updateError;

      showAlert('Sukses!', `Status diubah ke ${status}`, 'success');
      fetchAllSubmissions();
    } catch (err: any) {
      showAlert('Gagal!', err.message, 'error');
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'setoran') fetchAllSubmissions();
    if (activeTab === 'payout') fetchWithdrawRequests(); // tambah ini
  }, [activeTab]);

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-lg border-gray-100">
            <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-3">
              <Users size={20} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">User Terdaftar</p>
            <p className="text-2xl font-black text-gray-800">1,284</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-lg border-gray-100">
            <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 mb-3">
              <Database size={20} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Akun</p>
            <p className="text-2xl font-black text-gray-800">8,492</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-lg border-gray-100 col-span-2">
            <div className="bg-purple-50 w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 mb-3">
              <CreditCard size={20} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Pendapatan Sistem</p>
            <p className="text-2xl font-black text-gray-800">Rp. 13.587.200</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border-gray-100">
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

        <div className="bg-white p-6 rounded-2xl shadow-lg border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Aktivitas Terakhir</h3>
          <div className="space-y-4">
            {allSubmissions.slice(0, 3).map(i => (
              <div key={i.id} className="flex items-center gap-3 border-b border-gray-50 pb-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700">{i.userEmail} submit tugas</p>
                  <p className="text-[10px] text-gray-400">{new Date(i.timestamp).toLocaleString('id-ID')}</p>
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
        <div className="bg-white p-6 rounded-2xl shadow-lg border-gray-100">
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
                onChange={(e) => updateSettings({...settings, withdrawSchedule: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 font-bold text-gray-700 outline-none"
              >
                <option value="Selalu Buka">Selalu Buka</option>
                <option value="Senin - Jumat">Senin - Jumat</option>
                <option value="Sabtu - Minggu">Sabtu - Minggu</option>
                <option value="Kunci">Kunci (Tutup Sepenuhnya)</option>
              </select>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border-blue-100">
              <p className="text-[10px] text-blue-700 font-medium leading-relaxed italic">
                * Jika diatur ke hari tertentu, tombol withdraw pada POV user hanya akan aktif pada hari tersebut.
              </p>
            </div>
            <button
              onClick={() => { showAlert("Berhasil!", "Setting withdraw berhasil disimpan!"); setTab('dashboard'); }}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'task-settings') {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border-gray-100">
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
                onChange={(e) => updateSettings({...settings, taskReward: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password Tugas (Kunci)</label>
              <input
                type="text"
                value={settings.taskPassword}
                onChange={(e) => updateSettings({...settings, taskPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Deskripsi Tugas</label>
              <textarea
                rows={4}
                value={settings.taskDescription}
                onChange={(e) => updateSettings({...settings, taskDescription: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 font-medium text-sm outline-none resize-none"
              />
            </div>
            <button
              onClick={() => { showAlert("Berhasil!", "Setting tugas berhasil disimpan!"); setTab('dashboard'); }}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'profil') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-8 shadow-lg border-gray-100 text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-white shadow-md">
            <UserIcon size={48} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Administrator</h2>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Main Admin Account</p>

          <div className="mt-10 border-t border-gray-50 pt-8">
            <button
              onClick={onLogout}
              className="w-full py-4 rounded-2xl bg-white border-red-100 text-red-500 font-bold shadow-lg flex items-center justify-center gap-2 active:bg-red-50"
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
        <h2 className="text-xl font-bold text-gray-800 mb-2">Data Setoran User</h2>
        {allSubmissions.length === 0? (
          <div className="bg-white p-10 rounded-2xl shadow-lg text-center text-gray-400">
             Belum ada setoran masuk
          </div>
        ) : (
          allSubmissions.map((sub) => (
            <div key={sub.id} className="bg-white p-5 rounded-2xl shadow-lg border-gray-100 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                   <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Mail size={16} />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-gray-700 break-all">{sub.email}</p>
                     <p className="text-[10px] text-gray-400">{sub.userEmail}</p>
                   </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                <div className="flex justify-between text-[11px]">
                   <span className="text-gray-400">Password</span>
                   <span className="font-bold text-gray-600">{sub.password}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                   <span className="text-gray-400">Status</span>
                   <span className={`font-bold uppercase ${sub.status === 'paid'? 'text-emerald-600' : sub.status === 'rejected'? 'text-red-600' : 'text-orange-600'}`}>{sub.status}</span>
                </div>
              </div>

              {sub.status === 'process' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(sub.id, 'paid')}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Set Paid
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                    className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold"
                  >
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

if (activeTab === 'payout') {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-2 px-2">Withdrawal Requests</h2>
      {withdrawData.length === 0? ( // <-- GANTI INI
        <div className="bg-white p-10 rounded-2xl shadow-lg text-center text-gray-400">
           Belum ada request withdraw
        </div>
      ) : (
        withdrawData.map((req) => ( // <-- GANTI INI JUGA
          <div key={req.id} className="bg-white p-5 rounded-2xl shadow-lg border-gray-100">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Amount</p>
                  <p className="text-lg font-black text-gray-800">Rp. {req.amount.toLocaleString('id-ID')}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase">Method</p>
                  <p className="text-sm font-bold text-blue-600">{req.method}</p>
               </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl mb-4 space-y-2">
               <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400">Email User</span>
                  <span className="font-bold text-gray-800 break-all">{req.userEmail}</span>
               </div>
               {req.method === 'Qris' && req.qrisUrl? (
                <div className="pt-2">
                  <span className="text-[11px] text-gray-400 block mb-1">QRIS User:</span>
                  <img src={req.qrisUrl} className="w-32 h-32 rounded-lg border-gray-200 object-contain bg-white" />
                </div>
               ) : (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Nomor/Account</span>
                    <span className="font-bold text-gray-800">{req.walletNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Nama Pengguna</span>
                    <span className="font-bold text-gray-800">{req.userName}</span>
                  </div>
                </>
               )}
               <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400">Tanggal</span>
                  <span className="font-bold text-gray-800">{req.date}</span>
               </div>
            </div>

            {req.status === 'process'? (
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateWithdrawStatus(req.id, 'paid')} // <-- ini juga ganti handleUpdate -> onUpdate
                  className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle size={18} />
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
              <div className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed ${req.status === 'paid'? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-400'}`}>
                <CheckCircle size={18} />
                {req.status === 'paid'? 'Sudah Terbayar' : 'Ditolak'}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

  return null;
};

export default AdminPanel;