-- =====================================================================
-- Tiket Bantuan + log hadiah spin (untuk "Aktivitas Terakhir" admin)
-- Jalankan di Supabase SQL Editor. Aman dijalankan ulang (idempotent).
-- Bergantung pada public.is_admin() (lihat 20261104_settings_and_ban.sql).
-- =====================================================================

-- ---------- 1. TIKET ----------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.pengguna(id) on delete cascade,
  user_name   text not null default '',
  user_email  text not null default '',
  status      text not null default 'pending' check (status in ('pending', 'dibalas')),
  first_message text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_updated_idx on public.support_tickets (updated_at desc);
-- Satu user hanya boleh punya SATU tiket pending pada satu waktu
create unique index if not exists support_tickets_one_pending on public.support_tickets (user_id) where status = 'pending';

create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null,
  sender_role text not null check (sender_role in ('user', 'admin')),
  body        text not null default '',
  image_url   text,
  created_at  timestamptz not null default now(),
  constraint support_messages_not_empty check (length(trim(body)) > 0 or image_url is not null)
);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- Baca: pemilik tiket atau admin. Tulis: HANYA lewat fungsi di bawah (tidak ada policy insert/update).
drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid()
  ));

-- Validasi pesan: maks 200 kata, maks 2000 karakter, filter kata kasar (sama dengan daftar di src/lib/tickets.ts)
create or replace function public.ticket_validate_body(p_body text)
returns text language plpgsql immutable as $$
declare
  b text := trim(coalesce(p_body, ''));
  norm text;
begin
  if length(b) > 2000 then raise exception 'Pesan terlalu panjang'; end if;
  if b <> '' and array_length(regexp_split_to_array(b, '\s+'), 1) > 200 then
    raise exception 'Pesan maksimal 200 kata';
  end if;
  norm := translate(lower(b), '0134578@$', 'oieastbas');
  if norm ~ '\m(anjing|anjg|anjir|bangsat|bajingan|babi|kontol|kntl|memek|mmk|ngentot|ngentod|entot|goblok|goblog|tolol|bego|kampret|jancok|jancuk|cok|asu|brengsek|keparat|tai|taik|sialan|bodoh|idiot|pepek|lonte|pelacur|perek|setan|monyet|fuck|fck|shit|bitch|bastard|asshole|dick)\M' then
    raise exception 'Pesan mengandung kata yang tidak pantas';
  end if;
  return b;
end $$;

-- User membuat tiket baru (ditolak bila masih ada tiket pending)
create or replace function public.create_support_ticket(p_body text, p_image_url text default null)
returns public.support_tickets language plpgsql security definer set search_path = public as $$
declare
  v_body text := public.ticket_validate_body(p_body);
  v_user public.pengguna;
  v_ticket public.support_tickets;
begin
  if auth.uid() is null then raise exception 'Belum login'; end if;
  if v_body = '' and p_image_url is null then raise exception 'Pesan wajib diisi'; end if;
  select * into v_user from public.pengguna where id = auth.uid();
  if not found then raise exception 'Akun tidak ditemukan'; end if;
  if exists (select 1 from public.support_tickets where user_id = auth.uid() and status = 'pending') then
    raise exception 'Kamu masih punya tiket berstatus pending. Tunggu balasan admin dulu.';
  end if;
  insert into public.support_tickets (user_id, user_name, user_email, status, first_message)
  values (auth.uid(), coalesce(nullif(v_user.nama, ''), split_part(v_user.email, '@', 1)), coalesce(v_user.email, ''), 'pending', v_body)
  returning * into v_ticket;
  insert into public.support_messages (ticket_id, sender_id, sender_role, body, image_url)
  values (v_ticket.id, auth.uid(), 'user', v_body, p_image_url);
  return v_ticket;
end $$;

-- Kirim pesan ke tiket. User: hanya bila tiket sudah "dibalas" (lalu kembali pending).
-- Admin: kapan saja (status menjadi "dibalas").
create or replace function public.send_ticket_message(p_ticket_id uuid, p_body text, p_image_url text default null)
returns public.support_messages language plpgsql security definer set search_path = public as $$
declare
  v_body text := public.ticket_validate_body(p_body);
  v_ticket public.support_tickets;
  v_admin boolean := public.is_admin();
  v_msg public.support_messages;
begin
  if auth.uid() is null then raise exception 'Belum login'; end if;
  if v_body = '' and p_image_url is null then raise exception 'Pesan wajib diisi'; end if;
  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;
  if not v_admin then
    if v_ticket.user_id <> auth.uid() then raise exception 'Bukan tiket kamu'; end if;
    if v_ticket.status = 'pending' then raise exception 'Tiket masih pending. Tunggu balasan admin dulu.'; end if;
  end if;
  insert into public.support_messages (ticket_id, sender_id, sender_role, body, image_url)
  values (p_ticket_id, auth.uid(), case when v_admin then 'admin' else 'user' end, v_body, p_image_url)
  returning * into v_msg;
  update public.support_tickets
     set status = case when v_admin then 'dibalas' else 'pending' end, updated_at = now()
   where id = p_ticket_id;
  return v_msg;
end $$;

grant execute on function public.create_support_ticket(text, text) to authenticated;
grant execute on function public.send_ticket_message(uuid, text, text) to authenticated;

-- ---------- 2. STORAGE gambar tiket (bukan di tabel; hanya URL yang disimpan) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-images', 'ticket-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ticket_images_insert on storage.objects;
create policy ticket_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ticket_images_read on storage.objects;
create policy ticket_images_read on storage.objects for select
  using (bucket_id = 'ticket-images');

-- ---------- 3. LOG HADIAH SPIN (dicatat server lewat trigger, tidak bisa dipalsukan dari klien) ----------
create table if not exists public.spin_wins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.pengguna(id) on delete cascade,
  amount     integer not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists spin_wins_created_idx on public.spin_wins (created_at desc);
alter table public.spin_wins enable row level security;
drop policy if exists spin_wins_select on public.spin_wins;
create policy spin_wins_select on public.spin_wins for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Spin menang = jatah spin berkurang DAN saldo bertambah pada update yang sama (dilakukan RPC spin_gacha)
create or replace function public.log_spin_win()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.spin_hari_ini is not null and old.spin_hari_ini is not null
     and new.spin_hari_ini < old.spin_hari_ini
     and coalesce(new.saldo, 0) > coalesce(old.saldo, 0) then
    insert into public.spin_wins (user_id, amount) values (new.id, (new.saldo - old.saldo)::integer);
  end if;
  return new;
end $$;

drop trigger if exists pengguna_log_spin_win on public.pengguna;
create trigger pengguna_log_spin_win after update of spin_hari_ini, saldo on public.pengguna
  for each row execute function public.log_spin_win();

-- ---------- 4. REALTIME (chat tiket langsung muncul) ----------
do $$
begin
  begin alter publication supabase_realtime add table public.support_messages; exception when others then null; end;
  begin alter publication supabase_realtime add table public.support_tickets; exception when others then null; end;
end $$;
