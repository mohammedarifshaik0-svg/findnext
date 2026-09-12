-- Keep the database allow-list in sync with every curated template finish.
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
    'graphite', 'sepia', 'forest'
  ));
