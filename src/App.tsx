import React, { useState, useEffect } from 'react';
import { Home, Gift, Inbox, User, LayoutDashboard, Send, CreditCard, History as HistoryIcon } from 'lucide-react';
import { supabase } from './supabase';

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

type Page = 'dashboard' | 'gacha' | 'setoran' | 'profil' | 'penarikan' | 'withdraw' | 'history' | 'about-us';
type AdminTab = 'dashboard' | 'setoran' | 'payout' | 'profil' | 'withdraw-settings' | 'task-settings';

const App: React.FC = () => {
  // === 1. STATE DISAMAKAN KAYAK PROJECT LAMA ===
  const [userId, setUserId] = useState<string>(''); 
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<'guest' | 'user' | 'admin'>('guest');
  const [activeTab, setActiveTab] = useState<Page>('dashboard');
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  
  const [balance, setBalance] = useState(0);
  const [spins, setSpins] = useState(3);
  const [tasksDone, setTasksDone] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<HistoryItem[]>([]);
  const [withdrawDetails, setWithdrawDetails] = useState<{ method: string, number: string, name: string, qris_url?: string }>({ method: '', number: '', name: '' });

  // Admin Global Settings
  const [systemSettings, setSystemSettings] = useState({
    withdrawSchedule: 'Selalu Buka',
    taskReward: 1600,
    taskPassword: 'Ajax1122*',
    taskDescription: 'Silahkan masukkan data akun Gmail yang baru kamu buat. Pastikan akun dalam keadaan aktif dan belum pernah didaftarkan sebelumnya.'
  });

  // Admin Data Storage 
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  // Custom Alert State
  const [alertState, setAlertState] = useState<{show: boolean, message: string, subtext: string, type: 'success' | 'error'}>({ 
    show: false, message: '', subtext: '', type: 'success' 
  });

  const showAlert = (message: string, subtext: string, type: 'success' | 'error' = 'success') => {
    setAlertState({ show: true, message, subtext, type });
  };

  // === 2. useEffect AUTH DISAMAKAN 100% ===
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

        const name = session.user_metadata?.full_name || session.user_metadata?.name || '';
        const email = session.user.email || '';
        if (mounted) {
          setUserId(session.user.id);
          setUserName(name);
          setUserEmail(email);
        }

        const { data: profile, error: profileError } = await supabase
          .from('pengguna')
          .select('peran, saldo, history, payment, withdraw_history')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Gagal fetch profile:', profileError);
        } else {
          setBalance(profile?.saldo ?? 0);
          setAllSubmissions(profile?.history ?? []);
          setWithdrawHistory(profile?.withdraw_history ?? []);
          
          if (profile?.payment?.method) {
            setWithdrawDetails({
              method: profile.payment.method,
              number: profile.payment.number || '',
              name: profile.payment.name || '',
              qris_url: profile.payment.qris_url || ''
            });
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

    const { data: { subscription }} = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
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
        setActiveTab('dashboard');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // === 3. useEffect GUARD WITHDRAW ===
  useEffect(() => {
    if (userRole === 'user' && activeTab === 'withdraw') {
      if (!withdrawDetails.method) {
        showAlert('Gagal!', 'Harap isi alamat penarikan di menu Profil terlebih dahulu!', 'error');
        setActiveTab('profil');
        return;
      }
      if (systemSettings.withdrawSchedule === 'Kunci') {
        showAlert('Informasi', 'Fitur withdraw sedang ditutup sementara oleh Admin.', 'error');
        setActiveTab('dashboard');
      }
    }
  }, [activeTab, withdrawDetails.method, systemSettings.withdrawSchedule, userRole]);

  // === 4. FUNCTIONS DISAMAKAN ===
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole('guest');
    setUserId('');
    setActiveTab('dashboard');
  }

  const handleTaskSubmit = (data: { email: string, pass: string }) => {
    const newSub = {
      id: Math.random().toString(36).substr(2, 9),
      userId: userId, 
      email: data.email,
      password: data.pass,
      status: 'process',
      withdrawMethod: withdrawDetails.method,
      timestamp: new Date().toLocaleString()
    };
    setAllSubmissions([newSub,...allSubmissions]);
    showAlert('Sukses!', 'Tugas sedang di proses.');
    setActiveTab('history');
  };

  const updateSubmissionStatus = (id: string, newStatus: 'paid' | 'rejected', reason?: string) => {
    setAllSubmissions(prev => prev.map(s => {
      if (s.id === id) {
        if (newStatus === 'paid' && s.status!== 'paid') {
          setBalance(b => b + systemSettings.taskReward);
          setTotalIncome(i => i + systemSettings.taskReward);
          setTasksDone(t => t + 1);
          showAlert('Sukses!', 'Tugas disetujui, saldo ditambahkan.');
        } else if (newStatus === 'rejected') {
          showAlert('Tugas Ditolak!', 'Tugas tidak memenuhi kriteria sistem.', 'error');
        }
        return {...s, status: newStatus, reason };
      }
      return s;
    }));
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

  // === 5. RETURN - LOADING DULU ===
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (userRole === 'guest') {
    return <AuthPage onLogin={(role) => setUserRole(role)} />;
  }

  // === 6. RENDER UI TETAP SAMA, CUMA LOGIKA WITHDRAW DIUBAH ===
  const renderUserContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard balance={balance} onWithdraw={() => setActiveTab('withdraw')} settings={systemSettings} isMusicPlaying={isMusicPlaying} userName={userName} userEmail={userEmail} />;
      case 'gacha':
        return <Gacha spins={spins} setSpins={setSpins} setBalance={setBalance} setTotalIncome={setTotalIncome} />;
      case 'setoran':
        return (
          <Setoran 
            onTaskSubmit={handleTaskSubmit} 
            showAlert={showAlert} 
            settings={{
              ...systemSettings,
              withdrawDetailsSet: !!withdrawDetails.method
            }} 
          />
        );
      case 'profil':
        return (
          <Profil 
            tasksDone={tasksDone} 
            totalIncome={totalIncome} 
            isVerified={isVerified} 
            onNavigateToWithdraw={() => setActiveTab('penarikan')} 
            onNavigateToAbout={() => setActiveTab('about-us')}
            onLogout={handleLogout}
          />
        );
      case 'about-us':
        return <AboutUs onBack={() => setActiveTab('profil')} />;
      case 'penarikan':
        return (
          <AlamatPenarikan 
            userId={userId}
            onBack={() => setActiveTab('profil')} 
            savedData={withdrawDetails.method ? withdrawDetails : undefined}
            showAlert={showAlert}
            onConfirm={(data) => { 
              setIsVerified(true); 
              setWithdrawDetails(data); 
              showAlert('Berhasil!', 'Alamat penarikan telah disimpan.');
              setActiveTab('profil'); 
            }} 
          />
        );
      case 'withdraw':
        return (
          <WithdrawPage 
            balance={balance} 
            history={withdrawHistory} 
            onBack={() => setActiveTab('dashboard')} 
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

                setBalance(data?.saldo ?? 0);
                setWithdrawHistory(data?.withdraw_history ?? []);

              } catch (err: any) {
                console.error('Gagal refresh withdraw:', err);
                showAlert('Gagal!', 'Gagal sinkron data setelah withdraw', 'error');
              }
            }}
          />
        );
      case 'history':
        return <UserHistory submissions={allSubmissions} />;
      default:
        return <Dashboard balance={balance} onWithdraw={() => setActiveTab('withdraw')} settings={systemSettings} isMusicPlaying={isMusicPlaying} userName={userName} userEmail={userEmail} />;
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 text-gray-800 pb-24 font-sans select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <CustomAlert 
        show={alertState.show} 
        message={alertState.message} 
        subtext={alertState.subtext} 
        type={alertState.type}
        onClose={() => setAlertState({ ...alertState, show: false })} 
      />
      
      {userRole === 'user' && (
        <SupportBubble 
          isMusicPlaying={isMusicPlaying} 
          setIsMusicPlaying={setIsMusicPlaying} 
        />
      )}

      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 px-5 py-3 flex items-center justify-start border-b border-gray-100">
        <img 
          src="https://cdn.photourl.com/member/2026-06-24-82f2ee5b-333f-41b2-a310-7686368b2cec.png" 
          alt="Job Gmail Logo" 
          className="h-10 w-auto object-contain"
        />
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto">
        {userRole === 'admin' ? (
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
        ) : (
          renderUserContent()
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        {userRole === 'admin' ? (
          <>
            <NavButton 
              active={adminActiveTab === 'dashboard' || adminActiveTab === 'withdraw-settings' || adminActiveTab === 'task-settings'} 
              onClick={() => setAdminActiveTab('dashboard')} 
              icon={<LayoutDashboard size={22} />} 
              label="Dash" 
            />
            <NavButton active={adminActiveTab === 'setoran'} onClick={() => setAdminActiveTab('setoran')} icon={<Send size={22} />} label="Setor" />
            <NavButton active={adminActiveTab === 'payout'} onClick={() => setAdminActiveTab('payout')} icon={<CreditCard size={22} />} label="Pay" />
            <NavButton active={adminActiveTab === 'profil'} onClick={() => setAdminActiveTab('profil')} icon={<User size={22} />} label="Profil" />
          </>
        ) : (
          <>
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Home size={22} />} label="Dashboard" />
            <NavButton active={activeTab === 'gacha'} onClick={() => setActiveTab('gacha')} icon={<Gift size={22} />} label="Gacha" />
            <NavButton active={activeTab === 'setoran'} onClick={() => setActiveTab('setoran')} icon={<Inbox size={22} />} label="Setoran" />
            <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<HistoryIcon size={22} />} label="Riwayat" />
            <NavButton active={activeTab === 'profil' || activeTab === 'penarikan'} onClick={() => setActiveTab('profil')} icon={<User size={22} />} label="Profil" />
          </>
        )}
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}
  >
    {icon}
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default App;