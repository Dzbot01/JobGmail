import React, { useEffect, useState } from 'react';
import { ChevronDown, Loader2, CheckCircle, XCircle, Lock, Unlock, ExternalLink, RefreshCw } from 'lucide-react';
import SlotBar from './SlotBar';
import { Job, JobSubmission, formatRupiah, jobsErrorMessage, listMyJobs, listSubmissions, reviewSubmission, setJobStatus } from '../../lib/jobs';

interface Props {
  userId: string;
  refreshKey: number;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
  onBalanceChange?: () => void;
}

const statusCls = (s: string) =>
  s === 'paid' ? 'bg-emerald-100 text-emerald-600' : s === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600';

const AnswerValue: React.FC<{ type: string; value: string }> = ({ type, value }) => {
  if (!value) return <span className="text-gray-300">-</span>;
  if (type === 'image_url') {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="block">
        <img src={value} alt="Bukti" loading="lazy" referrerPolicy="no-referrer" className="max-h-40 rounded-lg border border-gray-200 object-contain bg-white" />
        <span className="text-[10px] text-blue-600 break-all">{value}</span>
      </a>
    );
  }
  if (type === 'url') {
    return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all inline-flex items-center gap-1">{value} <ExternalLink size={11} /></a>;
  }
  return <span className={`break-all ${type === 'password' ? 'font-mono' : ''}`}>{value}</span>;
};

const MyJobs: React.FC<Props> = ({ userId, refreshKey, showAlert, onBalanceChange }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [subs, setSubs] = useState<Record<string, JobSubmission[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setJobs(await listMyJobs(userId));
    } catch (e) {
      showAlert('Gagal!', jobsErrorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSubs = async (jobId: string) => {
    try {
      const list = await listSubmissions(jobId);
      setSubs(prev => ({ ...prev, [jobId]: list }));
    } catch (e) {
      showAlert('Gagal!', jobsErrorMessage(e), 'error');
    }
  };

  useEffect(() => { if (userId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId, refreshKey]);

  const toggle = (jobId: string) => {
    const next = open === jobId ? null : jobId;
    setOpen(next);
    if (next) loadSubs(next);
  };

  const review = async (job: Job, sub: JobSubmission, approve: boolean) => {
    let reason: string | undefined;
    if (approve) {
      if (!window.confirm(`Terima kiriman ${sub.worker_email} dan bayar ${formatRupiah(job.reward)} dari saldo kamu?`)) return;
    } else {
      const r = window.prompt('Alasan penolakan (opsional):', '');
      if (r === null) return;
      reason = r;
    }
    setBusy(sub.id);
    try {
      await reviewSubmission(sub.id, approve, reason);
      showAlert(approve ? 'Kiriman Diterima' : 'Kiriman Ditolak', approve ? `${formatRupiah(job.reward)} dibayarkan ke ${sub.worker_email}.` : 'Slot dikembalikan untuk pekerja lain.', approve ? 'success' : 'error');
      await Promise.all([loadSubs(job.id), load()]);
      if (approve) onBalanceChange?.();
    } catch (e) {
      showAlert('Gagal!', jobsErrorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (job: Job) => {
    const next = job.status === 'open' ? 'closed' : 'open';
    try {
      await setJobStatus(job.id, next);
      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: next } : j)));
    } catch (e) {
      showAlert('Gagal!', jobsErrorMessage(e), 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-gray-800 uppercase tracking-wide">Pekerjaan Saya</h3>
        <button onClick={load} className="p-2 text-gray-400 hover:text-blue-600" aria-label="Muat ulang"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>
      {loading ? (
        <div className="py-10 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs font-bold text-gray-400 border border-gray-100">Belum ada pekerjaan yang kamu buat.</div>
      ) : (
        jobs.map(job => {
          const list = subs[job.id] || [];
          const pending = list.filter(s => s.status === 'process').length;
          return (
            <div key={job.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate">{job.title}</p>
                    <p className="text-[11px] text-gray-400">{formatRupiah(job.reward)} / pekerja · {job.est_process}</p>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${job.status === 'open' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {job.status === 'open' ? 'Dibuka' : 'Ditutup'}
                  </span>
                </div>
                <SlotBar job={job} compact />
                <div className="flex gap-2">
                  <button onClick={() => toggle(job.id)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center gap-1.5">
                    Lihat kiriman{open === job.id && list.length ? ` (${list.length}${pending ? `, ${pending} baru` : ''})` : ''}
                    <ChevronDown size={14} className={`transition-transform ${open === job.id ? 'rotate-180' : ''}`} />
                  </button>
                  <button onClick={() => toggleStatus(job)} className="px-3 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold flex items-center gap-1.5">
                    {job.status === 'open' ? <><Lock size={14} /> Tutup</> : <><Unlock size={14} /> Buka</>}
                  </button>
                </div>
              </div>

              {open === job.id && (
                <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-3 max-h-[520px] overflow-y-auto">
                  {list.length === 0 ? (
                    <p className="text-xs font-bold text-gray-400 text-center py-4">Belum ada kiriman.</p>
                  ) : (
                    list.map(sub => (
                      <div key={sub.id} className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-gray-700 truncate">{sub.worker_email}</p>
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${statusCls(sub.status)}`}>{sub.status}</span>
                        </div>
                        <dl className="space-y-1.5 text-xs">
                          {job.fields.map(f => (
                            <div key={f.key}>
                              <dt className="text-[10px] font-black text-gray-400 uppercase">{f.label}</dt>
                              <dd className="text-gray-700"><AnswerValue type={f.type} value={sub.answers?.[f.key] || ''} /></dd>
                            </div>
                          ))}
                        </dl>
                        {sub.reason && <p className="text-[10px] text-red-500 font-bold">Alasan: {sub.reason}</p>}
                        {sub.status === 'process' && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => review(job, sub, true)} disabled={busy === sub.id} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                              {busy === sub.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Terima & Bayar
                            </button>
                            <button onClick={() => review(job, sub, false)} disabled={busy === sub.id} className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                              <XCircle size={14} /> Tolak
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default MyJobs;
