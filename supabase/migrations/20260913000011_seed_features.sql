-- Structured feature taxonomy. Real reference data, not dev-only
-- seed data — every environment needs these rows to exist.
insert into features (name, category, slug) values
  ('Hardwood Floors', 'interior', 'hardwood-floors'),
  ('Fireplace', 'interior', 'fireplace'),
  ('Updated Kitchen', 'interior', 'updated-kitchen'),
  ('Finished Basement', 'interior', 'finished-basement'),
  ('Walk-In Closet', 'interior', 'walk-in-closet'),
  ('Laundry Room', 'interior', 'laundry-room'),
  ('Garage', 'exterior', 'garage'),
  ('Driveway', 'exterior', 'driveway'),
  ('Backyard', 'exterior', 'backyard'),
  ('Patio', 'exterior', 'patio'),
  ('Deck', 'exterior', 'deck'),
  ('Pool', 'exterior', 'pool'),
  ('Central Air', 'other', 'central-air'),
  ('Solar', 'other', 'solar'),
  ('Smart Home Features', 'other', 'smart-home-features'),
  ('Accessibility Features', 'other', 'accessibility-features')
on conflict (slug) do nothing;
