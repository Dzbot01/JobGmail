import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Home, Gift, Inbox, User, History as HistoryIcon, Briefcase, CreditCard, Wallet, Info, ChevronUp, PlusCircle, LifeBuoy } from 'lucide-react';

interface Props {
  pathname: string;
  navigate: (to: string) => void;
  onSetor: () => void;
}

const NAV_H = 72;          // tinggi bottom navbar (lihat .premium-nav-container)
const DRAG_SLOP = 6;       // px sebelum gerakan dianggap tarikan (bukan tap)
const HINT_KEY = 'jg_nav_sheet_seen';

/** Menu tambahan yang muncul saat bottom navbar ditarik ke atas. */
const MORE_ITEMS = [
  { to: '/jobs', label: 'Cari Pekerjaan', icon: Briefcase, match: (p: string) => p.startsWith('/jobs') },
  { to: '/topup', label: 'Top Up', icon: PlusCircle, match: (p: string) => p.startsWith('/topup') },
  { to: '/withdraw', label: 'Withdraw', icon: CreditCard, match: (p: string) => p === '/withdraw' },
  { to: '/tiket', label: 'Tiket Bantuan', icon: LifeBuoy, match: (p: string) => p.startsWith('/tiket') },
  { to: '/penarikan', label: 'Alamat Penarikan', icon: Wallet, match: (p: string) => p === '/penarikan' },
  { to: '/about-us', label: 'Tentang Kami', icon: Info, match: (p: string) => p === '/about-us' },
];

const NavItem = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <div className={`premium-nav-item ${active ? 'active' : ''}`} onClick={onClick} role="button" tabIndex={0}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}>
    {active && <div className="premium-active-glow" />}
    {icon}
    <span className="relative z-10">{label}</span>
  </div>
);

/**
 * Bottom navbar mobile yang bisa ditarik ke atas (hingga ±tengah layar) untuk menampilkan menu tambahan.
 * Navbar memantul tipis sebagai petunjuk sampai panel pertama kali dibuka.
 */
const MobileUserNav: React.FC<Props> = ({ pathname, navigate, onSetor }) => {
  const [maxLift, setMaxLift] = useState(() => (typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.5) - NAV_H : 300));
  const [lift, setLift] = useState(0);            // seberapa tinggi navbar terangkat (px)
  const [dragging, setDragging] = useState(false);
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; } });
  const drag = useRef<{ startY: number; startLift: number; lastY: number; lastT: number; v: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const onResize = () => setMaxLift(Math.max(160, Math.round(window.innerHeight * 0.5) - NAV_H));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const open = lift > 0 && !dragging && lift >= maxLift - 1;

  const setOpen = useCallback((o: boolean) => {
    setLift(o ? maxLift : 0);
    if (o && !seen) {
      setSeen(true);
      try { localStorage.setItem(HINT_KEY, '1'); } catch { /* abaikan */ }
    }
  }, [maxLift, seen]);

  // Tutup panel saat pindah halaman
  useEffect(() => { setLift(0); }, [pathname]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { startY: e.clientY, startLift: lift, lastY: e.clientY, lastT: performance.now(), v: 0, moved: false, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = d.startY - e.clientY;
    if (!d.moved) {
      if (Math.abs(dy) < DRAG_SLOP) return;
      d.moved = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    const now = performance.now();
    d.v = (d.lastY - e.clientY) / Math.max(1, now - d.lastT); // px/ms, positif = ke atas
    d.lastY = e.clientY;
    d.lastT = now;
    // Sedikit "karet" di luar batas
    let next = d.startLift + dy;
    if (next < 0) next = next / 4;
    if (next > maxLift) next = maxLift + (next - maxLift) / 4;
    setLift(next);
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    suppressClick.current = true;          // tarikan bukan tap
    setTimeout(() => { suppressClick.current = false; }, 0);
    setDragging(false);
    const current = d.startLift + (d.startY - e.clientY);
    const shouldOpen = d.v > 0.5 ? true : d.v < -0.5 ? false : current > maxLift * 0.35;
    setOpen(shouldOpen);
  };

  const go = (to: string) => {
    if (suppressClick.current) return;
    navigate(to);
  };

  const shownLift = Math.max(0, lift);
  const progress = Math.min(1, shownLift / maxLift);
  const transition = dragging ? 'none' : 'transform 380ms cubic-bezier(.2,.9,.25,1.15), height 380ms cubic-bezier(.2,.9,.25,1.15)';

  return (
    <div className="lg:hidden">
      {/* Latar gelap saat panel terbuka */}
      <div
        className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-[1px] transition-opacity"
        style={{ opacity: progress, pointerEvents: progress > 0.05 ? 'auto' : 'none' }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel menu tambahan: mengisi ruang di bawah navbar yang terangkat */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[48] bg-[#262626] overflow-hidden"
        style={{ height: shownLift + 1, transition, paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!open}
      >
        <div className="px-5 pt-5 grid grid-cols-3 sm:grid-cols-5 gap-x-3 gap-y-4" style={{ opacity: Math.min(1, progress * 1.6), transform: `translateY(${(1 - progress) * 20}px)` }}>
          {MORE_ITEMS.map(item => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <button
                key={item.to}
                onClick={() => { setOpen(false); go(item.to); }}
                tabIndex={open ? 0 : -1}
                className={`flex flex-col items-center gap-2 py-2 text-center transition-colors active:scale-95 ${active ? 'text-white' : 'text-[#A0A0A0] hover:text-white'}`}
              >
                <Icon size={26} strokeWidth={1.8} />
                <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-5 text-center text-[10px] font-bold text-white/30">Tarik ke bawah untuk menutup</p>
      </div>

      {/* Bottom navbar (bisa ditarik) */}
      <nav
        className={`premium-nav-container touch-none select-none ${!seen && shownLift === 0 && !dragging ? 'nav-pull-hint' : ''}`}
        style={{ transform: `translateY(${-shownLift}px)`, transition, zIndex: 50 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="Navigasi utama"
      >
        {/* Pegangan tarik */}
        <button
          type="button"
          onClick={() => { if (!suppressClick.current) setOpen(!open); }}
          className="nav-grabber"
          aria-label={open ? 'Tutup menu lainnya' : 'Buka menu lainnya'}
          aria-expanded={open}
        >
          <span className="nav-grabber-pill" />
          <ChevronUp size={12} className={`nav-grabber-chevron ${open ? 'rotate-180' : ''}`} />
        </button>

        <NavItem active={pathname === '/dashboard'} onClick={() => go('/dashboard')} icon={<Home size={22} />} label="Dash" />
        <NavItem active={pathname === '/gacha'} onClick={() => go('/gacha')} icon={<Gift size={22} />} label="Gacha" />

        {/* Floating Setor Button */}
        <div className="floating-setor-wrapper">
          <div className="floating-setor-btn" onClick={() => { if (!suppressClick.current) onSetor(); }}>
            <div className="setor-middle-ring">
              <div className="setor-inner-circle">
                <Inbox size={26} className="text-white" />
                <span className="setor-label">SETOR</span>
              </div>
            </div>
          </div>
        </div>

        <NavItem active={pathname === '/history'} onClick={() => go('/history')} icon={<HistoryIcon size={22} />} label="History" />
        <NavItem active={pathname === '/profil'} onClick={() => go('/profil')} icon={<User size={22} />} label="Profil" />
      </nav>
    </div>
  );
};

export default MobileUserNav;
