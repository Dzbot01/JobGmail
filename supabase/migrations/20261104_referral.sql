-- Sistem referral Job Gmail
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → paste → Run.
-- Aman dijalankan ulang (IF NOT EXISTS / OR REPLACE).

-- 1) Kolom referral pada tabel pengguna
alter table public.pengguna
  add column if not exists referred_by uuid references public.pengguna(id) on delete set null;

alter table public.pengguna
  add column if not exists referral_earnings integer not null default 0;

create index if not exists pengguna_referred_by_idx on public.pengguna (referred_by);

-- 2) Statistik referral milik user yang login.
--    SECURITY DEFINER agar tetap berjalan walau RLS hanya mengizinkan user membaca barisnya sendiri;
--    fungsi hanya mengembalikan email + jumlah tugas "paid" dari user yang diundang oleh auth.uid().
create or replace function public.get_my_referrals()
returns table (email text, paid_tasks integer)
language sql
security definer
set search_path = public
as $$
  select
    p.email::text,
    coalesce((
      select count(*)::int
      from jsonb_array_elements(coalesce(p.history::jsonb, '[]'::jsonb)) as t(item)
      where t.item->>'status' = 'paid'
    ), 0) as paid_tasks
  from public.pengguna p
  where p.referred_by = auth.uid();
$$;

revoke all on function public.get_my_referrals() from public;
grant execute on function public.get_my_referrals() to authenticated;
