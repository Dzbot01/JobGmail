-- Top Up saldo via Tripay + kunci mode Pencari Pekerja (min. saldo Rp 10.000)
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → paste → Run. Aman dijalankan ulang.
--
-- Prinsip keamanan: saldo HANYA ditambah oleh fungsi database claim_topup(), yang sendiri menanyakan
-- status transaksi ke Tripay (lewat worker) — bukan oleh browser. Setiap transaksi hanya bisa diklaim sekali.

-- Helper admin (juga ada di migrasi settings_and_ban; diulang agar file ini mandiri)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pengguna where id = auth.uid() and peran = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- Ekstensi HTTP agar database bisa memverifikasi status transaksi
create extension if not exists http with schema extensions;

-- URL endpoint status di worker (ubah jika alamat worker berubah)
create or replace function public.tripay_status_url()
returns text language sql immutable as $$
  select 'https://boosteryuk.boosteryukid.workers.dev/api/tripay/status?reference='
$$;

-- ===== Tabel top up =====
create table if not exists public.topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.pengguna(id) on delete cascade,
  merchant_ref text not null unique,
  reference text unique,
  method text not null,
  method_name text not null default '',
  amount integer not null check (amount >= 1000),
  status text not null default 'UNPAID' check (status in ('UNPAID', 'PAID', 'EXPIRED', 'FAILED', 'REFUND')),
  pay_data jsonb not null default '{}'::jsonb,   -- kode bayar / QR / checkout url / instruksi (untuk ditampilkan ulang)
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  credited_at timestamptz
);
create index if not exists topups_user_idx on public.topups (user_id, created_at desc);

alter table public.topups enable row level security;

drop policy if exists topups_select_own on public.topups;
create policy topups_select_own on public.topups for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- User hanya boleh membuat catatan top up miliknya sendiri, berstatus UNPAID, belum dikreditkan
drop policy if exists topups_insert_own on public.topups;
create policy topups_insert_own on public.topups for insert to authenticated
  with check (user_id = auth.uid() and status = 'UNPAID' and credited_at is null and paid_at is null);

-- User boleh melengkapi reference & data pembayaran selama masih UNPAID (status/kredit tetap lewat claim_topup)
drop policy if exists topups_update_own on public.topups;
create policy topups_update_own on public.topups for update to authenticated
  using (user_id = auth.uid() and status = 'UNPAID' and credited_at is null)
  with check (user_id = auth.uid() and status = 'UNPAID' and credited_at is null);

-- Cegah user mengubah kolom sensitif lewat UPDATE langsung
create or replace function public.topups_guard_update()
returns trigger language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if new.user_id <> old.user_id or new.merchant_ref <> old.merchant_ref or new.amount <> old.amount
       or new.status <> old.status or new.credited_at is distinct from old.credited_at
       or new.paid_at is distinct from old.paid_at
       or (old.reference is not null and new.reference is distinct from old.reference) then
      raise exception 'Perubahan tidak diizinkan';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_topups_guard_update on public.topups;
create trigger trg_topups_guard_update before update on public.topups
  for each row execute function public.topups_guard_update();

-- ===== Klaim saldo setelah dibayar (diverifikasi ke Tripay) =====
create or replace function public.claim_topup(p_reference text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  t public.topups%rowtype;
  resp extensions.http_response;
  body jsonb;
  d jsonb;
  tstatus text;
  order_total integer;
begin
  if auth.uid() is null then raise exception 'Harus login'; end if;

  select * into t from public.topups where reference = p_reference for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if t.user_id <> auth.uid() and not public.is_admin() then raise exception 'Bukan transaksi kamu'; end if;
  if t.credited_at is not null then
    return json_build_object('status', 'PAID', 'credited', false, 'already', true, 'amount', t.amount);
  end if;

  select * into resp from extensions.http_get(public.tripay_status_url() || p_reference);
  if resp.status <> 200 then raise exception 'Gagal mengecek status ke Tripay (HTTP %)', resp.status; end if;
  body := resp.content::jsonb;
  d := body->'data';
  if d is null or coalesce((body->>'success')::boolean, false) = false then
    raise exception 'Respon Tripay tidak valid';
  end if;

  -- Transaksi harus milik catatan ini
  if d->>'reference' <> p_reference or d->>'merchant_ref' <> t.merchant_ref then
    raise exception 'Data transaksi tidak cocok';
  end if;

  tstatus := upper(coalesce(d->>'status', ''));
  if tstatus <> 'PAID' then
    if tstatus in ('EXPIRED', 'FAILED', 'REFUND') then
      update public.topups set status = tstatus where id = t.id;
    end if;
    return json_build_object('status', tstatus, 'credited', false);
  end if;

  -- Nominal deposit = total order_items (tanpa biaya admin)
  select coalesce(sum((it->>'price')::int * coalesce((it->>'quantity')::int, 1)), 0)
    into order_total
    from jsonb_array_elements(coalesce(d->'order_items', '[]'::jsonb)) it;
  if order_total <> t.amount then raise exception 'Nominal transaksi tidak cocok'; end if;

  update public.pengguna set saldo = coalesce(saldo, 0) + t.amount where id = t.user_id;
  update public.topups set status = 'PAID', paid_at = coalesce(paid_at, now()), credited_at = now() where id = t.id;

  return json_build_object('status', 'PAID', 'credited', true, 'amount', t.amount);
end;
$$;

revoke all on function public.claim_topup(text) from public;
grant execute on function public.claim_topup(text) to authenticated;

-- ===== Kunci mode Pencari Pekerja: hanya saldo >= Rp 10.000 yang boleh membuat pekerjaan =====
do $$ begin
  if to_regclass('public.jobs') is not null then
    execute 'drop policy if exists jobs_insert on public.jobs';
    execute $p$create policy jobs_insert on public.jobs for insert to authenticated
      with check (
        owner_id = auth.uid() and taken_slots = 0
        and exists (select 1 from public.pengguna p where p.id = auth.uid() and coalesce(p.saldo, 0) >= 10000)
      )$p$;
  end if;
end $$;
