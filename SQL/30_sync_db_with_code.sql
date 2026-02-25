-- =====================================================
-- INSTADETOX - DB SYNC WITH CODE (SSOT)
-- Fecha: 2026-02-25
-- Objetivo: alinear base real con el contrato que usa el codigo
-- Sin insertar datos demo/mocks.
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1) Feed contract: vista + rendimiento keyset cursor
-- -----------------------------------------------------

alter table public.posts
  add column if not exists video_cover_url text,
  add column if not exists mentions text[] not null default '{}'::text[];

drop view if exists public.feed_posts;

create view public.feed_posts as
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
  pr.avatar_url,
  p.video_cover_url,
  p.mentions
from public.posts p
join public.profiles pr on pr.id = p.user_id
where p.is_published = true;

-- Keyset pagination del feed usa order by created_at desc, id desc
create index if not exists idx_posts_created_id_desc
  on public.posts (created_at desc, id desc);

-- -----------------------------------------------------
-- 2) Mensajeria: fix RLS recursion en participants
-- -----------------------------------------------------

-- Politicas legacy pueden tener otros nombres. Para evitar recursion 42P17,
-- eliminamos TODAS las policies actuales de participants/messages y recreamos
-- un set minimo, estable e idempotente.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversation_participants'
  loop
    execute format(
      'drop policy if exists %I on public.conversation_participants',
      p.policyname
    );
  end loop;

  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
  loop
    execute format(
      'drop policy if exists %I on public.messages',
      p.policyname
    );
  end loop;
end $$;

alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- SELECT: el usuario puede verse a si mismo; el creador de conversacion puede ver participantes.
create policy "participants_select_participant" on public.conversation_participants
for select using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_participants.conversation_id
      and c.created_by = auth.uid()
  )
);

-- INSERT: el usuario puede agregarse a si mismo; el creador puede agregar participantes.
create policy "participants_insert_conversation_member" on public.conversation_participants
for insert with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_participants.conversation_id
      and c.created_by = auth.uid()
  )
);

-- UPDATE/DELETE solo para el creador de la conversacion
create policy "participants_update_delete_creator_only" on public.conversation_participants
for all using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_participants.conversation_id
      and c.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_participants.conversation_id
      and c.created_by = auth.uid()
  )
);

create policy "messages_select_participant" on public.messages
for select using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

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

-- UPDATE/DELETE solo emisor original
create policy "messages_update_delete_sender_only" on public.messages
for all using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

commit;

-- -----------------------------------------------------
-- 3) Verificacion minima post-sync
-- -----------------------------------------------------

-- A) Feed view disponible
select id, user_id, caption, likes_count, comments_count, created_at
from public.feed_posts
order by created_at desc, id desc
limit 5;

-- B) RLS participants/messages: no deberia devolver recursion 42P17
select count(*) as participants_count from public.conversation_participants;
select count(*) as messages_count from public.messages;
