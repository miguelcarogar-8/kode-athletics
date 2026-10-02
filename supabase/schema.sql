-- WODs y marcas por usuario. Ejecutar una vez en el editor SQL de Supabase.
-- El login ya usa Auth; estas tablas guardan solo lo de cada cuenta.

create table if not exists public.wods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type text not null check (type in ('for_time', 'amrap', 'emom')),
  time_cap_sec integer check (time_cap_sec is null or (time_cap_sec between 60 and 10800)),
  rounds integer not null default 1 check (rounds between 1 and 30),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.wod_exercises (
  id bigint generated always as identity primary key,
  wod_id uuid not null references public.wods (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null check (position >= 0),
  round integer not null default 1 check (round between 1 and 30),
  name text not null check (char_length(name) between 1 and 80),
  reps text not null check (char_length(reps) between 1 and 24)
);

create table if not exists public.wod_scores (
  id bigint generated always as identity primary key,
  wod_id uuid not null references public.wods (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  performed_at date not null,
  elapsed_sec integer check (elapsed_sec is null or (elapsed_sec between 1 and 21600)),
  rounds integer check (rounds is null or (rounds between 0 and 999)),
  reps integer check (reps is null or (reps between 0 and 9999)),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists wods_user_created_idx on public.wods (user_id, created_at desc);
create index if not exists wod_exercises_wod_idx on public.wod_exercises (wod_id, position);
create index if not exists wod_scores_wod_idx on public.wod_scores (wod_id, performed_at, id);

alter table public.wods enable row level security;
alter table public.wod_exercises enable row level security;
alter table public.wod_scores enable row level security;

drop policy if exists wods_own on public.wods;
create policy wods_own on public.wods
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists wod_exercises_own on public.wod_exercises;
create policy wod_exercises_own on public.wod_exercises
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists wod_scores_own on public.wod_scores;
create policy wod_scores_own on public.wod_scores
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.wods to authenticated;
grant select, insert, update, delete on public.wod_exercises to authenticated;
grant select, insert, update, delete on public.wod_scores to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.wods add column if not exists rounds integer not null default 1;
alter table public.wods drop constraint if exists wods_rounds_check;
alter table public.wods add constraint wods_rounds_check check (rounds between 1 and 30);

alter table public.wod_exercises add column if not exists round integer not null default 1;
alter table public.wod_exercises drop constraint if exists wod_exercises_round_check;
alter table public.wod_exercises add constraint wod_exercises_round_check check (round between 1 and 30);

alter table public.wod_exercises add column if not exists weight_kg numeric(5, 1);
alter table public.wod_exercises drop constraint if exists wod_exercises_weight_kg_check;
alter table public.wod_exercises add constraint wod_exercises_weight_kg_check
  check (weight_kg is null or (weight_kg >= 1 and weight_kg <= 300));

alter table public.wods add column if not exists level_targets jsonb;
