-- Run once in the Supabase SQL editor. Originals remain private.
begin;
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;
create policy "admins see their own membership" on public.admin_users for select to authenticated using(user_id=auth.uid());
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.admin_users where user_id=(select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 1 and 160),
  category text not null check(category in ('문학','과학','수학','음악','미술','발레','그림책','공예·디자인','사회·기획','앱 기획')),
  year integer check(year between 1900 and 2100),
  source_id text unique,
  content_text text not null default '' check(length(content_text)<=50000),
  provenance jsonb check(provenance is null or (jsonb_typeof(provenance)='object' and provenance - array['category','date','date_basis','creator_display','evidence_level','authorship_note'] = '{}'::jsonb)),
  import_complete boolean not null default true,
  description text not null default '' check(length(description)<=10000),
  poem text not null default '' check(length(poem)<=10000),
  is_public boolean not null default false,
  featured_order integer check(featured_order>=0),
  motion_enabled boolean not null default true,
  youtube_id text check(youtube_id is null or youtube_id ~ '^[a-zA-Z0-9_-]{11}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.work_reviews (
  work_id uuid primary key references public.works(id) on delete cascade,
  metadata jsonb not null
);
alter table public.work_reviews enable row level security;
create policy "admin review records" on public.work_reviews for all to authenticated using(public.is_admin()) with check(public.is_admin());
revoke all on public.work_reviews from anon;
grant select,insert,update,delete on public.work_reviews to authenticated;
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  work_id uuid references public.works(id) on delete cascade,
  kind text not null check(kind in ('image','audio')),
  path text unique not null check(path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|mp3|wav|ogg|m4a)$'),
  original_name text not null check(length(original_name) between 1 and 255),
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4')),
  approved boolean not null default false,
  rights_confirmed boolean not null default false,
  sort_order integer not null default 0 check(sort_order>=0),
  check(not approved or rights_confirmed),
  created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  id integer primary key check(id=1),
  background_id uuid references public.media(id) on delete set null,
  theme_id uuid references public.media(id) on delete set null,
  effects_enabled boolean not null default true,
  motion_intensity text not null default 'gentle' check(motion_intensity in ('off','gentle','full'))
);
insert into public.site_settings(id) values(1) on conflict do nothing;
alter table public.works enable row level security;
alter table public.media enable row level security;
alter table public.site_settings enable row level security;
create policy "published works" on public.works for select to anon,authenticated using(is_public or public.is_admin());
create policy "admin works" on public.works for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "approved media" on public.media for select to anon,authenticated using(
  public.is_admin() or (approved and rights_confirmed and (
    (work_id is not null and exists(select 1 from public.works w where w.id=work_id and w.is_public)) or
    (work_id is null and exists(select 1 from public.site_settings s where s.background_id=media.id or s.theme_id=media.id))
  ))
);
create policy "admin media" on public.media for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "public display settings" on public.site_settings for select to anon,authenticated using(true);
create policy "admin settings" on public.site_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.works,public.media,public.site_settings to anon;
grant select on public.admin_users to authenticated;
grant select,insert,update,delete on public.works,public.media to authenticated;
grant select,update on public.site_settings to authenticated;
create index on public.media(work_id);
create index on public.works(is_public,year desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('originals','originals',false,52428800,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- No anonymous Storage SELECT policy: signed URLs are minted only for administrators or inside the server media route.
create policy "admin original uploads" on storage.objects for insert to authenticated
with check(bucket_id='originals' and public.is_admin() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "admin original reads" on storage.objects for select to authenticated using(bucket_id='originals' and public.is_admin());
create policy "admin original deletion" on storage.objects for delete to authenticated using(bucket_id='originals' and public.is_admin());
commit;

-- After creating a user manually in Authentication > Users, run separately:
-- insert into public.admin_users(user_id) values ('YOUR-USER-UUID');
-- Never grant clients INSERT/UPDATE on admin_users.
