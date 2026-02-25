-- =====================================================
-- INSTADETOX - SUPABASE SETUP (DESDE CERO)
-- Fecha: 2026-02-25
-- Ejecutar completo en SQL Editor de Supabase
-- =====================================================

-- -----------------------------------------------------
-- 1) Extensiones
-- -----------------------------------------------------
create extension if not exists pgcrypto;

-- -----------------------------------------------------
-- 2) Tipos
-- -----------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_type_enum') then
    create type public.post_type_enum as enum ('reflection', 'goal', 'milestone', 'quote', 'photo', 'video');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_type_enum') then
    create type public.notification_type_enum as enum ('like', 'comment', 'follow', 'message', 'system', 'goal_reminder');
  end if;

  if not exists (select 1 from pg_type where typname = 'goal_status_enum') then
    create type public.goal_status_enum as enum ('active', 'paused', 'completed', 'archived');
  end if;
end $$;

-- -----------------------------------------------------
-- 3) Tablas base (auth.users es fuente de identidad)
-- -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  full_name text,
  avatar_url text,
  bio text,
  is_private boolean not null default false,
  daily_limit_minutes integer not null default 90,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.post_type_enum not null default 'reflection',
  title text,
  caption text not null,
  media_url text,
  is_published boolean not null default true,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.post_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  muted_until timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  media_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.notification_type_enum not null,
  title text not null,
  body text,
  post_id uuid references public.posts(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.detox_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  target_minutes integer,
  current_minutes integer not null default 0,
  status public.goal_status_enum not null default 'active',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- 4) Índices
-- -----------------------------------------------------
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_posts_user_created on public.posts(user_id, created_at desc);
create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_post_comments_post_created on public.post_comments(post_id, created_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at desc);
create index if not exists idx_usage_events_user_created on public.usage_events(user_id, created_at desc);

-- -----------------------------------------------------
-- 5) Helpers y triggers
-- -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    left(regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g'), 30),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.apply_post_counts()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'post_likes' then
    if tg_op = 'INSERT' then
      update public.posts set likes_count = likes_count + 1 where id = new.post_id;
      return new;
    elsif tg_op = 'DELETE' then
      update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
      return old;
    end if;
  elsif tg_table_name = 'post_comments' then
    if tg_op = 'INSERT' then
      update public.posts set comments_count = comments_count + 1 where id = new.post_id;
      return new;
    elsif tg_op = 'DELETE' then
      update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
      return old;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_post_comments_updated_at on public.post_comments;
create trigger trg_post_comments_updated_at before update on public.post_comments
for each row execute function public.set_updated_at();

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at before update on public.messages
for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists trg_detox_goals_updated_at on public.detox_goals;
create trigger trg_detox_goals_updated_at before update on public.detox_goals
for each row execute function public.set_updated_at();

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop trigger if exists trg_post_likes_counts on public.post_likes;
create trigger trg_post_likes_counts
after insert or delete on public.post_likes
for each row execute function public.apply_post_counts();

drop trigger if exists trg_post_comments_counts on public.post_comments;
create trigger trg_post_comments_counts
after insert or delete on public.post_comments
for each row execute function public.apply_post_counts();

-- -----------------------------------------------------
-- 6) RLS + políticas
-- -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.saved_posts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.notifications enable row level security;
alter table public.detox_goals enable row level security;
alter table public.usage_events enable row level security;

-- profiles
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
for select using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

-- follows
drop policy if exists "follows_select_public" on public.follows;
create policy "follows_select_public" on public.follows
for select using (true);

drop policy if exists "follows_insert_self" on public.follows;
create policy "follows_insert_self" on public.follows
for insert with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self" on public.follows
for delete using (auth.uid() = follower_id);

-- posts
drop policy if exists "posts_select_published" on public.posts;
create policy "posts_select_published" on public.posts
for select using (is_published = true or auth.uid() = user_id);

drop policy if exists "posts_insert_self" on public.posts;
create policy "posts_insert_self" on public.posts
for insert with check (auth.uid() = user_id);

drop policy if exists "posts_update_self" on public.posts;
create policy "posts_update_self" on public.posts
for update using (auth.uid() = user_id);

drop policy if exists "posts_delete_self" on public.posts;
create policy "posts_delete_self" on public.posts
for delete using (auth.uid() = user_id);

-- likes
drop policy if exists "likes_select_public" on public.post_likes;
create policy "likes_select_public" on public.post_likes
for select using (true);

drop policy if exists "likes_insert_self" on public.post_likes;
create policy "likes_insert_self" on public.post_likes
for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_self" on public.post_likes;
create policy "likes_delete_self" on public.post_likes
for delete using (auth.uid() = user_id);

-- comments
drop policy if exists "comments_select_public" on public.post_comments;
create policy "comments_select_public" on public.post_comments
for select using (true);

drop policy if exists "comments_insert_self" on public.post_comments;
create policy "comments_insert_self" on public.post_comments
for insert with check (auth.uid() = user_id);

drop policy if exists "comments_update_self" on public.post_comments;
create policy "comments_update_self" on public.post_comments
for update using (auth.uid() = user_id);

drop policy if exists "comments_delete_self" on public.post_comments;
create policy "comments_delete_self" on public.post_comments
for delete using (auth.uid() = user_id);

-- saved posts
drop policy if exists "saved_select_self" on public.saved_posts;
create policy "saved_select_self" on public.saved_posts
for select using (auth.uid() = user_id);

drop policy if exists "saved_insert_self" on public.saved_posts;
create policy "saved_insert_self" on public.saved_posts
for insert with check (auth.uid() = user_id);

drop policy if exists "saved_delete_self" on public.saved_posts;
create policy "saved_delete_self" on public.saved_posts
for delete using (auth.uid() = user_id);

-- conversations
drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant" on public.conversations
for select using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversations.id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "conversations_insert_authenticated" on public.conversations;
create policy "conversations_insert_authenticated" on public.conversations
for insert with check (auth.uid() = created_by);

drop policy if exists "conversations_update_creator" on public.conversations;
create policy "conversations_update_creator" on public.conversations
for update using (auth.uid() = created_by);

-- conversation participants
drop policy if exists "participants_select_participant" on public.conversation_participants;
create policy "participants_select_participant" on public.conversation_participants
for select using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "participants_insert_conversation_member" on public.conversation_participants;
create policy "participants_insert_conversation_member" on public.conversation_participants
for insert with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()
  )
);

-- messages
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages
for select using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "messages_insert_sender_participant" on public.messages;
create policy "messages_insert_sender_participant" on public.messages
for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

-- message reads
drop policy if exists "message_reads_select_participant" on public.message_reads;
create policy "message_reads_select_participant" on public.message_reads
for select using (auth.uid() = user_id);

drop policy if exists "message_reads_insert_self" on public.message_reads;
create policy "message_reads_insert_self" on public.message_reads
for insert with check (auth.uid() = user_id);

-- notifications
drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self" on public.notifications
for select using (auth.uid() = user_id);

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self" on public.notifications
for update using (auth.uid() = user_id);

-- detox goals
drop policy if exists "goals_select_self" on public.detox_goals;
create policy "goals_select_self" on public.detox_goals
for select using (auth.uid() = user_id);

drop policy if exists "goals_insert_self" on public.detox_goals;
create policy "goals_insert_self" on public.detox_goals
for insert with check (auth.uid() = user_id);

drop policy if exists "goals_update_self" on public.detox_goals;
create policy "goals_update_self" on public.detox_goals
for update using (auth.uid() = user_id);

drop policy if exists "goals_delete_self" on public.detox_goals;
create policy "goals_delete_self" on public.detox_goals
for delete using (auth.uid() = user_id);

-- usage events
drop policy if exists "usage_events_select_self" on public.usage_events;
create policy "usage_events_select_self" on public.usage_events
for select using (auth.uid() = user_id);

drop policy if exists "usage_events_insert_self" on public.usage_events;
create policy "usage_events_insert_self" on public.usage_events
for insert with check (auth.uid() = user_id);

-- -----------------------------------------------------
-- 7) Vista útil para feed (opcional)
-- -----------------------------------------------------
create or replace view public.feed_posts as
select
  p.id,
  p.user_id,
  p.type,
  p.title,
  p.caption,
  p.media_url,
  p.likes_count,
  p.comments_count,
  p.created_at,
  pr.username,
  pr.full_name,
  pr.avatar_url
from public.posts p
join public.profiles pr on pr.id = p.user_id
where p.is_published = true;

-- -----------------------------------------------------
-- 8) Verificación rápida
-- -----------------------------------------------------
-- select * from public.profiles limit 5;
-- select * from public.feed_posts order by created_at desc limit 20;

-- FIN
