alter table public.profiles
  add column if not exists text_tone text not null default 'ivory';

alter table public.profiles drop constraint if exists profiles_text_tone_check;
alter table public.profiles add constraint profiles_text_tone_check
  check (text_tone in ('ivory', 'pearl', 'parchment', 'polar', 'lilac', 'glacier', 'chalk', 'mist', 'sand'));
