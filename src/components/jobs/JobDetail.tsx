import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wallet, Clock, User, Loader2, Send, Eye, EyeOff, CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import SlotBar from './SlotBar';
import {
  FIELD_TYPES, Job, JobSubmission, formatRupiah, getJob, getMySubmission, isHttpsUrl, jobsErrorMessage, slotsLeft, submitJob, validateAnswers,
} from '../../lib/jobs';

interface Props {
  userId: string;
  userEmail: string;
  isBanned: boolean;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
}

const statusInfo: Record<string, { label: string; cls: string }> = {
  process: { label: 'Sedang direview pembuat pekerjaan', cls: 'bg-orange-50 border-orange-200 text-orange-700' },
  paid: { label: 'Diterima — bayaran sudah masuk ke saldo kamu', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  rejected: { label: 'Ditolak oleh pembuat pekerjaan', cls: 'bg-red-50 border-red-200 text-red-700' },
};

const JobDetail: React.FC<Props> = ({ userId, userEmail, isBanned, showAlert }) => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [mine, setMine] = useState<JobSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const j = await getJob(id);
        const s = userId ? await getMySubmission(id, userId).catch(() => null) : null;
        if (!alive) return;
        setJob(j);
        setMine(s);
      } catch (e) {
        if (alive) setError(jobsErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, userId]);

  if (loading) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={24} /></div>;
  if (error || !job) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-sm font-bold text-gray-600"><ArrowLeft size={18} /> Kembali</button>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center text-sm font-bold text-orange-700">{error || 'Pekerjaan tidak ditemukan.'}</div>
      </div>
    );
  }

  const own = job.owner_id === userId;
  const full = slotsLeft(job) === 0;
  const closed = job.status !== 'open';
  const blockedReason = own ? 'Ini pekerjaan yang kamu buat.'
    : isBanned ? 'Akun kamu diblokir dan tidak dapat mengerjakan tugas.'
    : closed ? 'Pekerjaan ini sudah ditutup oleh pembuatnya.'
    : full ? 'Slot pekerja untuk pekerjaan ini sudah penuh.'
    : '';

  const setAnswer = (key: string, v: string) => {
    setAnswers(prev => ({ ...prev, [key]: v }));
    if (fieldErrors[key]) setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateAnswers(job.fields, answers);
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      showAlert('Periksa kembali', Object.values(errs)[0], 'error');
      return;
    }
    if (!window.confirm('Kirim tugas sekarang? Kiriman tidak bisa diubah setelah dikirim.')) return;
    setSending(true);
    try {
      const clean = Object.fromEntries(job.fields.map(f => [f.key, (answers[f.key] || '').trim()]));
      const s = await submitJob(job.id, userId, userEmail, clean);
      setMine(s);
      // Ambil ulang dari server agar jumlah slot akurat (dihitung oleh trigger database)
      getJob(job.id).then(fresh => setJob({ ...fresh })).catch(() => {});
      showAlert('Terkirim!', 'Tugas kamu sedang direview pembuat pekerjaan.', 'success');
    } catch (err) {
      showAlert('Gagal!', jobsErrorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-blue-600">
        <ArrowLeft size={18} /> Cari Pekerjaan
      </button>

      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        {/* Info pekerjaan */}
        <div className="space-y-5 lg:col-span-3">
          <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Kerjakan Tugas</p>
              <h1 className="text-xl lg:text-2xl font-black text-gray-800 mt-1">{job.title}</h1>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5"><User size={13} /> Dibuat oleh <b className="text-gray-700">{job.owner_name || 'Pengguna'}</b></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black uppercase text-emerald-600/70 flex items-center gap-1"><Wallet size={11} /> Bayaran</p>
                <p className="text-lg font-black text-emerald-600">{formatRupiah(job.reward)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black uppercase text-blue-600/70 flex items-center gap-1"><Clock size={11} /> Estimasi Proses</p>
                <p className="text-lg font-black text-blue-600">{job.est_process}</p>
              </div>
            </div>
            <SlotBar job={job} />
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Deskripsi</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">{job.detail}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">Tata Cara Pengerjaan</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">{job.instructions}</p>
          </div>
        </div>

        {/* Submit tugas */}
        <div className="lg:col-span-2 lg:sticky" style={{ top: 'calc(var(--header-h, 0px) + 1.5rem)' }}>
          {mine ? (
            <div className={`rounded-2xl border p-5 space-y-2 ${statusInfo[mine.status]?.cls || ''}`}>
              <p className="text-xs font-black uppercase tracking-wider flex items-center gap-2"><CheckCircle2 size={16} /> Tugas sudah dikirim</p>
              <p className="text-sm font-bold">{statusInfo[mine.status]?.label}</p>
              {mine.reason && <p className="text-xs">Alasan: {mine.reason}</p>}
              <p className="text-[11px] opacity-70">Dikirim {new Date(mine.created_at).toLocaleString('id-ID')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Submit Tugas</h2>
              {blockedReason && (
                <p className="flex items-start gap-2 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {blockedReason}
                </p>
              )}
              {job.fields.map(f => {
                const val = answers[f.key] || '';
                const hint = FIELD_TYPES.find(t => t.value === f.type)?.hint;
                const isUrl = f.type === 'url' || f.type === 'image_url';
                return (
                  <div key={f.key}>
                    <label htmlFor={`f-${f.key}`} className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      {f.label} {f.required ? <span className="text-red-500">*</span> : <span className="text-gray-300 normal-case font-medium">(opsional)</span>}
                    </label>
                    <div className="relative">
                      <input
                        id={`f-${f.key}`}
                        type={f.type === 'password' && !reveal[f.key] ? 'password' : isUrl ? 'url' : 'text'}
                        inputMode={isUrl ? 'url' : undefined}
                        value={val}
                        onChange={e => setAnswer(f.key, e.target.value)}
                        disabled={!!blockedReason || sending}
                        placeholder={isUrl ? 'https://' : ''}
                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border text-sm outline-none focus:bg-white disabled:opacity-50 ${fieldErrors[f.key] ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-blue-400'} ${f.type === 'password' ? 'pr-11' : ''}`}
                      />
                      {f.type === 'password' && (
                        <button type="button" onClick={() => setReveal(r => ({ ...r, [f.key]: !r[f.key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Tampilkan password">
                          {reveal[f.key] ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                    {fieldErrors[f.key] ? (
                      <p className="text-[11px] text-red-500 font-bold mt-1">{fieldErrors[f.key]}</p>
                    ) : hint && f.type !== 'text' ? (
                      <p className="text-[10px] text-gray-400 mt-1">{f.type === 'image_url' ? 'Upload gambar ke layanan seperti imgur lalu tempel link https-nya di sini.' : hint}</p>
                    ) : null}
                    {f.type === 'image_url' && isHttpsUrl(val) && (
                      <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-2 flex items-center gap-2">
                        <ImageIcon size={14} className="text-gray-400 flex-shrink-0" />
                        <img src={val.trim()} alt="Pratinjau" referrerPolicy="no-referrer" className="max-h-32 rounded-lg object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                );
              })}
              <button type="submit" disabled={!!blockedReason || sending} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none">
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Kirim Tugas
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
