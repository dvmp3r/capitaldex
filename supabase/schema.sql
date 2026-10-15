-- CapitalDex · esquema de Supabase (fase 2: cuentas, guardado en la nube y ranking)
-- Pegar entero en el editor SQL de Supabase y ejecutar.

-- Perfiles: nombre de usuario público, uno por cuenta.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);

-- Partidas: una por cuenta. `data` es la partida exportada (mismo formato que el archivo).
create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  capital double precision not null default 0,
  total_earned double precision not null default 0,
  companies integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

-- Cualquiera puede leer perfiles (para el ranking); solo el dueño escribe el suyo.
create policy "perfiles visibles" on public.profiles for select using (true);
create policy "perfil propio insert" on public.profiles for insert with check (auth.uid() = id);
create policy "perfil propio update" on public.profiles for update using (auth.uid() = id);

-- Solo el dueño lee y escribe su partida.
create policy "partida propia select" on public.saves for select using (auth.uid() = user_id);
create policy "partida propia insert" on public.saves for insert with check (auth.uid() = user_id);
create policy "partida propia update" on public.saves for update using (auth.uid() = user_id);

-- Ranking público: solo nombre y cifras, nunca la partida completa.
create or replace view public.leaderboard as
  select p.username, s.capital, s.total_earned, s.companies, s.updated_at
  from public.saves s join public.profiles p on p.id = s.user_id
  order by s.total_earned desc
  limit 100;
grant select on public.leaderboard to anon, authenticated;

-- El perfil se crea solo al registrarse (el nombre llega en los metadatos del usuario).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data->>'username');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();
