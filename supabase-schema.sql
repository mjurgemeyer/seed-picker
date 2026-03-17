-- ============================================================
-- BracketBuster — Supabase Schema
-- Run this in your Supabase project: SQL Editor > New Query
-- If you ran a previous version, run the reset block at the
-- bottom first to drop old tables and policies cleanly.
-- ============================================================

-- 1. TOURNAMENT SETTINGS (singleton row, id always = 1)
create table if not exists tournament_settings (
  id              integer primary key default 1,
  starts_at       timestamptz not null default now() + interval '7 days',
  picks_locked    boolean not null default false,
  season_label    text not null default '2025 NCAA Tournament'
);
insert into tournament_settings (id) values (1) on conflict do nothing;

-- 2. TEAMS — one row per team (16 seeds x 4 teams = 64 rows)
create table if not exists teams (
  id          serial primary key,
  seed        integer not null check (seed between 1 and 16),
  name        text not null,
  region      text not null,
  wins        integer not null default 0,
  eliminated  boolean not null default false
);

-- 3. ENTRIES — up to 2 per user
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_index integer not null check (entry_index in (0, 1)),
  entry_name  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, entry_index)
);

-- 4. PICKS — one pick per seed per entry (max 16 per entry)
create table if not exists picks (
  id          serial primary key,
  entry_id    uuid not null references entries(id) on delete cascade,
  seed        integer not null check (seed between 1 and 16),
  team_id     integer not null references teams(id) on delete cascade,
  unique (entry_id, seed)
);

-- 5. USER PROFILES — extends auth.users with display name
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  created_at  timestamptz not null default now()
);

-- Trigger: auto-create profile row when a new user signs up.
-- security definer means the function runs as the DB owner,
-- bypassing RLS entirely — this is the correct pattern for auth triggers.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table tournament_settings enable row level security;
alter table teams               enable row level security;
alter table entries             enable row level security;
alter table picks               enable row level security;
alter table profiles            enable row level security;

-- tournament_settings: public read; open write (admin routes use service role key
-- which bypasses RLS, but we keep policies permissive so local dev works simply)
create policy "Public read settings"    on tournament_settings for select using (true);
create policy "Authenticated write settings" on tournament_settings for update using (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- teams: public read; open write for authenticated (admin gate enforced in API)
create policy "Public read teams"         on teams for select using (true);
create policy "Authenticated write teams" on teams for update using (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- entries: public read; owners write their own
create policy "Anyone can read entries" on entries for select using (true);
create policy "Owner can insert entry"  on entries for insert with check (auth.uid() = user_id);
create policy "Owner can update entry"  on entries for update using (auth.uid() = user_id);
create policy "Owner can delete entry"  on entries for delete using (auth.uid() = user_id);

-- picks: public read; owners write picks for their own entries
create policy "Anyone can read picks"  on picks for select using (true);
create policy "Owner can insert picks" on picks for insert
  with check (entry_id in (select id from entries where user_id = auth.uid()));
create policy "Owner can update picks" on picks for update
  using (entry_id in (select id from entries where user_id = auth.uid()));
create policy "Owner can delete picks" on picks for delete
  using (entry_id in (select id from entries where user_id = auth.uid()));

-- profiles: public read; owner can update their own; insert handled by trigger
-- (trigger runs as security definer so it bypasses RLS — no insert policy needed,
-- but we add one anyway so manual inserts also work)
create policy "Public read profiles"  on profiles for select using (true);
create policy "Allow profile insert"  on profiles for insert with check (true);
create policy "Owner update profile"  on profiles for update using (auth.uid() = id);

-- ============================================================
-- SEED TEAMS (2025 NCAA Tournament bracket)
-- ============================================================
insert into teams (seed, name, region) values
  (1,'Auburn','East'),(1,'Duke','West'),(1,'Florida','South'),(1,'Houston','Midwest'),
  (2,'Alabama','East'),(2,'Michigan St','West'),(2,'St. John''s','South'),(2,'Tennessee','Midwest'),
  (3,'Iowa St','East'),(3,'Kentucky','West'),(3,'Marquette','South'),(3,'Texas Tech','Midwest'),
  (4,'Arizona','East'),(4,'Maryland','West'),(4,'Purdue','South'),(4,'Wisconsin','Midwest'),
  (5,'Clemson','East'),(5,'Memphis','West'),(5,'Michigan','South'),(5,'Oregon','Midwest'),
  (6,'BYU','East'),(6,'Illinois','West'),(6,'Missouri','South'),(6,'Ole Miss','Midwest'),
  (7,'Gonzaga','East'),(7,'Kansas','West'),(7,'St. Mary''s','South'),(7,'UCLA','Midwest'),
  (8,'Connecticut','East'),(8,'Creighton','West'),(8,'Louisville','South'),(8,'Mississippi St','Midwest'),
  (9,'Florida St','East'),(9,'Georgia','West'),(9,'Oklahoma','South'),(9,'Utah St','Midwest'),
  (10,'Arkansas','East'),(10,'Baylor','West'),(10,'New Mexico','South'),(10,'Vanderbilt','Midwest'),
  (11,'Drake','East'),(11,'NC State','West'),(11,'San Diego St','South'),(11,'VCU','Midwest'),
  (12,'Colorado St','East'),(12,'Liberty','West'),(12,'McNeese','South'),(12,'UC San Diego','Midwest'),
  (13,'Akron','East'),(13,'High Point','West'),(13,'Troy','South'),(13,'Yale','Midwest'),
  (14,'Bryant','East'),(14,'Lipscomb','West'),(14,'Montana','South'),(14,'SFPA','Midwest'),
  (15,'American','East'),(15,'Central Ark','West'),(15,'Lehigh','South'),(15,'Wofford','Midwest'),
  (16,'MVSU','East'),(16,'Norfolk St','West'),(16,'SIU Ed','South'),(16,'St. Francis','Midwest')
on conflict do nothing;

-- ============================================================
-- RESET SCRIPT (run this first if re-applying the schema)
-- Paste this block into SQL Editor and run it, THEN run the
-- full schema above in a second query.
-- ============================================================
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists handle_new_user();
-- drop table if exists picks cascade;
-- drop table if exists entries cascade;
-- drop table if exists profiles cascade;
-- drop table if exists teams cascade;
-- drop table if exists tournament_settings cascade;
