import React, { useState, useEffect, useRef } from 'react';
import { Home, Gift, Inbox, User, LayoutDashboard, Send, CreditCard, History as HistoryIcon, LogOut, Megaphone, Ban, Briefcase, PlusCircle } from 'lucide-react';
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
import Broadcast from './components/admin/Broadcast';
import BannedUsers from './components/admin/BannedUsers';
import JobsPage from './components/jobs/JobsPage';
import JobDetail from './components/jobs/JobDetail';
import TopupPage from './components/topup/TopupPage';
import TopupConfirm from './components/topup/TopupConfirm';
import TopupPay from './components/topup/TopupPay';
import JobHistory from './components/jobs/JobHistory';
import { usePendingEarnings } from './lib/usePendingEarnings';
import UserHistory from './components/UserHistory';
import SupportBubble from './components/SupportBubble';
import CustomAlert from './components/CustomAlert';
import PromoBanner from './components/PromoBanner';
import MobileUserNav from './components/MobileUserNav';
import { requestWithdraw } from './lib/withdraw';
import { DEFAULT_SETTINGS, SystemSettings, loadSettings, saveSettings, subscribeSettings } from './lib/settings';
import { getStoredReferral, clearStoredReferral, isMissingColumnError, creditReferralReward, REFERRAL_REWARD } from './lib/referral';

type AdminTab = 'dashboard' | 'setoran' | 'payout' | 'profil' | 'withdraw-settings' | 'task-settings';

const LOGO_URL = 'https://cdn.phototourl.com/member/2026-06-24-82f2ee5b-333f-41b2-a310-7686368b2cec.png';

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
  const [isBanned, setIsBanned] = useState(false);
const [sgEarned, setSgEarned] = useState(0);
const [sgSpendable, setSgSpendable] = useState(0);
const [isLoadingSg, setIsLoadingSg] = useState(false);
  const [balance, setBalance] = useState(0);
  const [spins, setSpins] = useState(3);
  const [tasksDone, setTasksDone] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<HistoryItem[]>([]);
  const [withdrawDetails, setWithdrawDetails] = useState<{ method: string, number: string, name: string, qris_url?: string }>({ method: '', number: '', name: '' });

const audioRef = useRef(new Audio('/musik.mp3'));

useEffect(() => {
  audioRef.current.loop = true;
}, []);

  // State dari file UI Baru
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Banner info PanelKitaLegalbot (ditutup = tidak muncul lagi di sesi ini)
  const [showPromo, setShowPromo] = useState(() => {
    try { return sessionStorage.getItem('promo_panelkita_closed') !== '1'; } catch { return true; }
  });
  const closePromo = () => {
    setShowPromo(false);
    try { sessionStorage.setItem('promo_panelkita_closed', '1'); } catch { /* storage diblokir */ }
  };

  // Ukur tinggi header agar konten (dan kartu "Halo" di dashboard) menempel tepat di bawahnya
  const headerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // Pengaturan sistem global: dibaca dari tabel app_settings + realtime, disimpan oleh admin
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    loadSettings().then(s => { if (alive && s) setSystemSettings(s); });
    const unsubscribe = subscribeSettings(s => setSystemSettings(s));
    // Cadangan bila realtime tidak aktif: muat ulang saat tab kembali aktif
    const onFocus = () => loadSettings().then(s => { if (alive && s) setSystemSettings(s); });
    window.addEventListener('focus', onFocus);
    return () => { alive = false; unsubscribe(); window.removeEventListener('focus', onFocus); };
  }, [userId]);

  const persistSettings = async () => {
    await saveSettings(systemSettings, userId);
  };

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
    const ref = getStoredReferral();
    const referredBy = ref && ref !== id ? ref : null;
    const newUser: Record<string, any> = {
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
      payment: {},
      ...(referredBy ? { referred_by: referredBy } : {})
    };
    let { error: insertError } = await supabase.from('pengguna').insert(newUser);
    // Kolom referral belum dimigrasi / pengundang tidak valid → tetap buat akun tanpa referral
    if (insertError && referredBy && (isMissingColumnError(insertError) || insertError.code === '23503')) {
      delete newUser.referred_by;
      ({ error: insertError } = await supabase.from('pengguna').insert(newUser));
    }
    if (insertError) console.error('Gagal membuat user:', insertError);
  }
  clearStoredReferral();
};

  // === 3. useEffect AUTH & DB SUPABASE (Logic Lama + Upsert) ===
  useEffect(() => {
    let mounted = true;
    let handledCode = false;

const fetchSproutGigsBalance = async () => {
  setIsLoadingSg(true);

  try {
    const result = await supabase.functions.invoke("proxy-sproutgigs");

    if (result.error) throw result.error;

    const sprout = JSON.parse(result.data.response);

    setSgEarned(parseFloat(sprout.earned));
    setSgSpendable(parseFloat(sprout.spendable));

  } catch (err: any) {
    console.error(err);

    // Kalau gagal baru reset ke 0
    setSgEarned(0);
    setSgSpendable(0);

  } finally {
    setIsLoadingSg(false);
  }
};

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
  .select('peran, saldo, history, payment, withdraw_history, spin_hari_ini, pool_hadiah_hari_ini, is_banned')
  .eq('id', session.user.id)
  .single();

        if (profileError) {
          console.error('Gagal fetch profile:', profileError);
        } else {
          setIsBanned(profile?.is_banned ?? false);
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
  fetchSproutGigsBalance();
  
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
  
  useEffect(() => {
  if (!isBanned) return;

  const blockedPages = [
    "/setoran",
    "/withdraw",
    "/penarikan",
    "/gacha",
  ];

  if (blockedPages.includes(location.pathname)) {
    showAlert(
      "Akun Diblokir",
      "Akun telah diblokir, Hubungi admin jika ini adalah kesalahan.",
      "error"
    );

    navigate("/dashboard", { replace: true });
  }
}, [isBanned, location.pathname]);

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

// Simpan satu atau banyak setoran dalam SATU kali update (setoran bulk sebelumnya memanggil
// fungsi ini 10x bersamaan sehingga saling menimpa dan hanya 1 akun yang tersimpan).
const handleTaskSubmit = async (input: { email: string, pass: string } | { email: string, pass: string }[]) => {
  const items = Array.isArray(input) ? input : [input];
  if (items.length === 0) return;
  setIsLoading(true);

  const now = new Date().toISOString();
  const newSubs = items.map(it => ({
    id: crypto.randomUUID(),
    userId: userId,
    email: it.email,
    password: it.pass, // Saran: jangan simpan password asli di DB
    status: 'process',
    timestamp: now
  }));

  const oldHistory = [...allSubmissions];

  try {
    // 1. AMBIL HISTORY TERBARU USER INI DARI DB
    const { data: userData, error: fetchError } = await supabase
      .from('pengguna')
      .select('history')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const existing: any[] = userData?.history || [];
    // Cegah email yang sama disetor dua kali oleh user yang sama
    const already = new Set(existing.map((h: any) => String(h.email || '').toLowerCase()));
    const dupes = newSubs.filter(sub => already.has(sub.email.toLowerCase()));
    if (dupes.length) {
      showAlert('Gagal!', `Email sudah pernah kamu setor: ${dupes.map(d => d.email).join(', ')}`, 'error');
      return;
    }

    // 2. SIMPAN SEMUA SEKALIGUS
    const { error: updateError } = await supabase
      .from('pengguna')
      .update({ history: [...newSubs, ...existing] })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 3. EMAIL NOTIFIKASI (sekali untuk user, sekali untuk admin)
    const namaGmail = newSubs.map(sub => sub.email).join(', ');
    const { error: emailErrorUser } = await supabase.functions.invoke('kirim-email-setoran', {
      body: { email_user: userEmail, nama_gmail: namaGmail }
    });
    if (emailErrorUser) console.error('Gagal kirim email ke user:', emailErrorUser.message);

    const { error: emailErrorAdmin } = await supabase.functions.invoke('kirim-email-setoran', {
      body: {
        email_user: 'servindo342@gmail.com', // email admin
        nama_gmail: namaGmail,
        is_admin: true,
        user_penyetor: userEmail
      }
    });
    if (emailErrorAdmin) console.error('Gagal kirim email ke admin:', emailErrorAdmin.message);

    // 4. UPDATE STATE SETELAH SUKSES
    setAllSubmissions([...newSubs, ...oldHistory]);

    showAlert('Sukses!', newSubs.length > 1
      ? `${newSubs.length} akun berhasil disetor. Notifikasi sudah dikirim ke email kamu.`
      : 'Setoran berhasil dikirim. Notifikasi sudah dikirim ke email kamu.', 'success');
    navigate('/history');

  } catch (err: any) {
    console.error('Gagal simpan tugas:', err);
    showAlert('Gagal!', 'Gagal menyimpan tugas: ' + err.message, 'error');
    setAllSubmissions(oldHistory);
  } finally {
    setIsLoading(false);
  }
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
    // Bonus referral: hanya saat tugas benar-benar berubah menjadi "paid" (bukan saat masih proses)
    const referrer = taskLama?.status !== 'paid' ? await creditReferralReward(taskYangDiubah.userId) : null;
    showAlert(
      'Sukses!',
      `Tugas disetujui. Saldo ${taskYangDiubah.userEmail} +Rp${systemSettings.taskReward}` +
        (referrer ? ` · Bonus referral +Rp${REFERRAL_REWARD} ke ${referrer}` : '')
    );
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

  const username = (userEmail || '').split('@')[0] || 'Member';

  // Saldo pending (bayaran pekerjaan yang masih direview) — dimuat ulang saat pindah halaman
  const pendingEarnings = usePendingEarnings(userRole === 'user' ? userId : '', location.pathname);

  const refreshBalance = async () => {
    if (!userId) return;
    const { data } = await supabase.from('pengguna').select('saldo').eq('id', userId).single();
    if (data && typeof data.saldo === 'number') setBalance(data.saldo);
  };

  const goToSetoran = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
    navigate('/setoran'); // <- PENTING PAKE NAVIGATE
  };

  // === 6. RETURN ===
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Sebentar ya...</div>
  }

  if (userRole === 'guest') {
    return <AuthPage onLogin={(role) => setUserRole(role)} />;
  }

    return (
    <div
      className="min-h-screen bg-gray-50 text-gray-800 pb-28 lg:pb-10 font-sans select-none overflow-x-hidden"
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
      audioRef={audioRef}
      isMusicPlaying={isMusicPlaying}
      setIsMusicPlaying={setIsMusicPlaying}
    />
  )}

      {/* Header: logo (mobile/tablet) + banner info (user). Tingginya diukur ke --header-h */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 lg:left-64 z-50">
        <div className="lg:hidden bg-white shadow-sm px-5 py-3 flex items-center justify-start border-b border-gray-100">
          <img
            src={LOGO_URL}
            alt="Job Gmail Logo"
            className="h-10 w-auto object-contain"
          />
        </div>
        {userRole === 'user' && showPromo && (
          <PromoBanner username={username} onClose={closePromo} />
        )}
      </header>

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 z-50 flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <img src={LOGO_URL} alt="Job Gmail Logo" className="h-10 w-auto object-contain" />
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {userRole === 'admin' ? (
            <>
              <SideNavItem active={location.pathname === '/admin'} onClick={() => { setAdminActiveTab('dashboard'); navigate('/admin'); }} icon={<LayoutDashboard size={20} />} label="Dashboard" />
              <SideNavItem active={location.pathname === '/admin/setoran'} onClick={() => { setAdminActiveTab('setoran'); navigate('/admin/setoran'); }} icon={<Send size={20} />} label="Data Setoran" />
              <SideNavItem active={location.pathname === '/admin/payout'} onClick={() => { setAdminActiveTab('payout'); navigate('/admin/payout'); }} icon={<CreditCard size={20} />} label="Payout" />
              <SideNavItem active={location.pathname === '/admin/broadcast'} onClick={() => navigate('/admin/broadcast')} icon={<Megaphone size={20} />} label="Broadcast" />
              <SideNavItem active={location.pathname === '/admin/banned'} onClick={() => navigate('/admin/banned')} icon={<Ban size={20} />} label="Banned User" />
              <SideNavItem active={location.pathname === '/admin/profil'} onClick={() => { setAdminActiveTab('profil'); navigate('/admin/profil'); }} icon={<User size={20} />} label="Profil" />
            </>
          ) : (
            <>
              <button
                onClick={goToSetoran}
                className={`w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-br from-[#3DB8FF] to-[#168BFF] shadow-lg shadow-blue-200 transition-transform active:scale-95 ${location.pathname === '/setoran' ? 'ring-4 ring-blue-100' : ''}`}
              >
                <Inbox size={18} /> Setor Akun
              </button>
              <SideNavItem active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} icon={<Home size={20} />} label="Dashboard" />
              <SideNavItem active={location.pathname.startsWith('/jobs')} onClick={() => navigate('/jobs')} icon={<Briefcase size={20} />} label="Cari Pekerjaan" />
              <SideNavItem active={location.pathname === '/gacha'} onClick={() => navigate('/gacha')} icon={<Gift size={20} />} label="Gacha" />
              <SideNavItem active={location.pathname === '/history'} onClick={() => navigate('/history')} icon={<HistoryIcon size={20} />} label="Riwayat Tugas" />
              <SideNavItem active={location.pathname.startsWith('/topup')} onClick={() => navigate('/topup')} icon={<PlusCircle size={20} />} label="Top Up" />
              <SideNavItem active={location.pathname === '/withdraw'} onClick={() => navigate('/withdraw')} icon={<CreditCard size={20} />} label="Withdraw" />
              <SideNavItem active={['/profil', '/penarikan', '/about-us'].includes(location.pathname)} onClick={() => navigate('/profil')} icon={<User size={20} />} label="Profil" />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main
        className="px-4 sm:px-6 lg:pl-72 lg:pr-8 w-full max-w-3xl lg:max-w-none mx-auto"
        style={{ paddingTop: 'calc(var(--header-h, 65px) + 2rem)' }}
      >
        <div className="w-full lg:max-w-6xl lg:mx-auto">
        {/* Arahkan sesuai peran sebelum halaman dirender, agar admin tidak sempat melihat dashboard user */}
        {userRole === 'admin' && !location.pathname.startsWith('/admin') ? (
          <Navigate to="/admin" replace />
        ) : userRole === 'user' && location.pathname.startsWith('/admin') ? (
          <Navigate to="/dashboard" replace />
        ) : (
        <Routes>
          <Route path="/" element={<Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} replace />} />

          {/* USER ROUTES */}
          <Route path="/dashboard" element={
            <Dashboard
              balance={balance}
              onWithdraw={() => navigate('/withdraw')}
              onTopup={() => navigate('/topup')}
              pendingBalance={pendingEarnings.amount}
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
             isLoading={isLoading}
              userEmail={userEmail}
              submissions={allSubmissions}
              onTaskSubmit={handleTaskSubmit}
              showAlert={showAlert}
              settings={{...systemSettings, withdrawDetailsSet:!!withdrawDetails.method}}
            />
          } />

          <Route path="/profil" element={
            <Profil
              userId={userId}
              balance={balance}
              onNavigateToTopup={() => navigate('/topup')}
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
              onBack={() => navigate('/profil')}
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
    withdrawSchedule={systemSettings.withdrawSchedule}
    balance={balance}
    history={withdrawHistory}
    onBack={() => navigate('/dashboard')}
    showAlert={showAlert}
    userEmail={userEmail}
    onWithdrawSuccess={async (amount: number) => {
      // Saldo dipotong lewat requestWithdraw: dicek ulang dengan saldo terbaru di database
      // (RPC atomik di server bila migrasi sudah dijalankan) → saldo tidak mungkin minus.
      try {
        const res = await requestWithdraw({
          userId,
          amount,
          userName,
          method: withdrawDetails.method,
          walletNumber: withdrawDetails.number,
        });
        setBalance(res.saldo);
        setWithdrawHistory(res.history);
        return true;
      } catch (err: any) {
        console.error('Gagal withdraw:', err);
        showAlert('Gagal!', err?.message || 'Gagal memproses withdraw', 'error');
        refreshBalance();
        return false;
      }
    }}
  />
} />

          <Route path="/history" element={
            <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              <UserHistory submissions={allSubmissions} />
              <JobHistory userId={userId} pendingAmount={pendingEarnings.amount} pendingCount={pendingEarnings.count} onRefresh={pendingEarnings.reload} />
            </div>
          } />

          {/* TOP UP (Tripay) */}
          <Route path="/topup" element={<TopupPage userId={userId} userEmail={userEmail} balance={balance} onBalanceChange={refreshBalance} showAlert={showAlert} />} />
          <Route path="/topup/pay/:reference" element={<TopupPay userEmail={userEmail} onBalanceChange={refreshBalance} showAlert={showAlert} />} />
          <Route path="/topup/:code" element={<TopupConfirm userId={userId} userEmail={userEmail} username={username} showAlert={showAlert} />} />

          {/* MARKETPLACE PEKERJAAN */}
          <Route path="/jobs" element={
            <JobsPage userId={userId} username={username} balance={balance} showAlert={showAlert} onBalanceChange={refreshBalance} />
          } />
          <Route path="/jobs/:id" element={
            <JobDetail userId={userId} userEmail={userEmail} isBanned={isBanned} showAlert={showAlert} />
          } />

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
              onSaveSettings={persistSettings}
              showAlert={showAlert}
              sgEarned={sgEarned}
              sgSpendable={sgSpendable}
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
              onSaveSettings={persistSettings}
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
              onSaveSettings={persistSettings}
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
              onSaveSettings={persistSettings}
              showAlert={showAlert}
            />
          } />
          <Route path="/admin/broadcast" element={
            userRole === 'admin'
              ? <Broadcast showAlert={showAlert} />
              : <Navigate to="/dashboard" replace />
          } />
          <Route path="/admin/banned" element={
            userRole === 'admin'
              ? <BannedUsers showAlert={showAlert} />
              : <Navigate to="/dashboard" replace />
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
              onSaveSettings={persistSettings}
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
              onSaveSettings={persistSettings}
              showAlert={showAlert}
            />
          } />
        </Routes>
        )}
        </div>
      </main>

    {/* Bottom Navbar */}
{userRole === 'admin' ? (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-around items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
    <NavButton 
      active={location.pathname === '/admin'} 
      onClick={() => {setAdminActiveTab('dashboard'); navigate('/admin')}} // BALIKIN NAVIGATE
      icon={<LayoutDashboard size={22} />} 
      label="Dash" 
    />
    <NavButton active={location.pathname === '/admin/setoran'} onClick={() => {setAdminActiveTab('setoran'); navigate('/admin/setoran')}} icon={<Send size={22} />} label="Setor" />
    <NavButton active={location.pathname === '/admin/payout'} onClick={() => {setAdminActiveTab('payout'); navigate('/admin/payout')}} icon={<CreditCard size={22} />} label="Pay" />
    <NavButton active={location.pathname === '/admin/broadcast'} onClick={() => navigate('/admin/broadcast')} icon={<Megaphone size={22} />} label="Cast" />
    <NavButton active={location.pathname === '/admin/banned'} onClick={() => navigate('/admin/banned')} icon={<Ban size={22} />} label="Banned" />
    <NavButton active={location.pathname === '/admin/profil'} onClick={() => {setAdminActiveTab('profil'); navigate('/admin/profil')}} icon={<User size={22} />} label="Profil" />
  </nav>
) : (
  <MobileUserNav pathname={location.pathname} navigate={navigate} onSetor={goToSetoran} />
)}
    </div>
  );
};
const SideNavItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
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