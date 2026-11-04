import React from 'react';
import { Users } from 'lucide-react';
import { Job, slotsLeft, slotTone } from '../../lib/jobs';

/** Statistik slot pekerja: bar hijau (banyak) → kuning (sedikit) → merah (hampir/sudah habis). */
const SlotBar: React.FC<{ job: Pick<Job, 'max_workers' | 'taken_slots'>; compact?: boolean }> = ({ job, compact }) => {
  const tone = slotTone(job);
  const left = slotsLeft(job);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 font-bold text-gray-500">
          <Users size={12} /> Max pekerja {job.max_workers}
        </span>
        <span className={`font-black ${tone.text}`}>{left > 0 ? `${left} slot tersisa` : 'Penuh'}</span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-gray-100 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={job.max_workers}
        aria-valuenow={left}
        aria-label={`${left} dari ${job.max_workers} slot tersisa`}
      >
        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.max(tone.ratio * 100, left > 0 ? 4 : 0)}%` }} />
      </div>
      {!compact && <p className={`text-[10px] font-bold ${tone.text}`}>{tone.label}</p>}
    </div>
  );
};

export default SlotBar;
