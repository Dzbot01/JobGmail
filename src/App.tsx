import React, { useState, useEffect } from 'react';
import { Home, Gift, Inbox, User, LayoutDashboard, Send, CreditCard, History as HistoryIcon } from 'lucide-react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; // IMPORT SUPABASE

// Components
import Dashboard from './components/Dashboard';
import Gacha from './components/Gacha';
import Setoran from './components/Setoran';
import Profil from './components/Profil';
import AboutUs from './components/AboutUs';
import AlamatPenarikan from './components/AlamatPenarikan';
import WithdrawPage, { HistoryItem } from './components/WithdrawPage';
import AuthPage from './components/AuthPage';
import AdminPanel from './components/admin/AdminPanel';
import UserHistory from './components/UserHistory';
import SupportBubble from './components/SupportBubble';
import CustomAlert from './components/CustomAlert';

type AdminTab = 'dashboard' | 'setoran' | 'payout' | 'profil' | 'withdraw-settings' | 'task-settings';

// 1. KONSTANTA DEFAULT USER BARU
const DAILY_REWARD_LIMIT = 10;
const MAX_SPINS = 3;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // === 1. STATE MANAGEMENT ===
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<'guest' | 'user' | 'admin'>('guest');
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [spins, setSpins] = useState(3);
  const [tasksDone, setTasksDone] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<HistoryItem[]>([]);
  const [withdrawDetails, setWithdrawDetails] = useState<{ method: string, number: string, name: string, qris_url?: string }>({ method: '', number: '', name: '' });

  // State dari file UI Baru
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const [systemSettings, setSystemSettings] = useState({
    withdrawSchedule: 'Selalu Buka',
    taskReward: 1600,
    taskPassword: 'Ajax1122*',
    taskDescription: 'Silahkan masukkan data akun Gmail yang baru kamu buat. Pastikan akun dalam keadaan aktif dan belum pernah didaftarkan sebelumnya.'
  });

  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [alertState, setAlertState] = useState<{show: boolean, message: string, subtext: string, type: 'success' | 'error'}>({
    show: false, message: '', subtext: '', type: 'success'
  });

  // === 2. FUNGSI UPSERT BARU. INI DOANG TAMBAHANNYA ===
// === 2. FUNGSI UPSERT BARU ===
const upsertUser = async (user: any) => {
  const { id, email, user_metadata } = user;
  const nama = user_metadata?.full_name || user_metadata?.name || email.split('@')[0];
  const today = new Date().toISOString().split('T')[0];

  console.log('UPSERT JALAN UNTUK:', id);

  // 1. CEK DULU USER UDAH ADA APA BELUM
  const { data: existing } = await supabase
.from('pengguna')
.select('id')
.eq('id', id)
.single();

  if (existing) {
    // KALO UDAH ADA: CUMA UPDATE EMAIL/NAMA DOANG. JANGAN SENTUH SPIN
    await supabase
.from('pengguna')
.update({ email, nama })
.eq('id', id);

  } else {
    // KALO BARU: BARU KASIH DEFAULT SPIN + POOL
    await supabase
.from('pengguna')
.insert({
      id: id,
      email: email,
      nama: nama,
      peran: 'user',
      saldo: 0,
      spin_hari_ini: MAX_SPINS, // <- CUMA DI SINI
      pool_hadiah_hari_ini: DAILY_REWARD_LIMIT, // <- CUMA DI SINI
      last_spin_date: today,
      history: [],
      withdraw_history: [],
      payment: {}
    });
  }
};

  // === 3. useEffect AUTH & DB SUPABASE (Logic Lama + Upsert) ===
  useEffect(() => {
    let mounted = true;
    let handledCode = false;

    const handleAuth = async () => {
      if (handledCode) return;
      handledCode = true;
      setIsLoading(true);

      try {
        const { data: sessionData, error: codeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (codeError) console.error('Code exchange error:', codeError);
        let session = sessionData?.session;

        if (window.location.search.includes('code=')) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        if (!session) {
          const { data: { session: s }} = await supabase.auth.getSession();
          session = s;
        }

        if (!session?.user) {
          if (mounted) {
            setUserRole('guest');
            setUserId('');
            setUserName('');
            setUserEmail('');
            setIsLoading(false);
          }
          return;
        }

// 4. PANGGIL UPSERT DI SINI PAS BUKA APP ADA SESI
        await upsertUser(session.user);

        // TUNGGU 300ms BIAR DB KEUPDATE DULU, ANTI RACE CONDITION
        await new Promise(resolve => setTimeout(resolve, 300));

        const name = session.user_metadata?.full_name || session.user_metadata?.name || '';
        const email = session.user.email || '';
        if (mounted) {
          setUserId(session.user.id);
          setUserName(name);
          setUserEmail(email);
        }

        // Fetch data profil user dari Supabase
        const { data: profile, error: profileError } = await supabase
         .from('pengguna')
         .select('peran, saldo, history, payment, withdraw_history, spin_hari_ini, pool_hadiah_hari_ini')
         .eq('id', session.user.id)
         .single();

        if (profileError) {
          console.error('Gagal fetch profile:', profileError);
        } else {
          setBalance(profile?.saldo?? 0);
          setAllSubmissions(profile?.history?? []);
          setWithdrawHistory(profile?.withdraw_history?? []);
          setSpins(profile?.spin_hari_ini?? MAX_SPINS);

          if (profile?.payment?.method) {
            setWithdrawDetails({
              method: profile.payment.method,
              number: profile.payment.number || '',
              name: profile.payment.name || '',
              qris_url: profile.payment.qris_url || ''
            });
            setIsVerified(true);
          }
        }

        const role = profile?.peran || 'user';
        if (!mounted) return;

        setUserRole(role as 'user' | 'admin');
        if (role === 'admin') setAdminActiveTab('dashboard');

      } catch (err) {
        console.error('GAGAL LOAD USER:', err);
        if (mounted) {
          setUserRole('guest');
          setUserId('');
          setUserName('');
          setUserEmail('');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    handleAuth();

    const { data: { subscription }} = supabase.auth.onAuthStateChange(async (event, session) => { // <- TAMBAH async
      if (event === 'SIGNED_IN' && session?.user) {
        // 5. PANGGIL UPSERT DI SINI PAS LOGIN BARU
        await upsertUser(session.user);

        setUserId(session.user.id);
        setUserName(session.user_metadata?.full_name || session.user_metadata?.name || '');
        setUserEmail(session.user.email || '');
      }
      if (event === 'SIGNED_OUT') {
        setUserRole('guest');
        setUserId('');
        setUserName('');
        setUserEmail('');
        setIsLoading(false);
        navigate('/', { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // === 4. useEffect GUARD WITHDRAW ===
  useEffect(() => {
    if (userRole === 'user' && location.pathname === '/withdraw') {
      if (!withdrawDetails.method) {
        showAlert('Gagal!', 'Harap isi alamat penarikan di menu Profil terlebih dahulu!', 'error');
        navigate('/profil');
        return;
      }
      if (systemSettings.withdrawSchedule === 'Kunci') {
        showAlert('Informasi', 'Fitur withdraw sedang ditutup sementara oleh Admin.', 'error');
        navigate('/dashboard');
      }
    }
  }, [location.pathname, withdrawDetails.method, systemSettings.withdrawSchedule, userRole, navigate]);

  // === 5. FUNCTIONS ===
  const showAlert = (message: string, subtext: string, type: 'success' | 'error' = 'success') => {
    setAlertState({ show: true, message, subtext, type });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole('guest');
    setUserId('');
    navigate('/', { replace: true });
  }

const handleTaskSubmit = async (data: { email: string, pass: string }) => {
  const newSub = {
    id: crypto.randomUUID(), // lebih aman
    userId: userId, // biar bisa filter kalo admin liat semua
    email: data.email,
    password: data.pass,
    status: 'process',
    withdrawMethod: withdrawDetails.method,
    timestamp: new Date().toISOString() // <- GANTI JADI ISO biar sama dgn DB
  };

  // 1. GABUNG DENGAN DATA LAMA
  const updatedHistory = [newSub, ...allSubmissions];
  setAllSubmissions(updatedHistory); // update UI langsung biar ga loading

  // 2. SAVE KE SUPABASE. INI YANG PALING PENTING
  const { error } = await supabase
.from('pengguna')
.update({ history: updatedHistory })
.eq('id', userId);

  if (error) {
    console.error('Gagal simpan tugas:', error);
    showAlert('Gagal!', 'Gagal menyimpan tugas: ' + error.message, 'error');
    setAllSubmissions(allSubmissions); // rollback kalo gagal
    return;
  }

  showAlert('Sukses!', 'Tugas sedang di proses.');
  navigate('/history');
};

 const updateSubmissionStatus = async (id: string, newStatus: 'paid' | 'rejected', reason?: string) => {
  // 1. UPDATE STATE DULU BIAR UI LANGSUNG BERUBAH
  const updatedSubmissions = allSubmissions.map(s => {
    if (s.id === id) {
      return {...s, status: newStatus, reason }; // tambahin reason
    }
    return s;
  });
  setAllSubmissions(updatedSubmissions);

  // 2. CARI TUGASNYA BUAT DAPET userId nya. PENTING BUAT ADMIN
  const taskYangDiubah = updatedSubmissions.find(s => s.id === id);
  if (!taskYangDiubah) return;

  // 3. SAVE KE DB MILIK USER YANG NGERJAIN TUGAS
  const { error } = await supabase
.from('pengguna')
.update({ history: updatedSubmissions })
.eq('id', taskYangDiubah.userId); // <- JANGAN userId admin. Harus userId si pekerja

  if (error) {
    console.error('Gagal update status tugas:', error);
    showAlert('Gagal!', 'Gagal update ke server: ' + error.message, 'error');
    return;
  }

  // 4. BARU UPDATE SALDO & HITUNG ULANG
  if (newStatus === 'paid') {
    setBalance(b => b + systemSettings.taskReward);
    setTotalIncome(i => i + systemSettings.taskReward);
    setTasksDone(t => t + 1);
    showAlert('Sukses!', 'Tugas disetujui, saldo ditambahkan.');
  } else if (newStatus === 'rejected') {
    showAlert('Tugas Ditolak!', 'Tugas tidak memenuhi kriteria sistem.', 'error');
  }
};

  const updateWithdrawStatus = (id: string, newStatus: 'paid' | 'rejected', reason?: string) => {
    setWithdrawHistory(prev => prev.map(w => {
      if (w.id === id) {
        if (newStatus === 'rejected' && w.status!== 'rejected') {
          setBalance(b => b + w.amount);
          showAlert('Withdraw Ditolak!', 'Saldo telah dikembalikan.', 'error');
        } else if (newStatus === 'paid') {
          showAlert('Withdraw Sukses!', 'Dana telah dikirim ke rekening Anda.');
        }
        return {...w, status: newStatus, reason };
      }
      return w;
    }));
  };

  // === 6. RETURN ===
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Sebentar ya...</div>
  }

  if (userRole === 'guest') {
    return <AuthPage onLogin={(role) => setUserRole(role)} />;
  }

    return (
    <div
      className="min-h-screen bg-gray-50 text-gray-800 pb-24 font-sans select-none overflow-x-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <CustomAlert
        show={alertState.show}
        message={alertState.message}
        subtext={alertState.subtext}
        type={alertState.type}
        onClose={() => setAlertState({...alertState, show: false })}
      />

      {userRole === 'user' && (
        <SupportBubble
          isMusicPlaying={isMusicPlaying}
          setIsMusicPlaying={setIsMusicPlaying}
        />
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 px-5 py-3 flex items-center justify-start border-b border-gray-100">
        <img
          src="https://cdn.phototourl.com/member/2026-06-24-82f2ee5b-333f-41b2-a310-7686368b2cec.png"
          alt="Job Gmail Logo"
          className="h-10 w-auto object-contain"
        />
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* USER ROUTES */}
          <Route path="/dashboard" element={
            <Dashboard
              balance={balance}
              onWithdraw={() => navigate('/withdraw')}
              settings={systemSettings}
              isMusicPlaying={isMusicPlaying}
              userName={userName}
              userEmail={userEmail}
            />
          } />

          <Route
            path="/gacha"
            element={
              userId? (
                <Gacha
                  userId={userId}
                  spins={spins}
                  setSpins={setSpins}
                  setBalance={setBalance}
                  setTotalIncome={setTotalIncome}
                  showAlert={showAlert}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route path="/setoran" element={
            <Setoran
              onTaskSubmit={handleTaskSubmit}
              showAlert={showAlert}
              settings={{...systemSettings, withdrawDetailsSet:!!withdrawDetails.method}}
            />
          } />

          <Route path="/profil" element={
            <Profil
              tasksDone={tasksDone}
              userId={userId}
              totalIncome={totalIncome}
              isVerified={isVerified}
              onNavigateToWithdraw={() => navigate('/penarikan')}
              onNavigateToAbout={() => navigate('/about-us')}
              onLogout={handleLogout}
            />
          } />

          <Route path="/about-us" element={
            <AboutUs onBack={() => navigate('/profil')} />
          } />

          <Route path="/penarikan" element={
            <AlamatPenarikan
              userId={userId}
              savedData={withdrawDetails.method? withdrawDetails : undefined}
              showAlert={showAlert}
              onConfirm={(data) => {
                setIsVerified(true);
                setWithdrawDetails(data);
                showAlert('Berhasil!', 'Alamat penarikan telah disimpan.');
                navigate('/profil');
              }}
            />
          } />

          <Route path="/withdraw" element={
            <WithdrawPage
              balance={balance}
              history={withdrawHistory}
              onBack={() => navigate('/dashboard')}
              showAlert={showAlert}
              onWithdrawSuccess={async () => {
                try {
                  const { data: { user }} = await supabase.auth.getUser();
                  if (!user) return;

                  const { data, error } = await supabase
                   .from('pengguna')
                   .select('saldo, withdraw_history')
                   .eq('id', user.id)
                   .single();

                  if (error) throw error;

                  setBalance(data?.saldo?? 0);
                  setWithdrawHistory(data?.withdraw_history?? []);

                } catch (err: any) {
                  console.error('Gagal refresh withdraw:', err);
                  showAlert('Gagal!', 'Gagal sinkron data setelah withdraw', 'error');
                }
              }}
            />
          } />

          <Route path="/history" element={<UserHistory submissions={allSubmissions} />} />

          {/* ADMIN ROUTES */}
          <Route path="/admin" element={
            <AdminPanel
              submissions={allSubmissions}
              withdrawRequests={withdrawHistory}
              onUpdateStatus={updateSubmissionStatus}
              onUpdateWithdrawStatus={updateWithdrawStatus}
              activeTab={adminActiveTab}
              setTab={setAdminActiveTab}
              onLogout={handleLogout}
              settings={systemSettings}
              updateSettings={setSystemSettings}
              showAlert={showAlert}
            />
          } />
          <Route path="/admin/setoran" element={
            <AdminPanel
              submissions={allSubmissions}
              withdrawRequests={withdrawHistory}
              onUpdateStatus={updateSubmissionStatus}
              onUpdateWithdrawStatus={updateWithdrawStatus}
              activeTab="setoran"
              setTab={setAdminActiveTab}
              onLogout={handleLogout}
              settings={systemSettings}
              updateSettings={setSystemSettings}
              showAlert={showAlert}
            />
          } />
          <Route path="/admin/payout" element={
            <AdminPanel
              submissions={allSubmissions}
              onUpdateStatus={updateSubmissionStatus}
              onUpdateWithdrawStatus={updateWithdrawStatus}
              activeTab="payout"
              setTab={setAdminActiveTab}
              onLogout={handleLogout}
              settings={systemSettings}
              updateSettings={setSystemSettings}
              showAlert={showAlert}
            />
          } />
          <Route path="/admin/profil" element={
            <AdminPanel
              submissions={allSubmissions}
              withdrawRequests={withdrawHistory}
              onUpdateStatus={updateSubmissionStatus}
              onUpdateWithdrawStatus={updateWithdrawStatus}
              activeTab="profil"
              setTab={setAdminActiveTab}
              onLogout={handleLogout}
              settings={systemSettings}
              updateSettings={setSystemSettings}
              showAlert={showAlert}
            />
          } />
          <Route path="/admin/withdraw-settings" element={
            <AdminPanel
              submissions={allSubmissions}
              withdrawRequests={withdrawHistory}
              onUpdateStatus={updateSubmissionStatus}
              onUpdateWithdrawStatus={updateWithdrawStatus}
              activeTab="withdraw-settings"
              setTab={setAdminActiveTab}
              onLogout={handleLogout}
              settings={systemSettings}
              updateSettings={setSystemSettings}
              showAlert={showAlert}
            />
          } />
          <Route path="/admin/task-settings" element={
            <AdminPanel
              submissions={allSubmissions}
              withdrawRequests={withdrawHistory}
              onUpdateStatus={updateSubmissionStatus}
              onUpdateWithdrawStatus={updateWithdrawStatus}
              activeTab="task-settings"
              setTab={setAdminActiveTab}
              onLogout={handleLogout}
              settings={systemSettings}
              updateSettings={setSystemSettings}
              showAlert={showAlert}
            />
          } />
        </Routes>
      </main>

      {/* Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        {userRole === 'admin'? (
          <>
            <NavButton active={location.pathname === '/admin'} onClick={() => {setAdminActiveTab('dashboard'); navigate('/admin')}} icon={<LayoutDashboard size={22} />} label="Dash" />
            <NavButton active={location.pathname === '/admin/setoran'} onClick={() => {setAdminActiveTab('setoran'); navigate('/admin/setoran')}} icon={<Send size={22} />} label="Setor" />
            <NavButton active={location.pathname === '/admin/payout'} onClick={() => {setAdminActiveTab('payout'); navigate('/admin/payout')}} icon={<CreditCard size={22} />} label="Pay" />
            <NavButton active={location.pathname === '/admin/profil'} onClick={() => {setAdminActiveTab('profil'); navigate('/admin/profil')}} icon={<User size={22} />} label="Profil" />
          </>
        ) : (
          <>
            <NavButton active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} icon={<Home size={22} />} label="Dashboard" />
            <NavButton active={location.pathname === '/gacha'} onClick={() => navigate('/gacha')} icon={<Gift size={22} />} label="Gacha" />
            <NavButton active={location.pathname === '/setoran'} onClick={() => navigate('/setoran')} icon={<Inbox size={22} />} label="Setoran" />
            <NavButton active={location.pathname === '/history'} onClick={() => navigate('/history')} icon={<HistoryIcon size={22} />} label="Riwayat" />
            <NavButton active={['/profil', '/penarikan', '/about-us'].includes(location.pathname)} onClick={() => navigate('/profil')} icon={<User size={22} />} label="Profil" />
          </>
        )}
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 transition-colors ${active? 'text-blue-600' : 'text-gray-400'}`}
  >
    {icon}
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default App;