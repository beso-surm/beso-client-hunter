-- ===========================================================================
-- Beso Client Hunter — seed data
-- Run AFTER schema.sql. Provides the settings singleton + a couple of sample
-- leads so the dashboard is not empty on first run.
-- ===========================================================================

-- Settings singleton (fixed id so the app can always upsert it).
insert into settings (
  id, my_name, service_description, preferred_cities, preferred_categories,
  default_price_min_gel, default_price_max_gel, tone, default_language,
  signature, contact_phone, contact_email
) values (
  '00000000-0000-0000-0000-000000000001',
  'Beso Surmava',
  'I design and build fast, modern websites for hotels, cottages, cafes, restaurants, car washes, beauty salons and tourism businesses in Georgia. Mobile-friendly, multilingual (EN/KA/RU), with booking and contact forms.',
  '["Kutaisi","Batumi","Tbilisi"]'::jsonb,
  '["Hotel","Guesthouse","Cottage / Villa","Cafe","Restaurant"]'::jsonb,
  800, 2500, 'friendly', 'ka',
  'Beso Surmava — Web Developer',
  null,
  'besosurm12@gmail.com'
)
on conflict (id) do nothing;

-- Sample leads (clearly marked as demo data; no invented contact details).
insert into leads (business_name, category, city, instagram_url, source, status, notes)
values
  ('Sample Guesthouse Imereti', 'Guesthouse', 'Kutaisi',
   'https://instagram.com/example_guesthouse', 'demo', 'new',
   'Demo lead — replace with a real prospect.'),
  ('Sample Seaside Cafe', 'Cafe', 'Batumi',
   'https://instagram.com/example_cafe', 'demo', 'new',
   'Demo lead — replace with a real prospect.')
on conflict do nothing;
