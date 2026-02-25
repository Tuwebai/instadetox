-- =====================================================
-- INSTADETOX - VALIDATE POST MENTIONS (BACKEND)
-- Fecha: 2026-02-25
-- Objetivo: impedir guardar usernames inexistentes en posts.mentions
-- =====================================================

begin;

create or replace function public.validate_post_mentions()
returns trigger
language plpgsql
as $$
declare
  invalid_mentions text[];
begin
  if new.mentions is null or coalesce(array_length(new.mentions, 1), 0) = 0 then
    return new;
  end if;

  -- Normaliza y quita duplicados
  new.mentions := (
    select coalesce(array_agg(distinct lower(trim(m))), '{}'::text[])
    from unnest(new.mentions) as m
    where trim(m) <> ''
  );

  if coalesce(array_length(new.mentions, 1), 0) = 0 then
    return new;
  end if;

  select coalesce(array_agg(m), '{}'::text[])
  into invalid_mentions
  from unnest(new.mentions) as m
  where not exists (
    select 1
    from public.profiles p
    where lower(p.username) = lower(m)
  );

  if coalesce(array_length(invalid_mentions, 1), 0) > 0 then
    raise exception 'Menciones invalidas: %', array_to_string(invalid_mentions, ', ')
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_posts_validate_mentions on public.posts;
create trigger trg_posts_validate_mentions
before insert or update of mentions
on public.posts
for each row
execute function public.validate_post_mentions();

commit;

-- Verificacion minima
select tgname
from pg_trigger
where tgrelid = 'public.posts'::regclass
  and not tgisinternal
  and tgname = 'trg_posts_validate_mentions';
