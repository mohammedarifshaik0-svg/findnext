create index if not exists activation_codes_intended_profile_idx
  on public.activation_codes(intended_profile_id);
create index if not exists activation_codes_redeemed_by_idx
  on public.activation_codes(redeemed_by);
