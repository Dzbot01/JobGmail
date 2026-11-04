import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Search, Clock, Wallet, Loader2, RefreshCw, X, UserCog } from 'lucide-react';
import SlotBar from './SlotBar';
import CreateJobForm from './CreateJobForm';
import MyJobs from './MyJobs';
import { Job, formatRupiah, jobsErrorMessage, listOpenJobs, searchJobs, slotsLeft } from '../../lib/jobs';
import { useAccountMode } from '../../lib/accountMode';
import { usePendingEarnings } from '../../lib/usePendingEarnings';
import JobHistory from './JobHistory';
import { Hourglass } from 'lucide-react';
import { MIN_SALDO_PENCARI } from '../../lib/tripay';
import { Lock } from 'lucide-react';

interface Props {
  userId: string;
  username: string;
  balance: number;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
  onBalanceChange?: () => void;
}

const JobsPage: React.FC<Props> = ({ userId, username, balance, showAlert, onBalanceChange }) => {
  const navigate = useNavigate();
  const { mode } = useAccountMode(userId);
  const pending = usePendingEarnings(userId);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setJobs(await listOpenJobs());
    } catch (e) {
      setError(jobsErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (mode === 'pekerja') load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mode]);

  const results = useMemo(() => searchJobs(jobs, query), [jobs, query]);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
            <Briefcase size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-800">Cari Pekerjaan</h2>
            <p className="text-[11px] text-gray-400 font-medium">
              Mode akun: <b className="text-blue-600">{mode === 'pekerja' ? 'Pekerja' : 'Pencari Pekerja'}</b>
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/profil')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm text-[11px] font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0">
          <UserCog size={14} /> Ganti mode
        </button>
      </div>

      {mode === 'pencari' && balance < MIN_SALDO_PENCARI ? (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-amber-200 text-center space-y-3 max-w-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto"><Lock size={26} /></div>
          <h3 className="text-lg font-black text-gray-800">Mode Pencari Pekerja Terkunci</h3>
          <p className="text-sm text-gray-500">
            Untuk membuat pekerjaan, saldo kamu minimal <b>Rp {MIN_SALDO_PENCARI.toLocaleString('id-ID')}</b>.
            Saldo saat ini <b>Rp {balance.toLocaleString('id-ID')}</b>.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <button onClick={() => navigate('/topup')} className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm">Top Up Saldo</button>
            <button onClick={() => navigate('/profil')} className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm">Ganti ke mode Pekerja</button>
          </div>
        </div>
      ) : mode === 'pencari' ? (
        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
          <div className="lg:col-span-3">
            <CreateJobForm userId={userId} ownerName={username} balance={balance} showAlert={showAlert} onCreated={() => setRefreshKey(k => k + 1)} />
          </div>
          <div className="lg:col-span-2">
            <MyJobs userId={userId} refreshKey={refreshKey} showAlert={showAlert} onBalanceChange={onBalanceChange} />
          </div>
        </div>
      ) : (
        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
          <div className="lg:col-span-2 space-y-6">
          {pending.amount > 0 && (
            <button
              onClick={() => document.getElementById('job-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="lg:hidden w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-amber-700"><Hourglass size={16} /> Saldo pending</span>
              <span className="text-sm font-black text-amber-700">{formatRupiah(pending.amount)}</span>
            </button>
          )}
          {/* Pencarian */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari pekerjaan, mis. instagram, review, daftar akun..."
              aria-label="Cari pekerjaan"
              className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-md text-sm outline-none focus:border-blue-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600" aria-label="Hapus pencarian">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-gray-400">
              {loading ? 'Memuat…' : query ? `${results.length} hasil untuk "${query}"` : `${jobs.length} pekerjaan tersedia`}
            </p>
            <button onClick={load} className="p-1.5 text-gray-400 hover:text-blue-600" aria-label="Muat ulang"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
          ) : error ? (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center text-sm font-bold text-orange-700">{error}</div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
              <Briefcase className="mx-auto text-gray-300 mb-2" size={28} />
              <p className="text-xs font-bold text-gray-400">{query ? 'Tidak ada pekerjaan yang cocok dengan kata kunci.' : 'Belum ada pekerjaan yang dibuka.'}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map(job => {
                const full = slotsLeft(job) === 0;
                const own = job.owner_id === userId;
                return (
                  <button
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className={`text-left bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex flex-col gap-3 transition-all hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${full ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-800 leading-snug line-clamp-2">{job.title}</h3>
                      {own && <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[9px] font-black uppercase">Milikmu</span>}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 min-h-[2.5em]">{job.short_desc}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-50 rounded-xl px-3 py-2">
                        <p className="text-[9px] font-black uppercase text-emerald-600/70 flex items-center gap-1"><Wallet size={10} /> Bayaran</p>
                        <p className="text-sm font-black text-emerald-600">{formatRupiah(job.reward)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl px-3 py-2">
                        <p className="text-[9px] font-black uppercase text-blue-600/70 flex items-center gap-1"><Clock size={10} /> Estimasi</p>
                        <p className="text-sm font-black text-blue-600">{job.est_process}</p>
                      </div>
                    </div>
                    <SlotBar job={job} />
                  </button>
                );
              })}
            </div>
          )}
          </div>
          <div id="job-history" className="lg:sticky scroll-mt-28" style={{ top: 'calc(var(--header-h, 0px) + 1.5rem)' }}>
            <JobHistory userId={userId} pendingAmount={pending.amount} pendingCount={pending.count} onRefresh={pending.reload} />
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsPage;
