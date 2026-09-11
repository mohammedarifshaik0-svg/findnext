-- Profile drafts are written only through authenticated server routes. Removing
-- direct Data API writes prevents users from changing trial or publication state.
revoke insert, update, delete, truncate, references, trigger
  on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- These tables are server-owned or intentionally read-only to signed-in users.
revoke insert, update, delete, truncate, references, trigger
  on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.plan_requests from anon;
