/** Status setoran akun Gmail: process → review (sedang diproses admin) → paid / rejected. */
export type SubmissionStatus = 'process' | 'review' | 'paid' | 'rejected';

export const SUBMISSION_STATUS: Record<SubmissionStatus, { label: string; badge: string; soft: string }> = {
  process: { label: 'Proses', badge: 'bg-orange-100 text-orange-600', soft: 'bg-orange-50 text-orange-600' },
  review: { label: 'Review', badge: 'bg-blue-100 text-blue-600', soft: 'bg-blue-50 text-blue-600' },
  paid: { label: 'Paid', badge: 'bg-emerald-100 text-emerald-600', soft: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: 'Ditolak', badge: 'bg-red-100 text-red-600', soft: 'bg-red-50 text-red-600' },
};

export const submissionStatus = (s: string) => SUBMISSION_STATUS[(s as SubmissionStatus)] || SUBMISSION_STATUS.process;

/** Masih menunggu keputusan admin (belum paid/ditolak). */
export const isPendingSubmission = (s: string) => s === 'process' || s === 'review';
