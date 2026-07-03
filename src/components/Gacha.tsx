import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '../supabase';

interface GachaProps {
  userId: string; // WAJIB: uuid user yang login dari Supabase Auth
  setBalance: (v: number) => void; // buat update UI saldo
}

const MAX_SPINS_PER_DAY = 3;
const DAILY_REWARD_LIMIT = 10;
const segments = [2, 5, 'ZONK', 10, 1, 3, 'ZONK', 4];

const Gacha: React.FC<GachaProps> = ({ userId, setBalance }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [spins, setSpins] = useState(MAX_SPINS_PER_DAY);
  const [loading, setLoading] = useState(true);

  // 1. AMBIL DATA SPIN HARI INI DARI DB
  useEffect(() => {
    const fetchSpinData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
       .from('pengguna')
       .select('spin_hari_ini, last_spin_date, saldo')
       .eq('uuid', userId)
       .single();

      if (error) console.error(error);

      if (data) {
        if (data.last_spin_date === today) {
          setSpins(data.spin_hari_ini); // Masih hari yg sama
        } else {
          // Ganti hari, reset di DB
          await supabase.from('pengguna').update({
            spin_hari_ini: MAX_SPINS_PER_DAY,
            pool_hadiah_hari_ini: DAILY_REWARD_LIMIT,
            last_spin_date: today
          }).eq('uuid', userId);
          setSpins(MAX_SPINS_PER_DAY);
        }
        setBalance(data.saldo);
      }
      setLoading(false);
    };
    fetchSpinData();
  }, [userId]);

  const handleSpin = async () => {
    if (spins <= 0 || isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    // 2. PANGGIL RPC BUAT KUNCI + AMBIL HADIAH ATOMIK
    const { data, error } = await supabase.rpc('spin_gacha', {
      p_user_id: userId,
      p_segments: segments,
      p_max_pool: DAILY_REWARD_LIMIT
    });

    if (error) {
      console.error('Spin gagal:', error);
      setIsSpinning(false);
      return;
    }

    const { hadiah, sisa_spin, sisa_pool, saldo_baru, winning_index } = data;

    // 3. ANIMASI RODA
    const extraRotations = 5 * 360;
    const targetRotation = extraRotations - (winning_index * 45) - 22.5;
    const relativeRotation = targetRotation + (Math.ceil(rotation / 360) * 360);
    setRotation(relativeRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setSpins(sisa_spin);
      setResult(hadiah);
      setBalance(saldo_baru);
    }, 3000);
  };

  if (loading) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border-gray-100 text-center">
        <h2 className="text-xl font-bold mb-2 text-gray-800">Lucky Spinner</h2>
        <p className="text-sm text-gray-500 mb-6 font-medium">Kamu punya <span className="font-bold text-blue-600">{spins}</span> jatah spin hari ini.</p>

        <div className="relative w-64 h-64 mx-auto mb-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 drop-shadow-md">
            <div className="w-4 h-8 bg-red-600 shadow-sm" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
          </div>

          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning? 'transform 3s cubic-bezier(0.2, 0, 0.2, 1)' : 'none'
            }}
            className="w-full h-full rounded-full border-8 border-blue-50 shadow-inner relative overflow-hidden bg-white"
          >
            {segments.map((val, i) => (
               <div
                 key={i}
                 className={`absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left`}
                 style={{
                   transform: `rotate(${i * 45}deg)`,
                   backgroundColor: i % 2 === 0? '#f8fafc' : '#ffffff',
                   clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                   borderRight: '1px solid rgba(0,0,0,0.05)'
                 }}
               >
                 <div className="absolute top-10 left-3 -rotate-[67.5deg]">
                   <span className={`text-[10px] font-black uppercase whitespace-nowrap ${val === 'ZONK'? 'text-red-500' : 'text-blue-500'}`}>
                     {val === 'ZONK'? 'ZONK' : `Rp ${val}`}
                   </span>
                 </div>
               </div>
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-8 h-8 bg-white rounded-full shadow-lg z-20 border-4 border-blue-100 flex items-center justify-center font-black text-xs text-blue-400">G</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSpin}
          disabled={spins === 0 || isSpinning}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg ${
            spins > 0 &&!isSpinning? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSpinning? 'Memutar...' : 'SPIN SEKARANG!'}
        </button>

        {result!== null &&!isSpinning && (
          <div className="mt-4 p-3 bg-yellow-50 border-yellow-100 rounded-xl flex items-center justify-center gap-2">
            <Trophy className="text-yellow-600" size={20} />
            <span className="text-yellow-800 font-bold">
              Selamat! Kamu mendapatkan Rp. {result}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gacha;