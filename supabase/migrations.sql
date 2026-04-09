-- ============================================================
-- Competition Feature - Supabase Database Schema
-- Run this in the Supabase SQL editor to set up the database
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Competitions
create table if not exists public.competitions (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  admin_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'active' check (status in ('active', 'finished', 'draft')) not null,
  settings jsonb default '{}' not null,
  invite_code text unique,
  created_at timestamptz default now() not null
);

-- Auto-generate invite code on insert
create or replace function public.generate_invite_code()
returns trigger as $$
begin
  new.invite_code := upper(substring(md5(random()::text) from 1 for 8));
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_invite_code on public.competitions;
create trigger set_invite_code
  before insert on public.competitions
  for each row
  when (new.invite_code is null)
  execute procedure public.generate_invite_code();

-- Competition members
create table if not exists public.competition_members (
  id uuid default uuid_generate_v4() primary key,
  competition_id uuid references public.competitions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')) not null,
  total_points integer default 0 not null,
  joined_at timestamptz default now() not null,
  unique(competition_id, user_id)
);

-- Game days
create table if not exists public.game_days (
  id uuid default uuid_generate_v4() primary key,
  competition_id uuid references public.competitions(id) on delete cascade not null,
  scheduled_date date not null,
  game_name text not null,
  base_points integer default 10 not null,
  multiplier numeric(4,2) default 1.0 not null,
  bonus_config jsonb default '{}' not null,
  status text default 'upcoming' check (status in ('upcoming', 'open', 'closed', 'validated')) not null,
  created_at timestamptz default now() not null
);

-- Game results
create table if not exists public.game_results (
  id uuid default uuid_generate_v4() primary key,
  game_day_id uuid references public.game_days(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  claimed_place integer,
  claimed_points integer,
  validated_points integer,
  status text default 'pending' check (status in ('pending', 'validated', 'rejected')) not null,
  created_at timestamptz default now() not null,
  unique(game_day_id, player_id)
);

-- Notifications
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('join_request', 'join_accepted', 'join_rejected', 'result_validated', 'game_day_upcoming')) not null,
  data jsonb default '{}' not null,
  read boolean default false not null,
  created_at timestamptz default now() not null
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Recalculate total_points for a member after result validation
create or replace function public.update_member_points(p_competition_id uuid, p_user_id uuid)
returns void as $$
declare
  v_total integer;
begin
  select coalesce(sum(gr.validated_points), 0)
  into v_total
  from public.game_results gr
  join public.game_days gd on gd.id = gr.game_day_id
  where gd.competition_id = p_competition_id
    and gr.player_id = p_user_id
    and gr.status = 'validated';

  update public.competition_members
  set total_points = v_total
  where competition_id = p_competition_id
    and user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- Trigger to auto-update points after result validation
create or replace function public.handle_result_validated()
returns trigger as $$
declare
  v_competition_id uuid;
begin
  select gd.competition_id into v_competition_id
  from public.game_days gd
  where gd.id = new.game_day_id;

  if new.status = 'validated' and (old.status is null or old.status <> 'validated') then
    perform public.update_member_points(v_competition_id, new.player_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_result_validated on public.game_results;
create trigger on_result_validated
  after insert or update of status on public.game_results
  for each row execute procedure public.handle_result_validated();

-- Trigger to send notification when a join request is made
create or replace function public.handle_join_request()
returns trigger as $$
declare
  v_admin_id uuid;
  v_competition_name text;
begin
  if new.status = 'pending' then
    select c.admin_id, c.name into v_admin_id, v_competition_name
    from public.competitions c
    where c.id = new.competition_id;

    insert into public.notifications (user_id, type, data)
    values (
      v_admin_id,
      'join_request',
      jsonb_build_object(
        'competition_id', new.competition_id,
        'competition_name', v_competition_name,
        'member_id', new.id,
        'user_id', new.user_id
      )
    );
  end if;

  if new.status = 'accepted' and (old.status is null or old.status <> 'accepted') then
    insert into public.notifications (user_id, type, data)
    values (
      new.user_id,
      'join_accepted',
      jsonb_build_object(
        'competition_id', new.competition_id
      )
    );
  end if;

  if new.status = 'rejected' and (old.status is null or old.status <> 'rejected') then
    insert into public.notifications (user_id, type, data)
    values (
      new.user_id,
      'join_rejected',
      jsonb_build_object(
        'competition_id', new.competition_id
      )
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_join_request on public.competition_members;
create trigger on_join_request
  after insert or update of status on public.competition_members
  for each row execute procedure public.handle_join_request();

-- Trigger to send notification when a result is validated
create or replace function public.handle_result_notification()
returns trigger as $$
declare
  v_competition_id uuid;
begin
  if new.status = 'validated' and (old.status is null or old.status <> 'validated') then
    select gd.competition_id into v_competition_id
    from public.game_days gd
    where gd.id = new.game_day_id;

    insert into public.notifications (user_id, type, data)
    values (
      new.player_id,
      'result_validated',
      jsonb_build_object(
        'competition_id', v_competition_id,
        'game_day_id', new.game_day_id,
        'validated_points', new.validated_points
      )
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_result_notification on public.game_results;
create trigger on_result_notification
  after insert or update of status on public.game_results
  for each row execute procedure public.handle_result_notification();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_members enable row level security;
alter table public.game_days enable row level security;
alter table public.game_results enable row level security;
alter table public.notifications enable row level security;

-- profiles: anyone can read, only own user can update
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);

-- competitions: anyone can read, authenticated users can create, only admin can update/delete
create policy "competitions_select" on public.competitions for select using (true);
create policy "competitions_insert" on public.competitions for insert with check (auth.uid() = admin_id);
create policy "competitions_update" on public.competitions for update using (auth.uid() = admin_id);
create policy "competitions_delete" on public.competitions for delete using (auth.uid() = admin_id);

-- competition_members: own row or admin can read (no self-reference to avoid infinite recursion)
create policy "members_select" on public.competition_members for select
  using (
    auth.uid() = user_id
    or auth.uid() = (select admin_id from public.competitions where id = competition_id)
  );
create policy "members_insert" on public.competition_members for insert
  with check (auth.uid() = user_id);
create policy "members_update" on public.competition_members for update
  using (auth.uid() = (select admin_id from public.competitions where id = competition_id));

-- game_days: members and admin can read, only admin can write
create policy "game_days_select" on public.game_days for select
  using (
    auth.uid() = (select admin_id from public.competitions where id = competition_id)
    or exists (
      select 1 from public.competition_members
      where competition_id = game_days.competition_id
        and user_id = auth.uid()
        and status = 'accepted'
    )
  );
create policy "game_days_insert" on public.game_days for insert
  with check (auth.uid() = (select admin_id from public.competitions where id = competition_id));
create policy "game_days_update" on public.game_days for update
  using (auth.uid() = (select admin_id from public.competitions where id = competition_id));
create policy "game_days_delete" on public.game_days for delete
  using (auth.uid() = (select admin_id from public.competitions where id = competition_id));

-- game_results: player and admin can read, player can insert/update own claim (non-validated fields only), admin can validate
create policy "results_select" on public.game_results for select
  using (
    auth.uid() = player_id
    or auth.uid() = (
      select c.admin_id from public.competitions c
      join public.game_days gd on gd.competition_id = c.id
      where gd.id = game_day_id
    )
  );
create policy "results_insert" on public.game_results for insert
  with check (auth.uid() = player_id);
create policy "results_update" on public.game_results for update
  using (auth.uid() = player_id or auth.uid() = (
    select c.admin_id from public.competitions c
    join public.game_days gd on gd.competition_id = c.id
    where gd.id = game_day_id
  ));

-- notifications: users can only read/update their own
create policy "notifications_select" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_insert" on public.notifications for insert with check (true);

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for leaderboard and notifications
alter publication supabase_realtime add table public.competition_members;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.game_results;
