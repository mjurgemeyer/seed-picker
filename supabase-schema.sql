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
  season_label    text not null default '2026 NCAA Tournament'
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
-- SEED TEAMS (2026 NCAA Tournament bracket)
-- ============================================================
insert into teams (seed, name, region) values
  (1,'Duke','East'),(1,'Arizona','West'),(1,'Florida','South'),(1,'Michigan','Midwest'),
  (2,'UConn','East'),(2,'Purdue','Midwest'),(2,'Houston','South'),(2,'Iowa State','West'),
  (3,'Illinois','East'),(3,'Gonzaga','West'),(3,'Michigan State','Midwest'),(3,'Virginia','South'),
  (4,'Kansas','East'),(4,'Arkansas','South'),(4,'Nebraska','Midwest'),(4,'Alabama','West'),
  (5,'St. John''s','East'),(5,'Wisconsin','Midwest'),(5,'Vanderbilt','South'),(5,'Texas Tech','West'),
  (6,'Louisville','West'),(6,'BYU','Midwest'),(6,'North Carolina','South'),(6,'Tennessee','East'),
  (7,'UCLA','West'),(7,'Miami (FL)','South'),(7,'Saint Mary''s','Midwest'),(7,'Kentucky','East'),
  (8,'Ohio State','Midwest'),(8,'Villanova','West'),(8,'Clemson','East'),(8,'Georgia','South'),
  (9,'TCU','Midwest'),(9,'Utah State','West'),(9,'Iowa','East'),(9,'Saint Louis','South'),
  (10,'UCF','East'),(10,'Missouri','Midwest'),(10,'Texas A&M','South'),(10,'Santa Clara','West'),
  (11,'South Florida','East'),(11,'VCU','South'),(11,'Texas','Midwest'),(11,'Miami (OH) / SMU','West'),
  (12,'Northern Iowa','Midwest'),(12,'High Point','South'),(12,'McNeese','West'),(12,'Akron','East'),
  (13,'California Baptist','West'),(13,'Hawaii','South'),(13,'Troy','East'),(13,'Hofstra','Midwest'),
  (14,'North Dakota State','West'),(14,'Kennesaw State','South'),(14,'Penn','East'),(14,'Wright State','Midwest'),
  (15,'Furman','South'),(15,'Queens','West'),(15,'Idaho','Midwest'),(15,'Tennessee State','East'),
  (16,'Siena','East'),(16,'Long Island','West'),(16,'Howard','South'),(16,'Prairie View A&M / Lehigh','Midwest')
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
