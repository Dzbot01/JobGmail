import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Megaphone, Users, Clock, Search, Send, Loader2, CheckCircle2, XCircle, RefreshCw, Square, Eye, FileText, X } from 'lucide-react';
import { supabase } from '../../supabase';
import { sendEmail, escapeHtml, emailLayout } from '../../lib/emailApi';

// Jeda antar email agar tidak kena rate limit Resend (default 2 request/detik)
const SEND_DELAY_MS = 600;

type Filter = 'all' | 'process';

interface Recipient {
  id: string;
  email: string;
  nama: string;
  processCount: number;
}

interface SendResult {
  email: string;
  ok: boolean;
  error?: string;
}

interface BroadcastProps {
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

const personalize = (text: string, r: Recipient) =>
  text.replace(/\{nama\}/gi, r.nama).replace(/\{email\}/gi, r.email);

const buildHtml = (subject: string, message: string) =>
  emailLayout(subject, escapeHtml(message).replace(/\n/g, '<br>'));

/** Template pesan: setoran belum logout dari perangkat. Nama & email setoran diisi manual oleh admin. */
export const LOGOUT_TEMPLATE_SUBJECT = 'Segera logout akun setoran anda';
export function buildLogoutTemplate(nama: string, emailSetoran: string) {
  const n = nama.trim() || '{nama}';
  const e = emailSetoran.trim() || '[email setoran]';
  return (
    `Halo ${n},\n` +
    `Kami telah menerima data setoran anda dengan nama : ${e}, kami melihat bahwa anda belum logout dari akun tersebut. ` +
    'segera logout dari akun tersebut dengan cara menghapus akun dari perangkat di pengaturan dan balas email ini agar kami dapat mem verifikasi nya ' +
    'atau jika tidak akun anda akan kami blokir permanen.\n' +
    'Terimakasih.'
  );
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const Broadcast: React.FC<BroadcastProps> = ({ showAlert }) => {
  const [users, setUsers] = useState<Recipient[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [tplNama, setTplNama] = useState('');
  const [tplEmail, setTplEmail] = useState('');

  const applyTemplate = () => {
    if (!tplEmail.trim()) {
      showAlert('Gagal!', 'Isi email setoran terlebih dahulu.', 'error');
      return;
    }
    if ((subject.trim() || message.trim()) && !window.confirm('Ganti subjek & isi pesan saat ini dengan template?')) return;
    setSubject(LOGOUT_TEMPLATE_SUBJECT);
    setMessage(buildLogoutTemplate(tplNama, tplEmail));
    setShowTemplate(false);
  };

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<SendResult[]>([]);
  const stopRef = useRef(false);
  // Balasan penerima diarahkan ke email admin yang sedang login
  const [replyTo, setReplyTo] = useState('');
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setReplyTo(data.user?.email || '')).catch(() => {}); }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.from('pengguna').select('id, email, nama, peran, history');
    if (error) {
      showAlert('Gagal!', 'Gagal memuat daftar user: ' + error.message, 'error');
      setLoadingUsers(false);
      return;
    }
    const list: Recipient[] = (data || [])
      .filter((u: any) => u.email && u.peran !== 'admin')
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        nama: u.nama || u.email.split('@')[0],
        processCount: (u.history || []).filter((t: any) => t.status === 'process' || t.status === 'review').length,
      }))
      .sort((a: Recipient, b: Recipient) => b.processCount - a.processCount || a.email.localeCompare(b.email));
    setUsers(list);
    setSelected(new Set(list.map(u => u.id)));
    setLoadingUsers(false);
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processUsers = useMemo(() => users.filter(u => u.processCount > 0), [users]);
  const filtered = useMemo(() => {
    const base = filter === 'process' ? processUsers : users;
    const q = query.trim().toLowerCase();
    return q ? base.filter(u => u.email.toLowerCase().includes(q) || u.nama.toLowerCase().includes(q)) : base;
  }, [filter, users, processUsers, query]);

  const recipients = filtered.filter(u => selected.has(u.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id));

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setQuery('');
    // Saat ganti filter, otomatis pilih semua user pada filter tersebut
    setSelected(new Set((f === 'process' ? processUsers : users).map(u => u.id)));
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      filtered.forEach(u => (allFilteredSelected ? next.delete(u.id) : next.add(u.id)));
      return next;
    });
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      showAlert('Gagal!', 'Subjek dan isi pesan wajib diisi.', 'error');
      return;
    }
    if (recipients.length === 0) {
      showAlert('Gagal!', 'Pilih minimal 1 penerima.', 'error');
      return;
    }
    if (!window.confirm(`Kirim email "${subject}" ke ${recipients.length} user?`)) return;

    stopRef.current = false;
    setSending(true);
    setResults([]);
    setProgress({ done: 0, total: recipients.length });

    const out: SendResult[] = [];
    for (let i = 0; i < recipients.length; i++) {
      if (stopRef.current) break;
      const r = recipients[i];
      const subj = personalize(subject, r);
      const res = await sendEmail({ to: r.email, subject: subj, html: buildHtml(subj, personalize(message, r)), replyTo: replyTo || undefined });
      out.push(res.ok ? { email: r.email, ok: true } : { email: r.email, ok: false, error: res.error });
      setResults([...out]);
      setProgress({ done: i + 1, total: recipients.length });
      if (i < recipients.length - 1) await sleep(SEND_DELAY_MS);
    }

    setSending(false);
    const okCount = out.filter(o => o.ok).length;
    const failCount = out.length - okCount;
    if (failCount === 0 && !stopRef.current) {
      showAlert('Broadcast Terkirim!', `${okCount} email berhasil dikirim.`, 'success');
    } else {
      showAlert(
        stopRef.current ? 'Broadcast Dihentikan' : 'Sebagian Gagal',
        `${okCount} berhasil, ${failCount} gagal.`,
        'error'
      );
    }
  };

  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const previewRecipient: Recipient = recipients[0] || { id: '', email: 'user@gmail.com', nama: 'User', processCount: 0 };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
          <Megaphone size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-800">Broadcast</h2>
          <p className="text-[11px] text-gray-400 font-medium">Kirim email ke user yang terdaftar</p>
        </div>
      </div>

      <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        {/* PENERIMA */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Penerima</h3>
            <button
              onClick={loadUsers}
              disabled={loadingUsers || sending}
              className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Muat ulang"
            >
              <RefreshCw size={16} className={loadingUsers ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => changeFilter('all')}
              disabled={sending}
              className={`p-3 rounded-xl border text-left transition-colors ${filter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
            >
              <Users size={16} className={filter === 'all' ? 'text-blue-600' : 'text-gray-400'} />
              <p className="text-[10px] font-black uppercase text-gray-500 mt-1.5">Semua User</p>
              <p className="text-lg font-black text-gray-800">{users.length}</p>
            </button>
            <button
              onClick={() => changeFilter('process')}
              disabled={sending}
              className={`p-3 rounded-xl border text-left transition-colors ${filter === 'process' ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
            >
              <Clock size={16} className={filter === 'process' ? 'text-orange-500' : 'text-gray-400'} />
              <p className="text-[10px] font-black uppercase text-gray-500 mt-1.5">Tugas Status Proses</p>
              <p className="text-lg font-black text-gray-800">{processUsers.length}</p>
            </button>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari email atau nama"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-between mb-2 px-1">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} disabled={sending || filtered.length === 0} className="w-4 h-4" />
              Pilih semua
            </label>
            <span className="text-[11px] font-bold text-blue-600">{recipients.length} dipilih</span>
          </div>

          <div className="max-h-80 lg:max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
            {loadingUsers ? (
              <div className="py-10 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-xs font-bold text-gray-400">
                {filter === 'process' ? 'Tidak ada user dengan tugas berstatus proses' : 'Belum ada user'}
              </p>
            ) : (
              filtered.map(u => (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${selected.has(u.id) ? 'border-blue-100 bg-blue-50/50' : 'border-gray-50 bg-white hover:bg-gray-50'}`}
                >
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} disabled={sending} className="w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{u.email}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.nama}</p>
                  </div>
                  {u.processCount > 0 && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[9px] font-black uppercase">
                      {u.processCount} proses
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>

        {/* PESAN */}
        <div className="space-y-6 lg:col-span-3">
          <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Tulis Pesan</h3>
              <button
                type="button"
                onClick={() => setShowTemplate(v => !v)}
                disabled={sending}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-colors disabled:opacity-50 ${showTemplate ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
              >
                <FileText size={13} /> Template: Belum Logout
              </button>
            </div>

            {showTemplate && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-blue-700">Template pesan: belum logout akun</p>
                  <button type="button" onClick={() => setShowTemplate(false)} className="p-1 text-blue-400 hover:text-blue-700" aria-label="Tutup template"><X size={14} /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="tpl-nama" className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama penerima</label>
                    <input
                      id="tpl-nama"
                      value={tplNama}
                      onChange={e => setTplNama(e.target.value)}
                      placeholder="Kosongkan = {nama} otomatis"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="tpl-email" className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email setoran</label>
                    <input
                      id="tpl-email"
                      value={tplEmail}
                      onChange={e => setTplEmail(e.target.value)}
                      placeholder="contoh@gmail.com"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 whitespace-pre-line bg-white rounded-lg border border-gray-100 p-3 leading-relaxed">{buildLogoutTemplate(tplNama, tplEmail)}</p>
                <button
                  type="button"
                  onClick={applyTemplate}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                >
                  Gunakan template
                </button>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Subjek</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={sending}
                placeholder="Contoh: Info pembayaran tugas"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 font-bold text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Isi Pesan</label>
              <textarea
                rows={8}
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={sending}
                placeholder={'Halo {nama},\n\nTugas kamu sedang kami proses...'}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:border-blue-400 focus:bg-white resize-y"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                Gunakan <code className="bg-gray-100 px-1 rounded">{'{nama}'}</code> atau <code className="bg-gray-100 px-1 rounded">{'{email}'}</code> untuk personalisasi.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(v => !v)}
                className="sm:w-auto px-5 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                <Eye size={16} /> {showPreview ? 'Tutup Preview' : 'Preview'}
              </button>
              {sending ? (
                <button
                  type="button"
                  onClick={() => { stopRef.current = true; }}
                  className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Square size={16} /> Hentikan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={recipients.length === 0}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                >
                  <Send size={16} /> Kirim ke {recipients.length} user
                </button>
              )}
            </div>

            {showPreview && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <p className="px-4 py-2 bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                  Preview untuk {previewRecipient.email}
                </p>
                <iframe
                  title="Preview email"
                  sandbox=""
                  className="w-full h-80 bg-gray-100"
                  srcDoc={buildHtml(personalize(subject || '(tanpa subjek)', previewRecipient), personalize(message || '(pesan kosong)', previewRecipient))}
                />
              </div>
            )}
          </div>

          {(sending || results.length > 0) && (
            <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Status Pengiriman</h3>
                <span className="text-xs font-bold text-gray-500">{progress.done}/{progress.total}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex gap-4 text-xs font-bold">
                <span className="text-emerald-600">{okCount} berhasil</span>
                <span className="text-red-500">{failCount} gagal</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {results.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-gray-50">
                    {r.ok
                      ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      : <XCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className="font-bold text-gray-700 truncate">{r.email}</p>
                      {r.error && <p className="text-[10px] text-red-500 break-words">{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Broadcast;
