-- ============================================================================
-- Public demo content (see docs/architecture.md).
--
-- * Demo rows carry is_demo + demo_dataset + seed_key. Only trusted writers
--   (the service role, or a direct postgres/supabase_admin session with no
--   request JWT, i.e. migrations and the SQL editor) can create, change or
--   delete them. SECURITY DEFINER RPCs called by users still run with the
--   caller's JWT, so they are NOT trusted.
-- * Demo sellers have no auth user. Real sellers still require one.
-- * Nobody — including the service role — can attach inquiries, RSVPs,
--   saves, follows, notifications or activity to demo entities.
-- * A single app_settings switch controls public visibility and starts
--   hidden. Public views and direct table reads both honor it.
-- * Storage objects are tracked in demo_storage_ledger so uploads and
--   deletions can be retried independently of the database rows.
--
-- Errors use SQLSTATE class DM with message DEMO_* for the application:
--   DM001 DEMO_CONTENT              demo entity touched by an untrusted or interaction write
--   DM002 DEMO_STORAGE_NOT_LEDGERED image path not uploaded/ledgered before seeding
--   DM003 DEMO_SEED_KEY_NOT_FOUND   date refresh for an unknown open house
--   DM004 FIXTURE_CROSS_LINKED      cleanup would affect records outside the manifest
--   DM005 FIXTURE_FINGERPRINT       cleanup row no longer matches the manifest
--   DM006 FIXTURE_TABLE_NOT_ALLOWED cleanup manifest names a disallowed table
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['seller_profiles', 'properties', 'open_houses', 'property_images'] loop
    execute format('alter table %I add column is_demo boolean not null default false', t);
    execute format('alter table %I add column demo_dataset text', t);
    execute format('alter table %I add column seed_key text', t);
    execute format(
      'alter table %I add constraint %I check ((is_demo and demo_dataset is not null and seed_key is not null) or (not is_demo and demo_dataset is null and seed_key is null))',
      t, t || '_demo_marker_consistent'
    );
    execute format('create unique index %I on %I (demo_dataset, seed_key) where demo_dataset is not null', t || '_demo_seed_key_idx', t);
    execute format('create index %I on %I (is_demo)', t || '_is_demo_idx', t);
  end loop;
end $$;

-- Attribution shown with a photo (e.g. license credit or "AI-generated
-- illustrative image"). Set by the demo seed; null for seller uploads.
alter table property_images add column credit text check (char_length(credit) <= 300);

alter table seller_profiles alter column user_id drop not null;
alter table seller_profiles add constraint seller_profiles_owner_required check (user_id is not null or is_demo);

-- ---------------------------------------------------------------------------
-- Settings and storage ledger (service-role only)
-- ---------------------------------------------------------------------------
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
revoke all on app_settings from public, anon, authenticated;
grant all on app_settings to service_role;
insert into app_settings (key, value) values ('public_demo_content_visible', 'false'::jsonb);

create table demo_storage_ledger (
  id bigint generated always as identity primary key,
  operation_id uuid not null,
  dataset text not null,
  bucket text not null,
  path text not null,
  sha256 text,
  state text not null check (state in ('uploaded_pending', 'live', 'delete_pending', 'deleted')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);
create index demo_storage_ledger_dataset_state_idx on demo_storage_ledger (dataset, state);
alter table demo_storage_ledger enable row level security;
revoke all on demo_storage_ledger from public, anon, authenticated;
grant all on demo_storage_ledger to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function is_trusted_demo_writer()
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is not null
      or nullif(current_setting('request.jwt.claim.role', true), '') is not null
      then coalesce(auth.role() = 'service_role', false)
    else session_user in ('postgres', 'supabase_admin')
  end
$$;

create function raise_demo_error(p_code text, p_message text, p_table text, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
begin
  raise exception '%', p_message
    using errcode = p_code,
          detail = json_build_object('table', p_table, 'reason', p_reason)::text;
end;
$$;

-- Resolves the demo dataset of an entity (null = real or missing). Runs as
-- the owner so RLS never hides the parent row from the check.
create function demo_dataset_of(p_kind text, p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_id is null then null
    when p_kind in ('seller', 'seller_profile') then (select demo_dataset from seller_profiles where id = p_id)
    when p_kind = 'property' then (select demo_dataset from properties where id = p_id)
    when p_kind = 'open_house' then (select demo_dataset from open_houses where id = p_id)
    when p_kind = 'inquiry' then (
      select coalesce(demo_dataset_of('property', i.property_id), demo_dataset_of('seller', i.seller_id))
      from inquiries i where i.id = p_id
    )
    else null
  end
$$;

create function demo_content_visible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value = 'true'::jsonb from app_settings where key = 'public_demo_content_visible'),
    false
  )
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function protect_demo_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_trusted_demo_writer() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    if new.is_demo or new.demo_dataset is not null or new.seed_key is not null then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'demo rows are system-managed');
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.is_demo or new.is_demo
       or new.demo_dataset is distinct from old.demo_dataset
       or new.seed_key is distinct from old.seed_key then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'demo rows are system-managed');
    end if;
    return new;
  else
    if old.is_demo then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'demo rows are system-managed');
    end if;
    return old;
  end if;
end;
$$;

create function enforce_demo_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'properties' then
    if new.demo_dataset is distinct from demo_dataset_of('seller', new.seller_id) then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'property and seller demo status differ');
    end if;
  elsif tg_table_name = 'open_houses' then
    if new.demo_dataset is distinct from demo_dataset_of('property', new.property_id)
       or new.demo_dataset is distinct from demo_dataset_of('seller', new.seller_id) then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'open house, property and seller demo status differ');
    end if;
  elsif tg_table_name = 'property_images' then
    if new.demo_dataset is distinct from demo_dataset_of('property', new.property_id) then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'image and property demo status differ');
    end if;
  elsif tg_table_name = 'seller_profiles' and tg_op = 'UPDATE'
        and new.demo_dataset is distinct from old.demo_dataset then
    if exists (select 1 from properties p where p.seller_id = new.id and p.demo_dataset is distinct from new.demo_dataset)
       or exists (select 1 from open_houses o where o.seller_id = new.id and o.demo_dataset is distinct from new.demo_dataset) then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'seller inventory demo status differs');
    end if;
  end if;
  return new;
end;
$$;

create function protect_demo_children()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_trusted_demo_writer() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if (tg_op <> 'DELETE' and demo_dataset_of('property', new.property_id) is not null)
     or (tg_op <> 'INSERT' and demo_dataset_of('property', old.property_id) is not null) then
    perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'demo listing details are system-managed');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Applies to every caller, including the service role: demo entities never
-- receive leads, RSVPs, saves, follows, notifications or activity.
create function reject_demo_interactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := to_jsonb(new);
  v_kind text;
begin
  if tg_table_name = 'inquiries' then
    if demo_dataset_of('property', (v ->> 'property_id')::uuid) is not null
       or demo_dataset_of('seller', (v ->> 'seller_id')::uuid) is not null then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'demo listings do not accept inquiries');
    end if;
  elsif tg_table_name = 'open_house_rsvps' then
    if demo_dataset_of('open_house', (v ->> 'open_house_id')::uuid) is not null then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'demo events do not accept RSVPs');
    end if;
  elsif tg_table_name in ('property_saves', 'property_activity') then
    if demo_dataset_of('property', (v ->> 'property_id')::uuid) is not null
       or demo_dataset_of('seller', (v ->> 'seller_id')::uuid) is not null then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'demo listings cannot be saved or tracked');
    end if;
  elsif tg_table_name in ('seller_follows', 'lead_notes', 'lead_activity') then
    if demo_dataset_of('seller', (v ->> 'seller_id')::uuid) is not null
       or demo_dataset_of('inquiry', (v ->> 'inquiry_id')::uuid) is not null then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'demo sellers cannot be followed or receive leads');
    end if;
  elsif tg_table_name = 'notifications' then
    v_kind := v ->> 'entity_type';
    if v_kind is not null and demo_dataset_of(v_kind, (v ->> 'entity_id')::uuid) is not null then
      perform raise_demo_error('DM001', 'DEMO_CONTENT', tg_table_name, 'no notifications about demo content');
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['seller_profiles', 'properties', 'open_houses', 'property_images'] loop
    execute format('create trigger protect_demo_rows before insert or update or delete on %I for each row execute function protect_demo_rows()', t);
  end loop;
  foreach t in array array['properties', 'open_houses', 'property_images'] loop
    execute format('create trigger enforce_demo_consistency before insert or update on %I for each row execute function enforce_demo_consistency()', t);
  end loop;
  execute 'create trigger enforce_demo_consistency before update on seller_profiles for each row execute function enforce_demo_consistency()';
  foreach t in array array['property_features', 'property_custom_features', 'property_agents'] loop
    execute format('create trigger protect_demo_children before insert or update or delete on %I for each row execute function protect_demo_children()', t);
  end loop;
  foreach t in array array['inquiries', 'open_house_rsvps', 'property_saves', 'seller_follows', 'notifications', 'lead_notes', 'lead_activity', 'property_activity'] loop
    execute format('create trigger reject_demo_interactions before insert or update on %I for each row execute function reject_demo_interactions()', t);
  end loop;
end $$;

-- Demo sellers are not billed and have no entitlement row.
create or replace function handle_new_seller()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not new.is_demo then
    insert into seller_entitlements (seller_id) values (new.id);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Direct-read visibility (restrictive policies AND with existing ones).
-- Admins can still see demo rows through their admin policies.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['seller_profiles', 'properties', 'open_houses', 'property_images'] loop
    execute format(
      'create policy demo_visibility_anon on %I as restrictive for select to anon using (not is_demo or demo_content_visible())', t);
    execute format(
      'create policy demo_visibility_authenticated on %I as restrictive for select to authenticated using (not is_demo or demo_content_visible() or is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Public views: same columns as before plus is_demo, filtered by the switch.
-- ---------------------------------------------------------------------------
create or replace view public_seller_profiles
with (security_barrier = true) as
select
  s.id,
  s.account_type,
  s.display_name,
  s.username,
  s.profile_image_path,
  s.bio,
  s.city,
  s.state,
  s.website_url,
  s.instagram_url,
  s.created_at,
  (select count(*) from seller_follows f where f.seller_id = s.id) as follower_count,
  (select count(*) from properties p where p.seller_id = s.id and p.deleted_at is null and p.moderation_status <> 'hidden' and p.listing_status = 'for_sale') as for_sale_count,
  (select count(*) from properties p where p.seller_id = s.id and p.deleted_at is null and p.moderation_status <> 'hidden' and p.listing_status = 'coming_soon') as coming_soon_count,
  exists (
    select 1 from open_houses oh
    join properties p on p.id = oh.property_id
    where oh.seller_id = s.id and oh.status = 'scheduled' and oh.ends_at > now()
      and p.deleted_at is null and p.moderation_status <> 'hidden'
  ) as has_upcoming_open_house,
  s.is_demo
from seller_profiles s
where s.status = 'active' and s.deleted_at is null
  and (not s.is_demo or demo_content_visible());

create or replace view public_properties
with (security_barrier = true) as
select
  p.id,
  p.seller_id,
  p.slug,
  p.title,
  p.description,
  p.property_type,
  p.listing_status,
  p.address_visibility,
  case when p.address_visibility = 'full' then p.address_line_1 else null end as display_address_line_1,
  case when p.address_visibility = 'full' then p.address_line_2 else null end as display_address_line_2,
  p.city,
  p.state,
  case when p.address_visibility in ('full','city_zip') then p.postal_code else null end as display_postal_code,
  p.county,
  case when p.address_visibility = 'full' then p.latitude else null end as display_latitude,
  case when p.address_visibility = 'full' then p.longitude else null end as display_longitude,
  case
    when p.address_visibility = 'full' then p.address_line_1 || ', ' || p.city || ', ' || p.state || ' ' || p.postal_code
    when p.address_visibility = 'city_zip' then p.city || ', ' || p.state || ' ' || p.postal_code
    else p.city || ', ' || p.state
  end as display_line,
  p.bedrooms,
  p.full_bathrooms,
  p.half_bathrooms,
  p.square_feet,
  p.lot_size,
  p.lot_size_unit,
  p.year_built,
  p.stories,
  p.parking_spaces,
  p.garage_spaces,
  p.number_of_units,
  p.basement_type,
  p.heating_type,
  p.cooling_type,
  p.parking_type,
  p.hoa_fee_cents,
  p.property_taxes_annual_cents,
  p.asking_price_cents,
  p.expected_price_min_cents,
  p.expected_price_max_cents,
  p.pricing_type,
  p.sold_price_cents,
  p.video_url,
  p.virtual_tour_url,
  p.published_at,
  p.created_at,
  (select pi.storage_path from property_images pi where pi.property_id = p.id order by pi.is_cover desc, pi.display_order asc limit 1) as cover_image_path,
  (select count(*) from property_images pi where pi.property_id = p.id) as photo_count,
  exists (
    select 1 from open_houses oh
    where oh.property_id = p.id and oh.status = 'scheduled' and oh.ends_at > now()
  ) as has_upcoming_open_house,
  s.username as seller_username,
  s.display_name as seller_display_name,
  s.profile_image_path as seller_profile_image_path,
  p.is_demo
from properties p
join seller_profiles s on s.id = p.seller_id
where p.deleted_at is null
  and p.moderation_status <> 'hidden'
  and p.listing_status in ('coming_soon','for_sale','under_contract','sold')
  and s.status = 'active'
  and s.deleted_at is null
  and (not p.is_demo or demo_content_visible());

create or replace view public_property_images
with (security_barrier = true) as
select pi.id, pi.property_id, pi.storage_path, pi.display_order, pi.is_cover, pi.width, pi.height, pi.alt_text, pi.credit
from property_images pi
where pi.property_id in (select id from public_properties);

-- Demo open houses never have a street address (address_visibility is
-- city_zip), so they are allowed through without the 'full' requirement.
create or replace view public_open_houses
with (security_barrier = true) as
select
  oh.id,
  oh.property_id,
  oh.seller_id,
  oh.starts_at,
  oh.ends_at,
  oh.timezone,
  oh.registration_type,
  oh.instructions,
  oh.host_type,
  pp.display_address_line_1,
  pp.city,
  pp.state,
  pp.display_postal_code,
  pp.asking_price_cents,
  pp.cover_image_path,
  pp.seller_username,
  pp.seller_display_name,
  pp.slug as property_slug,
  pp.title as property_title,
  oh.is_demo
from open_houses oh
join public_properties pp on pp.id = oh.property_id
where oh.status = 'scheduled'
  and (pp.address_visibility = 'full' or oh.is_demo);

-- ---------------------------------------------------------------------------
-- Service-role RPCs
-- ---------------------------------------------------------------------------
create function admin_set_demo_visibility(p_visible boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_trusted_demo_writer() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into app_settings (key, value, updated_at)
  values ('public_demo_content_visible', to_jsonb(p_visible), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return p_visible;
end;
$$;

create function admin_apply_demo_dataset(p_dataset text, p_operation_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict text;
  v_missing text;
  v_paths text[];
begin
  if not is_trusted_demo_writer() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_dataset !~ '^[a-z0-9][a-z0-9-]{2,60}$' then
    raise exception 'invalid dataset id' using errcode = '22023';
  end if;

  -- Never take over a row that is not already part of this dataset.
  select string_agg(x.tbl || ':' || x.id, ', ') into v_conflict from (
    select 'seller_profiles' tbl, s.id from seller_profiles s
      join jsonb_to_recordset(coalesce(p_payload -> 'sellers', '[]')) j(id uuid) on j.id = s.id
      where s.demo_dataset is distinct from p_dataset
    union all
    select 'properties', p.id from properties p
      join jsonb_to_recordset(coalesce(p_payload -> 'properties', '[]')) j(id uuid) on j.id = p.id
      where p.demo_dataset is distinct from p_dataset
    union all
    select 'property_images', i.id from property_images i
      join jsonb_to_recordset(coalesce(p_payload -> 'property_images', '[]')) j(id uuid) on j.id = i.id
      where i.demo_dataset is distinct from p_dataset
    union all
    select 'open_houses', o.id from open_houses o
      join jsonb_to_recordset(coalesce(p_payload -> 'open_houses', '[]')) j(id uuid) on j.id = o.id
      where o.demo_dataset is distinct from p_dataset
  ) x;
  if v_conflict is not null then
    perform raise_demo_error('DM001', 'DEMO_CONTENT', 'payload', 'ids belong to rows outside the dataset: ' || v_conflict);
  end if;

  select coalesce(array_agg(j.storage_path), '{}') into v_paths
  from jsonb_to_recordset(coalesce(p_payload -> 'property_images', '[]')) j(storage_path text);

  select string_agg(p, ', ') into v_missing
  from unnest(v_paths) p
  where not exists (
    select 1 from demo_storage_ledger l
    where l.bucket = 'property-images' and l.path = p and l.dataset = p_dataset
      and l.state in ('uploaded_pending', 'live')
  );
  if v_missing is not null then
    raise exception 'DEMO_STORAGE_NOT_LEDGERED' using errcode = 'DM002', detail = v_missing;
  end if;

  -- Reconcile: drop dataset rows the payload no longer contains.
  delete from open_houses where demo_dataset = p_dataset
    and id not in (select j.id from jsonb_to_recordset(coalesce(p_payload -> 'open_houses', '[]')) j(id uuid));
  delete from property_images where demo_dataset = p_dataset
    and id not in (select j.id from jsonb_to_recordset(coalesce(p_payload -> 'property_images', '[]')) j(id uuid));
  delete from properties where demo_dataset = p_dataset
    and id not in (select j.id from jsonb_to_recordset(coalesce(p_payload -> 'properties', '[]')) j(id uuid));
  delete from seller_profiles where demo_dataset = p_dataset
    and id not in (select j.id from jsonb_to_recordset(coalesce(p_payload -> 'sellers', '[]')) j(id uuid));

  insert into seller_profiles (id, user_id, account_type, display_name, username, profile_image_path, bio, city, state,
                               website_url, instagram_url, status, deleted_at, is_demo, demo_dataset, seed_key)
  select j.id, null, j.account_type, j.display_name, j.username, null, j.bio, j.city, j.state,
         null, null, 'active', null, true, p_dataset, j.seed_key
  from jsonb_to_recordset(coalesce(p_payload -> 'sellers', '[]')) j(
    id uuid, seed_key text, account_type seller_account_type, display_name text, username citext, bio text, city text, state text)
  on conflict (id) do update set
    account_type = excluded.account_type, display_name = excluded.display_name, username = excluded.username,
    profile_image_path = null, bio = excluded.bio, city = excluded.city, state = excluded.state,
    website_url = null, instagram_url = null, status = 'active', deleted_at = null, seed_key = excluded.seed_key;

  insert into properties (id, seller_id, slug, title, description, property_type, listing_status, moderation_status,
    address_line_1, address_line_2, city, state, postal_code, county, latitude, longitude, address_visibility,
    bedrooms, full_bathrooms, half_bathrooms, square_feet, lot_size, lot_size_unit, year_built, stories,
    parking_spaces, garage_spaces, number_of_units, basement_type, heating_type, cooling_type, parking_type,
    hoa_fee_cents, property_taxes_annual_cents, asking_price_cents, expected_price_min_cents, expected_price_max_cents,
    pricing_type, sale_method, lead_recipient, publish_acknowledged_at, published_at, deleted_at,
    is_demo, demo_dataset, seed_key)
  select j.id, j.seller_id, j.slug, j.title, j.description, j.property_type, j.listing_status, 'clear',
    '', null, j.city, j.state, j.postal_code, j.county, null, null, j.address_visibility,
    j.bedrooms, j.full_bathrooms, j.half_bathrooms, j.square_feet, j.lot_size, j.lot_size_unit, j.year_built, j.stories,
    j.parking_spaces, j.garage_spaces, j.number_of_units, j.basement_type, j.heating_type, j.cooling_type, j.parking_type,
    j.hoa_fee_cents, j.property_taxes_annual_cents, j.asking_price_cents, j.expected_price_min_cents, j.expected_price_max_cents,
    j.pricing_type, 'independent', 'seller', j.published_at, j.published_at, null,
    true, p_dataset, j.seed_key
  from jsonb_to_recordset(coalesce(p_payload -> 'properties', '[]')) j(
    id uuid, seed_key text, seller_id uuid, slug text, title text, description text, property_type property_type,
    listing_status property_status, address_visibility address_visibility, city text, state text, postal_code text,
    county text, bedrooms int, full_bathrooms int, half_bathrooms int, square_feet int, lot_size numeric,
    lot_size_unit lot_size_unit, year_built int, stories int, parking_spaces int, garage_spaces int,
    number_of_units int, basement_type text, heating_type text, cooling_type text, parking_type text,
    hoa_fee_cents int, property_taxes_annual_cents int, asking_price_cents bigint, expected_price_min_cents bigint,
    expected_price_max_cents bigint, pricing_type pricing_type, published_at timestamptz)
  on conflict (id) do update set
    seller_id = excluded.seller_id, slug = excluded.slug, title = excluded.title, description = excluded.description,
    property_type = excluded.property_type, listing_status = excluded.listing_status, moderation_status = 'clear',
    address_line_1 = '', address_line_2 = null, city = excluded.city, state = excluded.state,
    postal_code = excluded.postal_code, county = excluded.county, latitude = null, longitude = null,
    address_visibility = excluded.address_visibility, bedrooms = excluded.bedrooms,
    full_bathrooms = excluded.full_bathrooms, half_bathrooms = excluded.half_bathrooms,
    square_feet = excluded.square_feet, lot_size = excluded.lot_size, lot_size_unit = excluded.lot_size_unit,
    year_built = excluded.year_built, stories = excluded.stories, parking_spaces = excluded.parking_spaces,
    garage_spaces = excluded.garage_spaces, number_of_units = excluded.number_of_units,
    basement_type = excluded.basement_type, heating_type = excluded.heating_type,
    cooling_type = excluded.cooling_type, parking_type = excluded.parking_type,
    hoa_fee_cents = excluded.hoa_fee_cents, property_taxes_annual_cents = excluded.property_taxes_annual_cents,
    asking_price_cents = excluded.asking_price_cents, expected_price_min_cents = excluded.expected_price_min_cents,
    expected_price_max_cents = excluded.expected_price_max_cents, pricing_type = excluded.pricing_type,
    publish_acknowledged_at = excluded.publish_acknowledged_at, published_at = excluded.published_at,
    deleted_at = null, seed_key = excluded.seed_key;

  delete from property_features pf using properties p
    where pf.property_id = p.id and p.demo_dataset = p_dataset;
  insert into property_features (property_id, feature_id)
  select j.property_id, f.id
  from jsonb_to_recordset(coalesce(p_payload -> 'property_features', '[]')) j(property_id uuid, feature_slug text)
  join features f on f.slug = j.feature_slug;

  -- Covers are uniquely indexed per property; clear stale covers before any
  -- insert or update so a cover can move between images.
  update property_images i set is_cover = false
    where i.demo_dataset = p_dataset and i.is_cover
      and i.id not in (
        select j.id from jsonb_to_recordset(coalesce(p_payload -> 'property_images', '[]')) j(id uuid, is_cover boolean)
        where j.is_cover
      );

  insert into property_images (id, property_id, storage_path, display_order, is_cover, width, height, alt_text,
                               credit, is_demo, demo_dataset, seed_key)
  select j.id, j.property_id, j.storage_path, j.display_order, j.is_cover, j.width, j.height, j.alt_text,
         j.credit, true, p_dataset, j.seed_key
  from jsonb_to_recordset(coalesce(p_payload -> 'property_images', '[]')) j(
    id uuid, seed_key text, property_id uuid, storage_path text, display_order int, is_cover boolean,
    width int, height int, alt_text text, credit text)
  on conflict (id) do nothing;
  update property_images i set
    property_id = j.property_id, storage_path = j.storage_path, display_order = j.display_order,
    is_cover = j.is_cover, width = j.width, height = j.height, alt_text = j.alt_text, credit = j.credit,
    seed_key = j.seed_key
  from jsonb_to_recordset(coalesce(p_payload -> 'property_images', '[]')) j(
    id uuid, seed_key text, property_id uuid, storage_path text, display_order int, is_cover boolean,
    width int, height int, alt_text text, credit text)
  where i.id = j.id and i.demo_dataset = p_dataset;

  insert into open_houses (id, property_id, seller_id, starts_at, ends_at, timezone, registration_type, instructions,
                           host_type, status, cancelled_at, cancellation_reason, is_demo, demo_dataset, seed_key)
  select j.id, j.property_id, j.seller_id, j.starts_at, j.ends_at, 'America/New_York', j.registration_type,
         j.instructions, j.host_type, 'scheduled', null, null, true, p_dataset, j.seed_key
  from jsonb_to_recordset(coalesce(p_payload -> 'open_houses', '[]')) j(
    id uuid, seed_key text, property_id uuid, seller_id uuid, starts_at timestamptz, ends_at timestamptz,
    registration_type registration_type, instructions text, host_type host_type)
  on conflict (id) do update set
    property_id = excluded.property_id, seller_id = excluded.seller_id, starts_at = excluded.starts_at,
    ends_at = excluded.ends_at, timezone = excluded.timezone, registration_type = excluded.registration_type,
    instructions = excluded.instructions, host_type = excluded.host_type, status = 'scheduled',
    cancelled_at = null, cancellation_reason = null, seed_key = excluded.seed_key;

  update demo_storage_ledger set state = 'live', operation_id = p_operation_id, last_error = null, updated_at = now()
    where dataset = p_dataset and bucket = 'property-images' and path = any(v_paths);
  update demo_storage_ledger set state = 'delete_pending', updated_at = now()
    where dataset = p_dataset and state in ('live', 'uploaded_pending') and not (path = any(v_paths));

  return jsonb_build_object(
    'sellers', (select count(*) from seller_profiles where demo_dataset = p_dataset),
    'properties', (select count(*) from properties where demo_dataset = p_dataset),
    'property_images', (select count(*) from property_images where demo_dataset = p_dataset),
    'open_houses', (select count(*) from open_houses where demo_dataset = p_dataset),
    'storage_delete_pending', (select count(*) from demo_storage_ledger where dataset = p_dataset and state = 'delete_pending')
  );
end;
$$;

create function admin_refresh_demo_open_house_dates(p_dataset text, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing text;
  v_count int;
begin
  if not is_trusted_demo_writer() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select string_agg(j.seed_key, ', ') into v_missing
  from jsonb_to_recordset(p_rows) j(seed_key text)
  where not exists (select 1 from open_houses o where o.demo_dataset = p_dataset and o.seed_key = j.seed_key);
  if v_missing is not null then
    raise exception 'DEMO_SEED_KEY_NOT_FOUND' using errcode = 'DM003', detail = v_missing;
  end if;

  update open_houses o set
    starts_at = j.starts_at, ends_at = j.ends_at, status = 'scheduled', cancelled_at = null, cancellation_reason = null
  from jsonb_to_recordset(p_rows) j(seed_key text, starts_at timestamptz, ends_at timestamptz)
  where o.demo_dataset = p_dataset and o.is_demo and o.seed_key = j.seed_key;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function admin_remove_demo_dataset(p_dataset text)
returns table (bucket text, path text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not is_trusted_demo_writer() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update demo_storage_ledger set state = 'delete_pending', updated_at = now()
    where dataset = p_dataset and state <> 'deleted';
  delete from open_houses where demo_dataset = p_dataset;
  delete from property_images where demo_dataset = p_dataset;
  delete from properties where demo_dataset = p_dataset;
  delete from seller_profiles where demo_dataset = p_dataset;
  return query
    select l.bucket, l.path from demo_storage_ledger l
    where l.dataset = p_dataset and l.state = 'delete_pending'
    order by l.path;
end;
$$;

-- Removes hosted development fixtures listed in an exact manifest. Every row
-- must still match its created_at fingerprint, and nothing outside the
-- manifest may reference a listed row or auth user (apart from pure child
-- data that belongs to the listed entity). Auth users themselves are deleted
-- afterwards through the Admin API; storage paths are ledgered for deletion.
create function admin_remove_dev_fixtures(p_manifest jsonb, p_operation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order text[] := array[
    'lead_activity', 'lead_notes', 'email_deliveries', 'notifications', 'admin_audit_logs', 'reports',
    'property_activity', 'property_saves', 'seller_follows', 'open_house_rsvps', 'inquiries',
    'property_images', 'open_houses', 'properties', 'seller_profiles'
  ];
  v_owned_children text[] := array[
    'property_features', 'property_custom_features', 'property_agents', 'seller_entitlements',
    'profiles', 'user_roles', 'notification_preferences'
  ];
  v_bad text;
  v_fk record;
  v_dst_ids uuid[];
  v_src_ids uuid[];
  v_has_id boolean;
  v_n bigint;
  v_problems text[] := '{}';
  v_result jsonb := '{}';
  v_table text;
  v_ids uuid[];
  v_row jsonb;
  v_exists boolean;
  v_matches boolean;
begin
  if not is_trusted_demo_writer() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select string_agg(distinct r ->> 'table', ', ') into v_bad
  from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r
  where not ((r ->> 'table') = any(v_order));
  if v_bad is not null then
    raise exception 'FIXTURE_TABLE_NOT_ALLOWED' using errcode = 'DM006', detail = v_bad;
  end if;

  -- Fingerprints (a missing row is treated as already removed, so reruns resume).
  for v_row in
    select r from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r
    union all
    select r || '{"table":"auth.users"}' from jsonb_array_elements(coalesce(p_manifest -> 'auth_users', '[]')) r
  loop
    v_table := v_row ->> 'table';
    execute format(
      'select true, date_trunc(''milliseconds'', created_at) = date_trunc(''milliseconds'', $2::timestamptz) from %s where id = $1',
      case when v_table = 'auth.users' then 'auth.users' else format('%I', v_table) end
    ) into v_exists, v_matches using (v_row ->> 'id')::uuid, v_row ->> 'created_at';
    if v_exists and not v_matches then
      raise exception 'FIXTURE_FINGERPRINT' using errcode = 'DM005', detail = v_table || ':' || (v_row ->> 'id');
    end if;
  end loop;

  -- Cross-link check across every single-column foreign key.
  for v_fk in
    select c.conrelid::regclass::text as src, a.attname as src_col,
           case when c.confrelid = 'auth.users'::regclass then 'auth.users' else c.confrelid::regclass::text end as dst,
           c.conrelid as src_oid
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
    where c.contype = 'f' and array_length(c.conkey, 1) = 1 and af.attname = 'id'
      and (c.confrelid = 'auth.users'::regclass or c.confrelid::regclass::text = any(v_order))
  loop
    if v_fk.dst = 'auth.users' then
      select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_dst_ids from jsonb_array_elements(coalesce(p_manifest -> 'auth_users', '[]')) r;
    else
      select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_dst_ids from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r where r ->> 'table' = v_fk.dst;
    end if;
    continue when cardinality(v_dst_ids) = 0;
    continue when v_fk.src = any(v_owned_children);

    select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_src_ids from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r where r ->> 'table' = v_fk.src;
    select exists (select 1 from pg_attribute where attrelid = v_fk.src_oid and attname = 'id' and not attisdropped) into v_has_id;

    execute format(
      'select count(*) from %s t where t.%I = any($1) and not (%s)',
      v_fk.src, v_fk.src_col, case when v_has_id then 't.id = any($2)' else 'false' end
    ) into v_n using v_dst_ids, v_src_ids;
    if v_n > 0 then
      v_problems := v_problems || format('%s rows in %s.%s reference %s', v_n, v_fk.src, v_fk.src_col, v_fk.dst);
    end if;
  end loop;
  if cardinality(v_problems) > 0 then
    raise exception 'FIXTURE_CROSS_LINKED' using errcode = 'DM004', detail = array_to_string(v_problems, '; ');
  end if;

  foreach v_table in array v_order loop
    select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_ids
    from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r where r ->> 'table' = v_table;
    continue when cardinality(v_ids) = 0;
    execute format('delete from %I where id = any($1)', v_table) using v_ids;
    get diagnostics v_n = row_count;
    v_result := v_result || jsonb_build_object(v_table, v_n);
  end loop;

  insert into demo_storage_ledger (operation_id, dataset, bucket, path, sha256, state)
  select p_operation_id, 'dev-fixtures-hosted', s ->> 'bucket', s ->> 'path', null, 'delete_pending'
  from jsonb_array_elements(coalesce(p_manifest -> 'storage', '[]')) s
  on conflict (bucket, path) do update set state = 'delete_pending', operation_id = excluded.operation_id, updated_at = now()
    where demo_storage_ledger.state <> 'deleted';
  get diagnostics v_n = row_count;

  return jsonb_build_object('deleted', v_result, 'storage_delete_pending', v_n);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function is_trusted_demo_writer() from public, anon, authenticated;
revoke execute on function raise_demo_error(text, text, text, text) from public, anon, authenticated;
revoke execute on function demo_dataset_of(text, uuid) from public, anon, authenticated;
revoke execute on function protect_demo_rows() from public, anon, authenticated;
revoke execute on function enforce_demo_consistency() from public, anon, authenticated;
revoke execute on function protect_demo_children() from public, anon, authenticated;
revoke execute on function reject_demo_interactions() from public, anon, authenticated;

revoke execute on function demo_content_visible() from public;
grant execute on function demo_content_visible() to anon, authenticated, service_role;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_set_demo_visibility(boolean)',
    'admin_apply_demo_dataset(text, uuid, jsonb)',
    'admin_refresh_demo_open_house_dates(text, jsonb)',
    'admin_remove_demo_dataset(text)',
    'admin_remove_dev_fixtures(jsonb, uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
