import React, { useState, useEffect } from 'react';
import { Upload, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';

interface AlamatPenarikanProps {
  onBack: () => void;
  onConfirm: (data: { method: string, number: string, name: string, qris_url?: string }) => void;
  savedData?: { method: string, number: string, name: string, qris_url?: string };
  showAlert: (message: string, subtext: string, type: 'success' | 'error') => void;
  userId: string;
}

const AlamatPenarikan: React.FC<AlamatPenarikanProps> = ({ onBack, onConfirm, savedData, showAlert, userId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [method, setMethod] = useState(savedData?.method || 'Dana');
  const [number, setNumber] = useState(savedData?.number || '');
  const [name, setName] = useState(savedData?.name || '');
  const [qrisUrl, setQrisUrl] = useState(savedData?.qris_url || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const isSaved =!!savedData?.method &&!isEditing;

  useEffect(() => {
  const init = async () => {
    // Guard: kalo userId kosong skip aja
    if (!userId) {
      setInitLoading(false);
      return;
    }

    try {
      // Ambil data terbaru dari DB biar sinkron
      const { data, error } = await supabase
      .from('pengguna')
      .select('payment')
      .eq('id', userId)
      .single();

      if (error) throw error;

      if (data?.payment) {
        setMethod(data.payment.method || 'Dana');
        setNumber(data.payment.number || '');
        setName(data.payment.name || '');
        setQrisUrl(data.payment.qris_url || '');
      } else if (savedData) {
        // fallback kalo DB kosong
        setMethod(savedData.method);
        setNumber(savedData.number);
        setName(savedData.name);
        setQrisUrl(savedData.qris_url || '');
      }
    } catch (err: any) {
      console.error('Gagal load payment:', err.message);
      // kalo DB error, tetep pake savedData biar form ga kosong
      if (savedData) {
        setMethod(savedData.method);
        setNumber(savedData.number);
        setName(savedData.name);
        setQrisUrl(savedData.qris_url || '');
      }
    } finally {
      setInitLoading(false);
    }
  };
  init();
}, [userId]); // HAPUS savedData dari sini

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 1024 * 1024) {
        showAlert('Gagal!', 'Ukuran file maksimal 1MB', 'error');
        return;
      }
      setFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      showAlert('Gagal!', 'User ID belum ke-load', 'error');
      return;
    }
    if (!number && method!== 'Qris') {
      showAlert('Gagal!', 'Nomor e-wallet wajib diisi', 'error');
      return;
    }
    if (!name && method!== 'Qris') {
      showAlert('Gagal!', 'Nama pengguna wajib diisi', 'error');
      return;
    }
    if (method === 'Qris' &&!file &&!qrisUrl) {
      showAlert('Gagal!', 'Upload QRIS dulu bang', 'error');
      return;
    }

    setLoading(true);
    try {
      let finalQrisUrl = qrisUrl;

      if (method === 'Qris' && file) {
        const fileName = `${userId}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
         .from('qris')
         .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
         .from('qris')
         .getPublicUrl(fileName);

        finalQrisUrl = urlData.publicUrl;
        setQrisUrl(finalQrisUrl);
      }

      const paymentData = {
        method,
        number: method === 'Qris'? '' : number,
        name: method === 'Qris'? '' : name,
        qris_url: method === 'Qris'? finalQrisUrl : null
      };

      const { error: updateError } = await supabase
       .from('pengguna')
       .update({ payment: paymentData })
       .eq('id', userId);

      if (updateError) throw updateError;

      showAlert('Sukses!', 'Alamat penarikan tersimpan', 'success');
      onConfirm(paymentData);
      setIsEditing(false);
    } catch (err: any) {
      showAlert('Gagal!', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Loading state biar ga render form duluan pas userId null
  if (initLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold">Alamat Penarikan</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Metode Penarikan</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={isSaved}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 focus:border-blue-400 focus:bg-white outline-none appearance-none font-medium disabled:opacity-60"
            >
              <option value="Dana">Dana</option>
              <option value="Gopay">Gopay</option>
              <option value="Qris">Qris</option>
            </select>
          </div>

          {method!== 'Qris'? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nomor E-Wallet</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="0812xxxx"
                  disabled={isSaved}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 focus:border-blue-400 focus:bg-white outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nama Pengguna</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Lengkap"
                  disabled={isSaved}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-100 focus:border-blue-400 focus:bg-white outline-none disabled:opacity-60"
                />
              </div>
            </>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex-col items-center justify-center gap-3 bg-gray-50/50">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                <Upload size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700">
                  {file? file.name : qrisUrl? 'QRIS sudah diupload' : 'Upload QRIS Anda'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Maksimal ukuran file: 1MB</p>
                {qrisUrl && <img src={qrisUrl} className="w-32 h-32 mt-3 rounded-lg object-contain" />}
              </div>
              {!isSaved && (
                <>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="qris-upload" />
                  <label
                    htmlFor="qris-upload"
                    className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-bold cursor-pointer hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
                  >
                    Pilih File
                  </label>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={isSaved || loading}
              className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${
                isSaved
                 ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 text-white shadow-blue-100 active:scale-95 disabled:opacity-60'
              }`}
            >
              {loading? 'Menyimpan...' : isSaved? 'Tersimpan' : 'Konfirmasi'}
            </button>

            {!!savedData?.method &&!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 text-blue-600 font-bold text-sm hover:bg-blue-50 rounded-xl transition-colors"
              >
                Edit Alamat Penarikan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlamatPenarikan;