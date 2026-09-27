-- Phase 2 templates introduce their own curated text finishes. Keep the
-- database allow-list aligned with the editor so valid draft saves cannot be
-- rejected after a user selects a Phase 2 template.
alter table public.profiles drop constraint if exists profiles_text_tone_check;
alter table public.profiles add constraint profiles_text_tone_check
  check (text_tone in (
    'ivory', 'pearl', 'parchment',
    'polar', 'lilac', 'glacier',
    'chalk', 'mist', 'sand',
    'ink', 'carbon', 'blueprint',
    'silver', 'platinum', 'charcoal',
    'vellum', 'blueblack',
    'frost', 'ice', 'smoke',
    'graphite', 'sepia', 'forest',
    'console', 'phosphor',
    'starlight', 'lunar', 'rose-light',
    'umber',
    'poster-ink', 'midnight-ink', 'plum-ink'
  ));
