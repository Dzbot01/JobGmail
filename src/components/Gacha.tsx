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

  const segments = [2, 5, 0, 10, 1, 3, 8, 4];

  const handleSpin = () => {
    if (spins <= 0 || isSpinning) return;

    setIsSpinning(true);
    setSpins(spins - 1);
    
    const winAmount = Math.floor(Math.random() * 11);
    const extraRotations = 5 * 360;
    const newRotation = rotation + extraRotations + (Math.random() * 360);
    
    setRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setResult(winAmount);
      setBalance((prev: number) => prev + winAmount);
      setTotalIncome((prev: number) => prev + winAmount);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
        <h2 className="text-xl font-bold mb-2 text-gray-800">Lucky Spinner</h2>
        <p className="text-sm text-gray-500 mb-6">Kamu punya <span className="font-bold text-blue-600">{spins}</span> jatah spin hari ini.</p>
        
        <div className="relative w-64 h-64 mx-auto mb-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-4 h-6 bg-red-500" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
          </div>
          
          <div 
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3s cubic-bezier(0.15, 0, 0.15, 1)' : 'none'
            }}
            className="w-full h-full rounded-full border-8 border-blue-100 shadow-inner relative overflow-hidden bg-white"
          >
            {segments.map((val, i) => (
               <div 
                 key={i} 
                 className={`absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left`}
                 style={{ 
                   transform: `rotate(${i * 45}deg)`,
                   backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff',
                   clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                 }}
               >
                 <div className="absolute top-8 left-4 -rotate-45">
                   <span className="text-[10px] font-bold text-blue-500 whitespace-nowrap">
                     Rp {val}
                   </span>
                 </div>
               </div>
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-4 h-4 bg-white rounded-full shadow-md z-20 border-2 border-blue-200" />
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
