import React, { useState } from 'react';
import { Trophy } from 'lucide-react';

interface GachaProps {
  spins: number;
  setSpins: (v: number) => void;
  setBalance: (v: any) => void;
  setTotalIncome: (v: any) => void;
}

const Gacha: React.FC<GachaProps> = ({ spins, setSpins, setBalance, setTotalIncome }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [dailyRewardPool, setDailyRewardPool] = useState(10); // Max 10 per day total

  const segments = [2, 5, 'ZONK', 10, 1, 3, 'ZONK', 4];

  const handleSpin = () => {
    if (spins <= 0 || isSpinning) return;

    setIsSpinning(true);
    setSpins(spins - 1);
    
    // Filter segments based on remaining daily pool
    // If pool is 0, only ZONK or 0 reward segments are accessible (logic handled at selection)
    let possibleSegments = segments.map((s, i) => ({ val: s, index: i }));
    
    // Pick a random segment index
    let winningIndex = Math.floor(Math.random() * segments.length);
    let winningVal = segments[winningIndex];

    // Logic to enforce Rp. 10 max reward across ALL 3 spins
    if (typeof winningVal === 'number' && winningVal > dailyRewardPool) {
       // If chosen reward exceeds pool, force a lower reward or ZONK
       const cappedOptions = segments
         .map((s, i) => ({ val: s, index: i }))
         .filter(o => o.val === 'ZONK' || (typeof o.val === 'number' && o.val <= dailyRewardPool));
       
       const fallback = cappedOptions[Math.floor(Math.random() * cappedOptions.length)];
       winningVal = fallback.val;
       winningIndex = fallback.index;
    }

    const extraRotations = 5 * 360;
    const targetRotation = extraRotations - (winningIndex * 45) - 22.5;
    const relativeRotation = targetRotation + (Math.ceil(rotation / 360) * 360);
    setRotation(relativeRotation);

    setTimeout(() => {
      setIsSpinning(false);
      
      if (winningVal === 'ZONK') {
        setResult(0);
      } else {
        const amount = typeof winningVal === 'number' ? winningVal : 0;
        setResult(amount);
        setBalance((prev: number) => prev + amount);
        setTotalIncome((prev: number) => prev + amount);
        setDailyRewardPool(prev => prev - amount);
      }
    }, 3000);
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
        <h2 className="text-xl font-bold mb-2 text-gray-800">Lucky Spinner</h2>
        <p className="text-sm text-gray-500 mb-6 font-medium">Kamu punya <span className="font-bold text-blue-600">{spins}</span> jatah spin hari ini.</p>
        
        <div className="relative w-64 h-64 mx-auto mb-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 drop-shadow-md">
            <div className="w-4 h-8 bg-red-600 shadow-sm" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
          </div>
          
          <div 
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3s cubic-bezier(0.2, 0, 0.2, 1)' : 'none'
            }}
            className="w-full h-full rounded-full border-8 border-blue-50 shadow-inner relative overflow-hidden bg-white"
          >
            {segments.map((val, i) => (
               <div 
                 key={i} 
                 className={`absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left`}
                 style={{ 
                   transform: `rotate(${i * 45}deg)`,
                   backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff',
                   clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                   borderRight: '1px solid rgba(0,0,0,0.05)'
                 }}
               >
                 <div className="absolute top-10 left-3 -rotate-[67.5deg]">
                   <span className={`text-[10px] font-black uppercase whitespace-nowrap ${val === 'ZONK' ? 'text-red-500' : 'text-blue-500'}`}>
                     {val === 'ZONK' ? 'ZONK' : `Rp ${val}`}
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
            spins > 0 && !isSpinning ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSpinning ? 'Memutar...' : 'SPIN SEKARANG!'}
        </button>

        {result !== null && !isSpinning && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center justify-center gap-2">
            <Trophy className="text-yellow-600" size={20} />
            <span className="text-yellow-800 font-bold">
              Selamat! Kamu mendapatkan Rp. {result}
            </span>
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
        <h4 className="text-sm font-bold text-blue-800 mb-1">Cara Bermain:</h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Setiap user mendapatkan 3x spin gratis setiap hari.</li>
          <li>Hadiah maksimal adalah Rp. 10.</li>
          <li>Hadiah langsung ditambahkan ke saldo utama.</li>
        </ul>
      </div>
    </div>
  );
};

export default Gacha;
