import React, { useState, useEffect } from 'react';
import { Home, Gift, Inbox, User, LayoutDashboard, Send, CreditCard, History as HistoryIcon } from 'lucide-react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; // IMPORT SUPABASE

// Components
import Dashboard from './components/Dashboard';
import AuthCallback from './components/AuthCallback';
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

const audioRef = useRef<HTMLAudioElement>(null);

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

if (role === 'admin') {
  setAdminActiveTab('dashboard');
  
  // 1. AMBIL SEMUA DATA USER BUAT ADMIN PANEL
  const { data: allUsers, error } = await supabase
.from('pengguna')
.select('id, email, history, withdraw_history');

  if (!error && allUsers) {
    // 2. GABUNGIN SEMUA HISTORY + KASIH TAU INI MILIK SIAPA
    const allTasks = allUsers.flatMap(u => 
  (u.history || []).map((task: any) => ({ ...task, userId: u.id, userEmail: u.email }))
).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // <- TAMBAH INI
    const allWithdraws = allUsers.flatMap(u => 
  (u.withdraw_history || []).map((wd: any) => ({ ...wd, userId: u.id, userEmail: u.email }))
).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setAllSubmissions(allTasks);
    setWithdrawHistory(allWithdraws);
  }
}

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
    id: crypto.randomUUID(),
    userId: userId, // WAJIB ADA
    email: data.email,
    password: data.pass,
    status: 'process',
    timestamp: new Date().toISOString()
  };

  const updatedHistory = [newSub, ...allSubmissions];
  setAllSubmissions(updatedHistory);

  // AMBIL DULU HISTORY LAMA USER INI DARI DB
  const { data: userData } = await supabase
.from('pengguna')
.select('history')
.eq('id', userId)
.single();

  const userHistoryOnly = [newSub, ...(userData?.history || [])];

  // SAVE CUMA HISTORY DIA
  const { error } = await supabase
.from('pengguna')
.update({ history: userHistoryOnly })
.eq('id', userId);

  if (error) {
    console.error('Gagal simpan tugas:', error);
    showAlert('Gagal!', 'Gagal menyimpan tugas: ' + error.message, 'error');
    setAllSubmissions(allSubmissions);
    return;
  }

  showAlert('Sukses!', 'Tugas sedang di proses.');
  navigate('/history');
};

const updateSubmissionStatus = async (id: string, newStatus: 'paid' | 'rejected', reason?: string) => {
  // 1. CARI TUGAS DI STATE ADMIN DULU BUAT DAPET userId
  const taskYangDiubah = allSubmissions.find(s => s.id === id);
  if (!taskYangDiubah) return;

  // 2. AMBIL DATA ASLI USER ITU DARI SUPABASE. JANGAN PAKE STATE
  const { data: userTarget, error: fetchError } = await supabase
.from('pengguna')
.select('saldo, history')
.eq('id', taskYangDiubah.userId)
.single();

  if (fetchError || !userTarget) {
    showAlert('Gagal!', 'User tidak ditemukan', 'error');
    return;
  }

  // 3. UPDATE HANYA DI ARRAY HISTORY MILIK DIA
  const userHistoryUpdated = (userTarget.history || []).map((s: any) => 
    s.id === id? {...s, status: newStatus, reason } : s
  );

  let newSaldo = userTarget.saldo;
  
  // 4. CEK APA SEBELUMNYA STATUSNYA BUKAN PAID. ANTI DOUBLE
  const taskLama = (userTarget.history || []).find((s: any) => s.id === id);
  if (newStatus === 'paid' && taskLama?.status !== 'paid') {
    newSaldo = userTarget.saldo + systemSettings.taskReward;
  }

  // 5. SAVE KE DB USER YANG BERSANGKUTAN
  const { error: updateError } = await supabase
.from('pengguna')
.update({ 
  history: userHistoryUpdated,
  saldo: newSaldo
})
.eq('id', taskYangDiubah.userId);

  if (updateError) {
    console.error('Gagal update:', updateError);
    showAlert('Gagal!', 'Gagal update ke server: ' + updateError.message, 'error');
    return;
  }

  // 6. BARU UPDATE STATE ADMIN BIAR UI REFRESH
  setAllSubmissions(prev => prev.map(s => 
    s.id === id? {...s, status: newStatus, reason } : s
  ));

  if (newStatus === 'paid') {
    setTasksDone(t => t + 1);
    setTotalIncome(i => i + systemSettings.taskReward);
    showAlert('Sukses!', `Tugas disetujui. Saldo ${taskYangDiubah.userEmail} +Rp${systemSettings.taskReward}`);
  } else {
    showAlert('Tugas Ditolak!', 'Tugas tidak memenuhi kriteria sistem.', 'error');
  }
};

const updateWithdrawStatus = async (id: string, newStatus: 'paid' | 'rejected', reason?: string) => {
  // 1. CARI WD DI STATE ADMIN DULU BUAT DAPET userId
  const withdrawItem = withdrawHistory.find(w => w.id === id);
  if (!withdrawItem) return;

  // 2. AMBIL DATA ASLI USER ITU DARI SUPABASE. JANGAN PAKE STATE
  const { data: userTarget, error: fetchError } = await supabase
.from('pengguna')
.select('saldo, withdraw_history')
.eq('id', withdrawItem.userId)
.single();

  if (fetchError || !userTarget) {
    showAlert('Gagal!', 'User tidak ditemukan', 'error');
    return;
  }

  // 3. UPDATE HANYA DI ARRAY WITHDRAW MILIK DIA
  const userWithdrawUpdated = (userTarget.withdraw_history || []).map((w: any) => 
    w.id === id? {...w, status: newStatus, reason } : w
  );

  let newSaldo = userTarget.saldo;
  
  // 4. LOGIKA SALDO: CUMA BALIKIN KALO DARI 'process' KE 'rejected'
  const wdLama = (userTarget.withdraw_history || []).find((w: any) => w.id === id);
  if (newStatus === 'rejected' && wdLama?.status === 'process') {
    newSaldo = userTarget.saldo + withdrawItem.amount; // BALIKIN DUIT
  }

  // 5. SAVE KE DB USER YANG BERSANGKUTAN
  const { error: updateError } = await supabase
.from('pengguna')
.update({ 
  withdraw_history: userWithdrawUpdated,
  saldo: newSaldo
})
.eq('id', withdrawItem.userId);

  if (updateError) {
    console.error('Gagal update:', updateError);
    showAlert('Gagal!', 'Gagal update ke server: ' + updateError.message, 'error');
    return;
  }

  // 6. BARU UPDATE STATE ADMIN BIAR UI REFRESH
  setWithdrawHistory(prev => prev.map(w => 
    w.id === id? {...w, status: newStatus, reason } : w
  ));

  if (newStatus === 'paid') {
    showAlert('Withdraw Sukses!', `Dana Rp${withdrawItem.amount} dikirim ke ${withdrawItem.userEmail}`);
  } else {
    showAlert('Withdraw Ditolak!', `Saldo Rp${withdrawItem.amount} dikembalikan ke ${withdrawItem.userEmail}`, 'error');
  }
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

<>
  <audio
    ref={audioRef}
    src="/musik.mp3"
    loop
  />

  {userRole === 'user' && (
    <SupportBubble
      audioRef={audioRef}
      isMusicPlaying={isMusicPlaying}
      setIsMusicPlaying={setIsMusicPlaying}
    />
  )}
</>

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
              userId={userId}
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

<Route path="/auth/callback" element={<AuthCallback />} />

<Route path="/withdraw" element={
  <WithdrawPage
    balance={balance}
    history={withdrawHistory}
    onBack={() => navigate('/dashboard')}
    showAlert={showAlert}
    onWithdrawSuccess={async (amount: number) => { // <- TAMBAH PARAMETER AMOUNT
      try {
        // 1. BIKIN DATA BARU
        const newWithdraw: HistoryItem = {
          id: crypto.randomUUID(),
          amount: amount,
          status: 'process',
          date: new Date().toISOString(), // pake ISO biar rapi
          method: withdrawDetails.method,
          walletNumber: withdrawDetails.number,
          userName: userName
        };

        const newBalance = balance - amount;
        const updatedWithdrawHistory = [newWithdraw, ...withdrawHistory];

        // 2. UPDATE UI DULU BIAR CEPET
        setBalance(newBalance);
        setWithdrawHistory(updatedWithdrawHistory);

        // 3. SAVE KE SUPABASE
        const { error } = await supabase
  .from('pengguna')
  .update({ 
    saldo: newBalance,
    withdraw_history: updatedWithdrawHistory 
  })
  .eq('id', userId);

        if (error) throw error;

        showAlert('Sukses!', 'Permintaan withdraw sedang diproses.', 'success');
        
      } catch (err: any) {
        console.error('Gagal withdraw:', err);
        showAlert('Gagal!', 'Gagal memproses withdraw: ' + err.message, 'error');
        // rollback kalo gagal
        setBalance(balance); 
        setWithdrawHistory(withdrawHistory);
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
    withdrawRequests={withdrawHistory} // <- TAMBAH INI
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
{userRole === 'admin' ? (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
    <NavButton 
      active={location.pathname === '/admin'} 
      onClick={() => {setAdminActiveTab('dashboard'); navigate('/admin')}} // BALIKIN NAVIGATE
      icon={<LayoutDashboard size={22} />} 
      label="Dash" 
    />
    <NavButton active={location.pathname === '/admin/setoran'} onClick={() => {setAdminActiveTab('setoran'); navigate('/admin/setoran')}} icon={<Send size={22} />} label="Setor" />
    <NavButton active={location.pathname === '/admin/payout'} onClick={() => {setAdminActiveTab('payout'); navigate('/admin/payout')}} icon={<CreditCard size={22} />} label="Pay" />
    <NavButton active={location.pathname === '/admin/profil'} onClick={() => {setAdminActiveTab('profil'); navigate('/admin/profil')}} icon={<User size={22} />} label="Profil" />
  </nav>
) : (
  <nav className="premium-nav-container">
    <NavButtonPremium 
      active={location.pathname === '/dashboard'} 
      onClick={() => navigate('/dashboard')}
      icon={<Home size={22} />}
      label="Dash"
    />

    <NavButtonPremium 
      active={location.pathname === '/gacha'} 
      onClick={() => navigate('/gacha')}
      icon={<Gift size={22} />}
      label="Gacha"
    />

    {/* Floating Setor Button */}
    <div className="floating-setor-wrapper">
       <div className="floating-setor-btn" onClick={() => {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3');
          audio.play().catch(e => console.log('Audio play failed:', e));
          navigate('/setoran'); // <- PENTING PAKE NAVIGATE
       }}>
          <div className="setor-middle-ring">
             <div className="setor-inner-circle">
                <Inbox size={26} className="text-white" />
                <span className="setor-label">SETOR</span>
             </div>
          </div>
       </div>
    </div>

    <NavButtonPremium 
      active={location.pathname === '/history'} 
      onClick={() => navigate('/history')}
      icon={<HistoryIcon size={22} />}
      label="History"
    />

    <NavButtonPremium 
      active={['/profil', '/penarikan', '/about-us'].includes(location.pathname)} 
      onClick={() => navigate('/profil')}
      icon={<User size={22} />}
      label="Profil"
    />
  </nav>
)}
    </div>
  );
};
const NavButtonPremium = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <div 
    className={`premium-nav-item ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    {active && <div className="premium-active-glow" />}
    {icon}
    <span className="relative z-10">{label}</span>
  </div>
);

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