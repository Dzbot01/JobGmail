-- =====================================================================
-- Honor Score + status setoran "review"
-- Jalankan di Supabase SQL Editor. Aman dijalankan ulang (idempotent).
-- Bergantung pada public.is_admin() (20261104_settings_and_ban.sql).
--
-- Aturan (sama dengan src/lib/honor.ts):
--   default 100, rentang 0..100
--   setoran DITOLAK admin  : -40 per akun
--   setoran DITERIMA admin : +10 per akun (maks 100)
--   BIRU   >= 70 : aman
--   KUNING 30..69: maks 1 kali kirim per hari (WIB), setor bulk tidak boleh
--   MERAH  <  30 : akun otomatis diblokir (is_banned = true)
-- Status setoran: process -> review (sedang diproses admin) -> paid / rejected
-- =====================================================================

alter table public.pengguna add column if not exists honor_score integer not null default 100;
alter table public.pengguna add column if not exists is_banned boolean not null default false;
do $$ begin
  alter table public.pengguna add constraint pengguna_honor_score_range check (honor_score between 0 and 100);
exception when duplicate_object then null; end $$;

create or replace function public.pengguna_honor_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_admin boolean := public.is_admin();
  v_rej integer := 0;
  v_acc integer := 0;
  v_added integer := 0;
  v_today_wib date := (now() at time zone 'Asia/Jakarta')::date;
begin
  -- Hanya admin (atau trigger ini) yang boleh mengubah honor score & membuka blokir
  if not v_admin then
    new.honor_score := old.honor_score;
    if coalesce(old.is_banned, false) and not coalesce(new.is_banned, false) then
      new.is_banned := true;
    end if;
  end if;

  if new.history is distinct from old.history then
    if v_admin then
      -- Hitung perubahan status per akun (dicocokkan lewat id setoran)
      select
        count(*) filter (where n.e->>'status' = 'rejected' and coalesce(o.e->>'status', '') <> 'rejected'),
        count(*) filter (where n.e->>'status' = 'paid'     and coalesce(o.e->>'status', '') <> 'paid')
      into v_rej, v_acc
      from jsonb_array_elements(coalesce(new.history, '[]'::jsonb)) as n(e)
      join jsonb_array_elements(coalesce(old.history, '[]'::jsonb)) as o(e) on o.e->>'id' = n.e->>'id';

      if v_rej > 0 or v_acc > 0 then
        new.honor_score := greatest(0, least(100, coalesce(new.honor_score, 100) - 40 * v_rej + 10 * v_acc));
        if new.honor_score < 30 and coalesce(new.peran, 'user') <> 'admin' then
          new.is_banned := true;
        end if;
      end if;
    else
      -- User menambah setoran: terapkan batas sesuai warna honor score
      select count(*) into v_added
      from jsonb_array_elements(coalesce(new.history, '[]'::jsonb)) as n(e)
      where not exists (
        select 1 from jsonb_array_elements(coalesce(old.history, '[]'::jsonb)) as o(e) where o.e->>'id' = n.e->>'id'
      );

      if v_added > 0 then
        if coalesce(old.is_banned, false) or old.honor_score < 30 then
          raise exception 'Akun diblokir karena honor score merah. Hubungi admin lewat Tiket Bantuan.';
        end if;
        if old.honor_score < 70 then
          if v_added > 1 then
            raise exception 'Honor score kuning: setor bulk tidak tersedia. Kirim 1 akun saja.';
          end if;
          if exists (
            select 1 from jsonb_array_elements(coalesce(old.history, '[]'::jsonb)) as o(e)
            -- CASE agar teks yang bukan tanggal ISO tidak pernah di-cast (urutan AND tidak dijamin)
            where case when coalesce(o.e->>'timestamp', '') ~ '^\d{4}-\d{2}-\d{2}T'
                       then ((o.e->>'timestamp')::timestamptz at time zone 'Asia/Jakarta')::date = v_today_wib
                       else false end
          ) then
            raise exception 'Honor score kuning: kamu hanya bisa mengirim 1 tugas per hari. Coba lagi besok.';
          end if;
        end if;
      end if;
    end if;
  end if;

  -- Admin membuka blokir user berhonor merah -> mulai lagi dari batas kuning
  if v_admin and coalesce(old.is_banned, false) and not coalesce(new.is_banned, false) and new.honor_score < 30 then
    new.honor_score := 30;
  end if;

  return new;
end $$;

drop trigger if exists pengguna_honor_guard on public.pengguna;
create trigger pengguna_honor_guard before update on public.pengguna
  for each row execute function public.pengguna_honor_guard();
