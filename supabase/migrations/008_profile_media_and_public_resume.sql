alter table public.profiles
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own profile media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users read own profile media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users update own profile media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete own profile media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "live profile photos are public"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'profile-media'
    and exists (
      select 1
      from public.profiles p
      where p.photo_path = name
        and p.is_public
        and (
          p.trial_ends_at > now()
          or exists (
            select 1 from public.subscriptions s
            where s.profile_id = p.id
              and s.status = 'active'
              and s.plan in ('live', 'flex', 'care')
              and (s.period_ends_at is null or s.period_ends_at > now())
          )
        )
    )
  );

create policy "live primary resumes are public"
  on public.resumes for select to anon, authenticated
  using (
    is_primary
    and exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and p.is_public
        and (
          p.trial_ends_at > now()
          or exists (
            select 1 from public.subscriptions s
            where s.profile_id = p.id
              and s.status = 'active'
              and s.plan in ('live', 'flex', 'care')
              and (s.period_ends_at is null or s.period_ends_at > now())
          )
        )
    )
  );

grant select on public.resumes to anon;

create policy "live resume files are public"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'resumes'
    and exists (
      select 1
      from public.resumes r
      join public.profiles p on p.id = r.profile_id
      where r.storage_path = name
        and r.is_primary
        and p.is_public
        and (
          p.trial_ends_at > now()
          or exists (
            select 1 from public.subscriptions s
            where s.profile_id = p.id
              and s.status = 'active'
              and s.plan in ('live', 'flex', 'care')
              and (s.period_ends_at is null or s.period_ends_at > now())
          )
        )
    )
  );

drop policy if exists "live profiles are public" on public.profiles;
create policy "live profiles are public" on public.profiles for select to anon, authenticated
using (
  is_public and (
    trial_ends_at > now()
    or exists (
      select 1 from public.subscriptions s
      where s.profile_id = id and s.status = 'active'
        and s.plan in ('live', 'flex', 'care')
        and (s.period_ends_at is null or s.period_ends_at > now())
    )
  )
);

drop policy if exists "live experiences are public" on public.experiences;
create policy "live experiences are public" on public.experiences for select to anon, authenticated
using (exists (
  select 1 from public.profiles p where p.id = profile_id and p.is_public and (
    p.trial_ends_at > now()
    or exists (
      select 1 from public.subscriptions s where s.profile_id = p.id
        and s.status = 'active' and s.plan in ('live', 'flex', 'care')
        and (s.period_ends_at is null or s.period_ends_at > now())
    )
  )
));

drop policy if exists "live education is public" on public.education;
create policy "live education is public" on public.education for select to anon, authenticated
using (exists (
  select 1 from public.profiles p where p.id = profile_id and p.is_public and (
    p.trial_ends_at > now()
    or exists (
      select 1 from public.subscriptions s where s.profile_id = p.id
        and s.status = 'active' and s.plan in ('live', 'flex', 'care')
        and (s.period_ends_at is null or s.period_ends_at > now())
    )
  )
));

drop policy if exists "live profile items are public" on public.profile_items;
create policy "live profile items are public" on public.profile_items for select to anon, authenticated
using (exists (
  select 1 from public.profiles p where p.id = profile_id and p.is_public and (
    p.trial_ends_at > now()
    or exists (
      select 1 from public.subscriptions s where s.profile_id = p.id
        and s.status = 'active' and s.plan in ('live', 'flex', 'care')
        and (s.period_ends_at is null or s.period_ends_at > now())
    )
  )
));
