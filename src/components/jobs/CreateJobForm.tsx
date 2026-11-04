import React, { useState } from 'react';
import { Plus, Trash2, Loader2, Send } from 'lucide-react';
import { createJob, EST_OPTIONS, FIELD_TYPES, FieldType, formatRupiah, jobsErrorMessage, makeFieldKey, SHORT_DESC_MAX } from '../../lib/jobs';

interface Props {
  userId: string;
  ownerName: string;
  balance: number;
  showAlert: (message: string, subtext: string, type?: 'success' | 'error') => void;
  onCreated: () => void;
}

interface DraftField { id: number; label: string; type: FieldType; required: boolean }

const inputCls = 'w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:border-blue-400 focus:bg-white';
const labelCls = 'block text-xs font-bold text-gray-400 uppercase mb-2';

let nextId = 1;

const CreateJobForm: React.FC<Props> = ({ userId, ownerName, balance, showAlert, onCreated }) => {
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [detail, setDetail] = useState('');
  const [instructions, setInstructions] = useState('');
  const [reward, setReward] = useState('');
  const [estProcess, setEstProcess] = useState(EST_OPTIONS[2]);
  const [maxWorkers, setMaxWorkers] = useState('10');
  const [fields, setFields] = useState<DraftField[]>([{ id: nextId++, label: 'Email', type: 'text', required: true }]);
  const [saving, setSaving] = useState(false);

  const rewardNum = parseInt(reward) || 0;
  const maxNum = parseInt(maxWorkers) || 0;
  const budget = rewardNum * maxNum;

  const updateField = (id: number, patch: Partial<DraftField>) =>
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));

  const reset = () => {
    setTitle(''); setShortDesc(''); setDetail(''); setInstructions(''); setReward('');
    setEstProcess(EST_OPTIONS[2]); setMaxWorkers('10');
    setFields([{ id: nextId++, label: 'Email', type: 'text', required: true }]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = (m: string) => showAlert('Gagal!', m, 'error');
    if (title.trim().length < 3) return err('Judul pekerjaan minimal 3 karakter.');
    if (!shortDesc.trim()) return err('Deskripsi singkat wajib diisi.');
    if (shortDesc.length > SHORT_DESC_MAX) return err(`Deskripsi singkat maksimal ${SHORT_DESC_MAX} karakter.`);
    if (!detail.trim()) return err('Deskripsi detail wajib diisi.');
    if (!instructions.trim()) return err('Tata cara pengerjaan wajib diisi.');
    if (rewardNum < 1) return err('Bayaran minimal Rp 1.');
    if (maxNum < 1 || maxNum > 10000) return err('Max pekerja antara 1 - 10.000.');
    const cleanFields = fields.filter(f => f.label.trim());
    if (cleanFields.length === 0) return err('Tambahkan minimal 1 kolom pengiriman tugas.');

    const taken = new Set<string>();
    const payloadFields = cleanFields.map(f => ({ key: makeFieldKey(f.label, taken), label: f.label.trim(), type: f.type, required: f.required }));

    setSaving(true);
    try {
      await createJob(userId, ownerName, {
        title: title.trim(),
        short_desc: shortDesc.trim(),
        detail: detail.trim(),
        instructions: instructions.trim(),
        reward: rewardNum,
        est_process: estProcess,
        max_workers: maxNum,
        fields: payloadFields,
      });
      showAlert('Berhasil!', 'Pekerjaan berhasil dipublikasikan.', 'success');
      reset();
      onCreated();
    } catch (e: any) {
      err(jobsErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100 space-y-5">
      <div>
        <h3 className="text-lg font-bold text-gray-800">Buat Pekerjaan</h3>
        <p className="text-xs text-gray-400">Pekerjaan akan tampil di halaman Cari Pekerjaan untuk semua pekerja.</p>
      </div>

      <div>
        <label className={labelCls}>Judul Pekerjaan</label>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="Contoh: Follow akun Instagram" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Deskripsi Singkat (maks {SHORT_DESC_MAX} karakter)</label>
        <input value={shortDesc} onChange={e => setShortDesc(e.target.value.slice(0, SHORT_DESC_MAX))} placeholder="Ringkasan pekerjaan" className={inputCls} />
        <p className={`text-[10px] mt-1 text-right font-bold ${shortDesc.length >= SHORT_DESC_MAX ? 'text-orange-500' : 'text-gray-400'}`}>{shortDesc.length}/{SHORT_DESC_MAX}</p>
      </div>

      <div>
        <label className={labelCls}>Deskripsi Detail</label>
        <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={4} placeholder="Jelaskan pekerjaan secara lengkap" className={`${inputCls} resize-y`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Bayaran (Rp)</label>
          <input value={reward} onChange={e => setReward(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="1000" className={`${inputCls} font-bold`} />
        </div>
        <div>
          <label className={labelCls}>Estimasi Proses</label>
          <select value={estProcess} onChange={e => setEstProcess(e.target.value)} className={inputCls}>
            {EST_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Max Pekerja</label>
          <input value={maxWorkers} onChange={e => setMaxWorkers(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${inputCls} font-bold`} />
        </div>
      </div>
      {budget > 0 && (
        <p className={`text-[11px] font-bold -mt-2 ${budget > balance ? 'text-orange-600' : 'text-gray-500'}`}>
          Total anggaran maksimal: {formatRupiah(budget)} · Saldo kamu: {formatRupiah(balance)}
          {budget > balance && ' — pastikan saldo cukup saat menyetujui kiriman pekerja.'}
        </p>
      )}

      <div>
        <label className={labelCls}>Tata Cara Pengerjaan</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={5} placeholder={'1. Buka link ...\n2. Lakukan ...\n3. Kirim bukti ...'} className={`${inputCls} resize-y`} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={`${labelCls} mb-0`}>Field Pengiriman Tugas</label>
          <button type="button" onClick={() => setFields(p => [...p, { id: nextId++, label: '', type: 'text', required: true }])} className="text-xs font-bold text-blue-600 flex items-center gap-1">
            <Plus size={14} /> Tambah kolom
          </button>
        </div>
        <p className="text-[11px] text-gray-400 -mt-1">Beri nama setiap kolom yang harus diisi pekerja (mis. "Password", "Link Profil", "Screenshot Bukti"). Untuk bukti gambar pilih tipe <b>URL Gambar</b> — pekerja mengirim link gambar https.</p>
        {fields.map((f, i) => (
          <div key={f.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
            <input
              value={f.label}
              onChange={e => updateField(f.id, { label: e.target.value.slice(0, 40) })}
              placeholder={`Nama kolom ${i + 1}`}
              className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
            <div className="flex items-center gap-2">
              <select value={f.type} onChange={e => updateField(f.id, { type: e.target.value as FieldType })} className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm outline-none">
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label className="flex items-center gap-1 text-[11px] font-bold text-gray-500 whitespace-nowrap">
                <input type="checkbox" checked={f.required} onChange={e => updateField(f.id, { required: e.target.checked })} className="w-4 h-4" /> Wajib
              </label>
              <button type="button" onClick={() => setFields(p => p.filter(x => x.id !== f.id))} disabled={fields.length === 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30" aria-label="Hapus kolom">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="submit" disabled={saving} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-60">
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Publikasikan Pekerjaan
      </button>
    </form>
  );
};

export default CreateJobForm;
