create index if not exists profile_revisions_changed_by_idx
  on public.profile_revisions(changed_by);

create index if not exists resume_extractions_resume_id_idx
  on public.resume_extractions(resume_id);
