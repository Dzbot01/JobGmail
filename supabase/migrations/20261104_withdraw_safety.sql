-- Keamanan withdraw: saldo tidak boleh minus
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → paste → Run. Aman dijalankan ulang.

-- 1) Database menolak setiap penulisan yang membuat saldo < 0.
--    NOT VALID: baris lama yang (karena bug sebelumnya) sudah minus tidak membuat migrasi gagal,
--    tetapi setiap UPDATE/INSERT berikutnya wajib saldo >= 0.
do $$ begin
  alter table public.pengguna add constraint pengguna_saldo_nonnegative check (saldo >= 0) not valid;
exception when duplicate_object then null; end $$;

-- 2) Withdraw atomik: kunci baris user, cek saldo + jadwal + status banned, potong saldo,
--    dan catat riwayat dalam satu transaksi (aman dari klik ganda / tab ganda).
create or replace function public.request_withdraw(p_amount integer, p_user_name text default '')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.pengguna%rowtype;
  sched text := 'Selalu Buka';
  dow integer := extract(dow from (now() at time zone 'Asia/Jakarta'))::int; -- 0 = Minggu
  item jsonb;
begin
  if auth.uid() is null then raise exception 'Harus login'; end if;
  if p_amount is null or p_amount < 1000 then raise exception 'Minimal penarikan Rp 1.000'; end if;

  select * into u from public.pengguna where id = auth.uid() for update;
  if not found then raise exception 'User tidak ditemukan'; end if;
  if coalesce(u.is_banned, false) then raise exception 'Akun diblokir'; end if;
  if coalesce(u.payment->>'method', '') = '' then raise exception 'Alamat penarikan belum diisi'; end if;

  if to_regclass('public.app_settings') is not null then
    execute 'select withdraw_schedule from public.app_settings where id = 1' into sched;
  end if;
  if sched = 'Kunci'
     or (sched = 'Senin - Jumat' and dow not between 1 and 5)
     or (sched = 'Sabtu - Minggu' and dow not in (0, 6)) then
    raise exception 'Withdraw sedang ditutup sesuai jadwal';
  end if;

  if coalesce(u.saldo, 0) < p_amount then
    raise exception 'Saldo tidak cukup (saldo Rp %, diminta Rp %)', coalesce(u.saldo, 0), p_amount;
  end if;

  item := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'amount', p_amount,
    'status', 'process',
    'date', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'method', u.payment->>'method',
    'walletNumber', u.payment->>'number',
    'userName', coalesce(nullif(p_user_name, ''), u.payment->>'name', '')
  );

  update public.pengguna
     set saldo = saldo - p_amount,
         withdraw_history = jsonb_build_array(item) || coalesce(withdraw_history::jsonb, '[]'::jsonb)
   where id = u.id;

  return json_build_object('saldo', u.saldo - p_amount, 'item', item);
end;
$$;

revoke all on function public.request_withdraw(integer, text) from public;
grant execute on function public.request_withdraw(integer, text) to authenticated;
