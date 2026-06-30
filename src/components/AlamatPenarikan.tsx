import React, { useState, useEffect } from 'react';
import { Upload, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';

interface AlamatPenarikanProps {
  onBack: () => void;
  onConfirm: (data: { method: string, number: string, name: string, qris_url?: string }) => void;
  savedData?: { method: string, number: string, name: string, qris_url?: string };
  showAlert: (message: string, subtext: string, type: 'success' | 'error') => void;
  userId: string; // <-- 1. TAMBAH INI
}

const AlamatPenarikan: React.FC<AlamatPenarikanProps> = ({ onBack, onConfirm, savedData, showAlert, userId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [method, setMethod] = useState(savedData?.method || 'Dana');
  const [number, setNumber] = useState(savedData?.number || '');
  const [name, setName] = useState(savedData?.name || '');
  const [qrisUrl, setQrisUrl] = useState(savedData?.qris_url || ''); // <-- 2. TAMBAH STATE QRIS
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false); // <-- 3. TAMBAH LOADING
  const [initLoading, setInitLoading] = useState(true); // <-- 4. TAMBAH INIT LOADING

  const isSaved =!!savedData?.method &&!isEditing;

  // === 5. useEffect FETCH DARI DB DISALIN PLEK ===
  useEffect(() => {
    const init = async () => {
      if (!userId) {
        setInitLoading(false);
        return;
      }

      try {
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
          setMethod(savedData.method);
          setNumber(savedData.number);
          setName(savedData.name);
          setQrisUrl(savedData.qris_url || '');
        }
      } catch (err: any) {
        console.error('Gagal load payment:', err.message);
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
  }, [userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 1024 * 1024) {
        showAlert('Gagal!', 'Ukuran file maksimal 1MB', 'error');
        return;
      }
      setFile(e.target.files[0]);
    }
  };

  // === 6. handleSave FULL DISALIN PLEK ===
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

  // === 7. LOADING STATE BIKIN BEDA ===
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
          <h2 className="text-xl font-bold text-gray-800">Alamat Penarikan</h2>
        </div>

        {/* Animated Wallet Component - UI TETAP SAMA */}
        <div className="wallet-wrapper">
          <div className="wallet">
            <div className="wallet-back"></div>

            <div className="wallet-card wallet-stripe">
              <div className="wallet-card-inner">
                <div className="wallet-card-top">
                  <span>Dana</span>
                  <div className="wallet-chip"></div>
                </div>
                <div className="wallet-card-bottom">
                  <div className="wallet-card-info">
                    <span className="wallet-label">Holder</span>
                    <span className="wallet-value">E-WALLET</span>
                  </div>
                  <div className="wallet-card-number-wrapper">
                    <span className="wallet-hidden-stars">**** ××××</span>
                    <span className="wallet-card-number">×× ×××× ××××</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="wallet-card wallet-wise">
              <div className="wallet-card-inner">
                <div className="wallet-card-top">
                  <span>Gopay</span>
                  <div className="wallet-chip"></div>
                </div>
                <div className="wallet-card-bottom">
                  <div className="wallet-card-info">
                    <span className="wallet-label">Business</span>
                    <span className="wallet-value">E-WALLET</span>
                  </div>
                  <div className="wallet-card-number-wrapper">
                    <span className="wallet-hidden-stars">**** ××××</span>
                    <span className="wallet-card-number">×× ×××× ××××</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="wallet-card wallet-paypal">
              <div className="wallet-card-inner">
                <div className="wallet-card-top">
                  <span>Qris</span>
                  <div className="wallet-chip"></div>
                </div>
                <div className="wallet-card-bottom">
                  <div className="wallet-card-info">
                    <span className="wallet-label">Qr Code</span>
                    <span className="wallet-value">Qris</span>
                  </div>
                  <div className="wallet-card-number-wrapper">
                    <span className="wallet-hidden-stars">**** 0094</span>
                    <span className="wallet-card-number">3312 0045 0094</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="wallet-pocket">
              <svg className="wallet-pocket-svg" viewBox="0 0 280 160" fill="none">
                <path
                  d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 240 25 C 255 25, 260 10, 270 10 C 275 10, 280 10, 280 20 L 280 120 C 280 155, 260 160, 240 160 L 40 160 C 20 160, 0 155, 0 120 Z"
                  fill="#1e341e"
                ></path>
                <path
                  d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 240 29 C 253 29, 257 16, 265 16 C 268 16, 272 16, 272 22 L 272 120 C 272 150, 255 152, 240 152 L 40 152 C 25 152, 8 152, 8 120 Z"
                  stroke="#3d5635"
                  stroke-width="1.5"
                  stroke-dasharray="6 4"
                ></path>
              </svg>
              <div className="wallet-pocket-content">
                <div style={{ position: 'relative', height: '24px', width: '100%' }}>
                  <div className="wallet-balance-stars">******</div>
                  <div className="wallet-balance-real">Rp. ×××</div>
                </div>
                <div style={{ color: '#698263', fontSize: '12px', fontWeight: '500' }}>
                  Total Balance
                </div>
                <div className="wallet-eye-icon-wrapper">
                  <svg
                    className="wallet-eye-icon wallet-eye-slash"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    <line x1="3" y1="3" x2="21" y2="21"></line>
                  </svg>
                  <svg
                    className="wallet-eye-icon wallet-eye-open"
                    style={{ opacity: 0 }}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Metode Penarikan</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={isSaved} // <-- 8. DISABLE KALO UDAH SAVED
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
                  disabled={isSaved} // <-- 8. DISABLE KALO UDAH SAVED
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
                  disabled={isSaved} // <-- 8. DISABLE KALO UDAH SAVED
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
                <p className="text-sm font-bold text-gray-700">{file? file.name : qrisUrl? 'QRIS sudah diupload' : 'Upload QRIS Anda'}</p> // <-- 9. TAMPILIN QRIS URL
                <p className="text-[10px] text-gray-400 mt-1">Maksimal ukuran file: 1MB</p>
                {qrisUrl && <img src={qrisUrl} className="w-32 h-32 mt-3 rounded-lg object-contain" />} // <-- 9. PREVIEW GAMBAR
              </div>
              {!isSaved && ( // <-- 10. SEMBUNYIKAN INPUT KALO UDAH SAVED
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="qris-upload"
                  />
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
              onClick={handleSave} // <-- 11. PAKE handleSave BUKAN onConfirm LANGSUNG
              disabled={isSaved || loading} // <-- 11. TAMBAH LOADING
              className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${
                isSaved
               ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 text-white shadow-blue-100 active:scale-95 disabled:opacity-60'
              }`}
            >
              {loading? 'Menyimpan...' : isSaved? 'Tersimpan' : 'Konfirmasi'} // <-- 11. TEXT LOADING
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