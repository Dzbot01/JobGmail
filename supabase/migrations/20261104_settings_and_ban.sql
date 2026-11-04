-- 1) Pengaturan sistem global (jadwal withdraw, setting tugas) yang tersinkron ke semua user
-- 2) Ban user + hapus seluruh datanya secara atomik (khusus admin)
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → paste → Run. Aman dijalankan ulang.

-- Helper: apakah user yang login adalah admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.pengguna where id = auth.uid() and peran = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- ===== 1) app_settings (satu baris, id = 1) =====
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  withdraw_schedule text not null default 'Selalu Buka'
    check (withdraw_schedule in ('Selalu Buka', 'Senin - Jumat', 'Sabtu - Minggu', 'Kunci')),
  task_reward integer not null default 1600 check (task_reward >= 0),
  task_password text not null default 'Ajax1122*',
  task_description text not null default 'Silahkan masukkan data akun Gmail yang baru kamu buat. Pastikan akun dalam keadaan aktif dan belum pernah didaftarkan sebelumnya.',
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated using (true);

drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Realtime: user yang sedang online langsung menerima perubahan jadwal
do $$ begin
  alter publication supabase_realtime add table public.app_settings;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ===== 2) Ban + hapus data =====
-- Menandai user banned lalu MENGHAPUS PERMANEN: saldo, riwayat setoran, riwayat withdraw, alamat penarikan,
-- jatah spin, bonus referral, pekerjaan yang dibuat & kiriman tugasnya (jika tabel tersebut ada).
create or replace function public.admin_ban_users(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;

  update public.pengguna
     set is_banned = true,
         saldo = 0,
         history = '[]',
         withdraw_history = '[]',
         payment = '{}',
         spin_hari_ini = 0,
         pool_hadiah_hari_ini = 0
   where id = any(p_ids) and coalesce(peran, 'user') <> 'admin';
  get diagnostics n = row_count;

  -- Kolom/tabel opsional dari migrasi lain
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pengguna' and column_name = 'referral_earnings') then
    execute 'update public.pengguna set referral_earnings = 0 where id = any($1)' using p_ids;
  end if;
  if to_regclass('public.job_submissions') is not null then
    execute 'delete from public.job_submissions where worker_id = any($1)' using p_ids;
  end if;
  if to_regclass('public.jobs') is not null then
    execute 'delete from public.jobs where owner_id = any($1)' using p_ids;
  end if;

  return n;
end;
$$;

revoke all on function public.admin_ban_users(uuid[]) from public;
grant execute on function public.admin_ban_users(uuid[]) to authenticated;
