alter table public.profiles
  add column if not exists advanced_customization jsonb not null default '{}'::jsonb;

alter table public.profiles
  add constraint profiles_advanced_customization_object_check
  check (
    jsonb_typeof(advanced_customization) = 'object'
    and octet_length(advanced_customization::text) <= 12000
  );

create or replace function private.vxl_phase2_restore_advanced_customization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.change_type = 'draft_restored'
    and jsonb_typeof(new.snapshot_json -> 'profile' -> 'advanced_customization') = 'object'
  then
    update public.profiles
      set advanced_customization = new.snapshot_json -> 'profile' -> 'advanced_customization',
          updated_at = now()
      where id = new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists vxl_phase2_restore_advanced_customization on public.profile_revisions;
create trigger vxl_phase2_restore_advanced_customization
after insert on public.profile_revisions
for each row execute function private.vxl_phase2_restore_advanced_customization();
