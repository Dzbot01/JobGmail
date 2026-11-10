import { submissionStatus } from '../../lib/submissionStatus';
import React, { useEffect, useMemo, useState } from 'react';
import { Ban, ShieldCheck, Search, RefreshCw, Loader2, ChevronDown, AlertTriangle, Users, UserX, Mail } from 'lucide-react';
import { supabase } from '../../supabase';

const DEFAULT_SPAM_THRESHOLD = 20; // setoran per hari; bulk resmi = 10 akun sekaligus

type Tab = 'spam' | 'all' | 'banned';

interface Task {
  id: string;
  email: string;
  password?: string;
  status: 'process' | 'paid' | 'rejected' | string;
  timestamp: string;
}

interface UserRow {
  id: string;
  email: string;
  nama: string;
  isBanned: boolean;
  tasks: Task[];
  /** jumlah setoran per tanggal (YYYY-MM-DD, zona waktu browser) */
  perDay: Record<string, number>;
  maxPerDay: number;
  maxDay: string;
}

interface BannedUsersProps {
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

const dayKey = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'tanpa-tanggal';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDay = (key: string) => {
  if (key === 'tanpa-tanggal') return 'Tanpa tanggal';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const statusClass = (s: string) => submissionStatus(s).badge;

const BannedUsers: React.FC<BannedUsersProps> = ({ showAlert }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [threshold, setThreshold] = useState(DEFAULT_SPAM_THRESHOLD);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('pengguna').select('id, email, nama, peran, history, is_banned');
    if (error) {
      showAlert('Gagal!', 'Gagal memuat user: ' + error.message, 'error');
      setLoading(false);
      return;
    }
    const rows: UserRow[] = (data || [])
      .filter((u: any) => u.peran !== 'admin')
      .map((u: any) => {
        const tasks: Task[] = [...(u.history || [])].sort(
          (a: Task, b: Task) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const perDay: Record<string, number> = {};
        tasks.forEach(t => { const k = dayKey(t.timestamp); perDay[k] = (perDay[k] || 0) + 1; });
        let maxPerDay = 0;
        let maxDay = '';
        Object.entries(perDay).forEach(([k, n]) => { if (n > maxPerDay) { maxPerDay = n; maxDay = k; } });
        return {
          id: u.id,
          email: u.email || '-',
          nama: u.nama || (u.email || '').split('@')[0] || 'User',
          isBanned: !!u.is_banned,
          tasks,
          perDay,
          maxPerDay,
          maxDay,
        };
      });
    setUsers(rows);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSpam = (u: UserRow) => u.maxPerDay >= threshold;
  const counts = useMemo(() => ({
    all: users.length,
    spam: users.filter(u => u.maxPerDay >= threshold).length,
    banned: users.filter(u => u.isBanned).length,
  }), [users, threshold]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter(u => (tab === 'spam' ? u.maxPerDay >= threshold : tab === 'banned' ? u.isBanned : true))
      .filter(u => !q || u.email.toLowerCase().includes(q) || u.nama.toLowerCase().includes(q) || u.tasks.some(t => (t.email || '').toLowerCase().includes(q)))
      .sort((a, b) => b.maxPerDay - a.maxPerDay || b.tasks.length - a.tasks.length);
  }, [users, tab, query, threshold]);

  const selectedRows = users.filter(u => selected.has(u.id));
  const allVisibleSelected = visible.length > 0 && visible.every(u => selected.has(u.id));

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected(prev => { const n = new Set(prev); visible.forEach(u => (allVisibleSelected ? n.delete(u.id) : n.add(u.id))); return n; });

  /**
   * Banned = tandai is_banned + HAPUS PERMANEN data user (saldo, riwayat setoran & withdraw,
   * alamat penarikan, spin, bonus referral, pekerjaan & kiriman tugas). Unban hanya membuka blokir.
   */
  const setBanned = async (ids: string[], banned: boolean) => {
    if (ids.length === 0) return;
    const msg = banned
      ? `BANNED ${ids.length} user?\n\nSemua data mereka akan DIHAPUS PERMANEN: saldo, riwayat setoran, riwayat withdraw, alamat penarikan, bonus referral, serta pekerjaan & kiriman tugas.\n\nTindakan ini tidak bisa dibatalkan (Unban tidak mengembalikan data).`
      : `Buka blokir (unban) ${ids.length} user? Data yang sudah dihapus tidak akan kembali.`;
    if (!window.confirm(msg)) return;
    setSaving(true);
    let error: any = null;
    if (banned) {
      // 1) Fungsi server atomik (migrasi 20261104_settings_and_ban.sql)
      const rpc = await supabase.rpc('admin_ban_users', { p_ids: ids });
      if (rpc.error) {
        const missing = rpc.error.code === 'PGRST202' || /could not find the function|does not exist/i.test(rpc.error.message || '');
        if (!missing) error = rpc.error;
        else {
          // 2) Cadangan sebelum migrasi: kosongkan data inti langsung di tabel pengguna
          const res = await supabase.from('pengguna').update({
            is_banned: true, saldo: 0, history: [], withdraw_history: [], payment: {}, spin_hari_ini: 0, pool_hadiah_hari_ini: 0,
          }).in('id', ids);
          error = res.error;
        }
      }
    } else {
      error = (await supabase.from('pengguna').update({ is_banned: false }).in('id', ids)).error;
    }
    setSaving(false);
    if (error) {
      showAlert('Gagal!', 'Gagal menyimpan status banned: ' + error.message, 'error');
      return;
    }
    setUsers(prev => prev.map(u => {
      if (!ids.includes(u.id)) return u;
      return banned ? { ...u, isBanned: true, tasks: [], perDay: {}, maxPerDay: 0, maxDay: '' } : { ...u, isBanned: false };
    }));
    setSelected(new Set());
    setExpanded(null);
    showAlert(
      banned ? 'User Dibanned' : 'Blokir Dibuka',
      banned ? `${ids.length} user diblokir dan seluruh datanya dihapus.` : `${ids.length} user berhasil dibuka blokirnya.`,
      banned ? 'error' : 'success'
    );
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number; active: string }[] = [
    { key: 'all', label: 'Semua User', icon: <Users size={16} />, count: counts.all, active: 'border-blue-500 bg-blue-50 text-blue-600' },
    { key: 'spam', label: 'Terindikasi Spam', icon: <AlertTriangle size={16} />, count: counts.spam, active: 'border-orange-400 bg-orange-50 text-orange-600' },
    { key: 'banned', label: 'Dibanned', icon: <UserX size={16} />, count: counts.banned, active: 'border-red-400 bg-red-50 text-red-600' },
  ];

  return (
    <div className="space-y-6 pb-28 lg:pb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
            <Ban size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-800">Banned User</h2>
            <p className="text-[11px] text-gray-400 font-medium">Pantau setoran spam & blokir user (banned = data user dihapus)</p>
          </div>
        </div>
        <button onClick={load} disabled={loading || saving} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white disabled:opacity-50" title="Muat ulang">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`p-3 rounded-2xl border text-left transition-colors ${tab === t.key ? t.active : 'border-gray-100 bg-white text-gray-400 hover:bg-gray-50'}`}
          >
            {t.icon}
            <p className="text-[9px] sm:text-[10px] font-black uppercase mt-1.5 leading-tight text-gray-500">{t.label}</p>
            <p className="text-lg sm:text-xl font-black text-gray-800">{t.count}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari email/nama user atau email setoran"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 whitespace-nowrap">
          Batas spam
          <input
            type="number"
            min={2}
            value={threshold}
            onChange={e => setThreshold(Math.max(2, parseInt(e.target.value) || DEFAULT_SPAM_THRESHOLD))}
            className="w-16 px-2 py-2 rounded-lg bg-gray-50 border border-gray-100 text-center font-black text-gray-800 outline-none focus:border-blue-400"
          />
          setoran / hari
        </label>
      </div>

      {/* Daftar user */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} disabled={visible.length === 0} className="w-4 h-4" />
            Pilih semua ({visible.length})
          </label>
          <span className="text-[11px] font-bold text-blue-600">{selected.size} dipilih</span>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
        ) : visible.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-lg border border-gray-100 text-center text-xs font-bold text-gray-400">
            {tab === 'spam' ? `Tidak ada user dengan ≥ ${threshold} setoran dalam 1 hari` : tab === 'banned' ? 'Belum ada user yang dibanned' : 'Belum ada user'}
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2 xl:items-start">
            {visible.map(u => {
              const open = expanded === u.id;
              const spam = isSpam(u);
              const days = Object.entries(u.perDay).sort((a, b) => (a[0] < b[0] ? 1 : -1));
              const q = query.trim().toLowerCase();
              const matchedTasks = q ? u.tasks.filter(t => (t.email || '').toLowerCase().includes(q)) : [];
              return (
                <div key={u.id} className={`bg-white rounded-2xl shadow-md border overflow-hidden ${u.isBanned ? 'border-red-200' : spam ? 'border-orange-200' : 'border-gray-100'}`}>
                  <div className="p-4 flex items-start gap-3">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="w-4 h-4 mt-1 flex-shrink-0" aria-label={`Pilih ${u.email}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-800 truncate max-w-full">{u.email}</p>
                        {u.isBanned && <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[9px] font-black uppercase">Banned</span>}
                        {spam && <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[9px] font-black uppercase">Spam</span>}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{u.nama}</p>
                      {matchedTasks.length > 0 && (
                        <div className="mt-2 rounded-lg bg-yellow-50 border border-yellow-200 px-2.5 py-1.5 space-y-0.5">
                          <p className="text-[9px] font-black uppercase tracking-wider text-yellow-700">Mengirim setoran yang cocok ({matchedTasks.length})</p>
                          {matchedTasks.slice(0, 3).map(t => (
                            <p key={t.id} className="text-[11px] text-gray-700 truncate">
                              <b>{t.email}</b> <span className="text-gray-400">· {formatDay(dayKey(t.timestamp))} {formatTime(t.timestamp)} · {t.status}</span>
                            </p>
                          ))}
                          {matchedTasks.length > 3 && <p className="text-[10px] text-yellow-700">+{matchedTasks.length - 3} lainnya</p>}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
                        <span className="text-gray-500">Total setoran: <b className="text-gray-800">{u.tasks.length}</b></span>
                        <span className="text-gray-500">
                          Terbanyak/hari: <b className={spam ? 'text-orange-600' : 'text-gray-800'}>{u.maxPerDay}</b>
                          {u.maxDay && <span className="text-gray-400"> ({formatDay(u.maxDay)})</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => setExpanded(open ? null : u.id)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-gray-50"
                    >
                      <Mail size={14} /> {open ? 'Tutup' : 'Lihat'} setoran
                      <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {u.isBanned ? (
                      <button onClick={() => setBanned([u.id], false)} disabled={saving} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                        <ShieldCheck size={14} /> Unban
                      </button>
                    ) : (
                      <button onClick={() => setBanned([u.id], true)} disabled={saving} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-100 disabled:opacity-50">
                        <Ban size={14} /> Banned
                      </button>
                    )}
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-4 max-h-[420px] overflow-y-auto">
                      {u.tasks.length === 0 ? (
                        <p className="text-xs font-bold text-gray-400 text-center py-4">Belum ada setoran</p>
                      ) : (
                        days.map(([day, n]) => (
                          <div key={day} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">{formatDay(day)}</p>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${n >= threshold ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>{n} setoran</span>
                            </div>
                            {u.tasks.filter(t => dayKey(t.timestamp) === day).map(t => (
                              <div key={t.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${q && (t.email || '').toLowerCase().includes(q) ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-100'}`}>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-700 truncate">{t.email}</p>
                                  <p className="text-[10px] text-gray-400">{formatTime(t.timestamp)}{t.password ? ` · ${t.password}` : ''}</p>
                                </div>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${statusClass(t.status)}`}>{submissionStatus(t.status).label}</span>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aksi massal */}
      {selected.size > 0 && (
        <div className="fixed left-4 right-4 bottom-24 lg:bottom-6 lg:left-auto lg:right-8 lg:w-[420px] z-40 bg-gray-900 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-2">
          <p className="flex-1 text-xs font-bold px-1">{selected.size} user dipilih</p>
          {selectedRows.some(u => u.isBanned) && (
            <button
              onClick={() => setBanned(selectedRows.filter(u => u.isBanned).map(u => u.id), false)}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold disabled:opacity-50"
            >
              Unban
            </button>
          )}
          <button
            onClick={() => setBanned(selectedRows.filter(u => !u.isBanned).map(u => u.id), true)}
            disabled={saving || selectedRows.every(u => u.isBanned)}
            className="px-4 py-2 rounded-xl bg-red-600 text-xs font-black uppercase flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Banned
          </button>
        </div>
      )}
    </div>
  );
};

export default BannedUsers;
