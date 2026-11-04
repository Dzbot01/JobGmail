-- Fitur "Cari Pekerjaan" (marketplace pekerjaan antar user) Job Gmail
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → paste → Run.
-- Aman dijalankan ulang (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
-- Tidak menyimpan file/gambar: bukti gambar dikirim sebagai URL https.

-- 0) Mode akun: 'pekerja' (default) atau 'pencari'
alter table public.pengguna
  add column if not exists mode_akun text not null default 'pekerja';
do $$ begin
  alter table public.pengguna add constraint pengguna_mode_akun_check check (mode_akun in ('pekerja', 'pencari'));
exception when duplicate_object then null; end $$;

-- 1) Pekerjaan
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.pengguna(id) on delete cascade,
  owner_name text not null default '',
  title text not null check (char_length(title) between 3 and 100),
  short_desc text not null check (char_length(short_desc) between 1 and 50),
  detail text not null default '',
  instructions text not null default '',
  reward integer not null check (reward >= 1),
  est_process text not null default '1-24 jam',
  max_workers integer not null check (max_workers between 1 and 10000),
  taken_slots integer not null default 0,
  -- [{ "key": "password", "label": "Password", "type": "text|password|url|image_url", "required": true }]
  fields jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists jobs_status_created_idx on public.jobs (status, created_at desc);
create index if not exists jobs_owner_idx on public.jobs (owner_id);

-- 2) Kiriman tugas (satu kiriman per pekerja per pekerjaan)
create table if not exists public.job_submissions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.pengguna(id) on delete cascade,
  worker_email text not null default '',
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'process' check (status in ('process', 'paid', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (job_id, worker_id)
);
create index if not exists job_submissions_job_idx on public.job_submissions (job_id, created_at desc);
create index if not exists job_submissions_worker_idx on public.job_submissions (worker_id, created_at desc);

-- 3) Validasi + hitung slot di server
create or replace function public.job_submission_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j public.jobs%rowtype;
begin
  select * into j from public.jobs where id = new.job_id for update;
  if not found then raise exception 'Pekerjaan tidak ditemukan'; end if;
  if j.status <> 'open' then raise exception 'Pekerjaan sudah ditutup'; end if;
  if j.owner_id = new.worker_id then raise exception 'Tidak bisa mengerjakan pekerjaan sendiri'; end if;
  if j.taken_slots >= j.max_workers then raise exception 'Slot pekerjaan sudah penuh'; end if;
  if exists (select 1 from public.pengguna where id = new.worker_id and coalesce(is_banned, false)) then
    raise exception 'Akun diblokir';
  end if;
  update public.jobs set taken_slots = taken_slots + 1 where id = new.job_id;
  new.status := 'process';
  return new;
end;
$$;

drop trigger if exists trg_job_submission_before_insert on public.job_submissions;
create trigger trg_job_submission_before_insert
  before insert on public.job_submissions
  for each row execute function public.job_submission_before_insert();

-- Kiriman ditolak → slot dikembalikan
create or replace function public.job_submission_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'rejected' and old.status <> 'rejected' then
    update public.jobs set taken_slots = greatest(taken_slots - 1, 0) where id = new.job_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_job_submission_after_update on public.job_submissions;
create trigger trg_job_submission_after_update
  after update of status on public.job_submissions
  for each row execute function public.job_submission_after_update();

-- 4) Review oleh pembuat pekerjaan; pembayaran atomik dari saldo pembuat ke pekerja
create or replace function public.review_job_submission(p_submission_id uuid, p_approve boolean, p_reason text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.job_submissions%rowtype;
  j public.jobs%rowtype;
  owner_saldo integer;
begin
  select * into s from public.job_submissions where id = p_submission_id for update;
  if not found then raise exception 'Kiriman tidak ditemukan'; end if;
  select * into j from public.jobs where id = s.job_id;
  if j.owner_id <> auth.uid() then raise exception 'Bukan pemilik pekerjaan'; end if;
  if s.status <> 'process' then raise exception 'Kiriman sudah direview'; end if;

  if p_approve then
    select saldo into owner_saldo from public.pengguna where id = j.owner_id for update;
    if coalesce(owner_saldo, 0) < j.reward then
      raise exception 'Saldo kamu tidak cukup untuk membayar (butuh Rp %)', j.reward;
    end if;
    update public.pengguna set saldo = saldo - j.reward where id = j.owner_id;
    update public.pengguna set saldo = coalesce(saldo, 0) + j.reward where id = s.worker_id;
    update public.job_submissions set status = 'paid', reviewed_at = now(), reason = null where id = s.id;
  else
    update public.job_submissions set status = 'rejected', reviewed_at = now(), reason = nullif(p_reason, '') where id = s.id;
  end if;

  return json_build_object('ok', true, 'status', case when p_approve then 'paid' else 'rejected' end);
end;
$$;

revoke all on function public.review_job_submission(uuid, boolean, text) from public;
grant execute on function public.review_job_submission(uuid, boolean, text) to authenticated;

-- 5) Row Level Security
alter table public.jobs enable row level security;
alter table public.job_submissions enable row level security;

drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select to authenticated using (true);

drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs for insert to authenticated
  with check (owner_id = auth.uid() and taken_slots = 0);

drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs for delete to authenticated using (owner_id = auth.uid());

drop policy if exists job_submissions_select on public.job_submissions;
create policy job_submissions_select on public.job_submissions for select to authenticated
  using (
    worker_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid())
  );

drop policy if exists job_submissions_insert on public.job_submissions;
create policy job_submissions_insert on public.job_submissions for insert to authenticated
  with check (worker_id = auth.uid());
-- Tidak ada policy UPDATE/DELETE: perubahan status hanya lewat review_job_submission().
