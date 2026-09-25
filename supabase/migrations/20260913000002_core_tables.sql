-- ============================================================================
-- Core tables
-- ============================================================================

create table reserved_usernames (
  username citext primary key
);
insert into reserved_usernames (username) values
  ('admin'),('support'),('api'),('login'),('signup'),('logout'),
  ('forgot-password'),('reset-password'),('verify-email'),('onboarding'),
  ('properties'),('homes'),('search'),('dashboard'),('settings'),('account'),
  ('sellers'),('open-houses'),('coming-soon'),('terms'),('privacy'),
  ('fair-housing'),('contact'),('notifications'),('saved'),('following'),
  ('rsvps'),('leads'),('u'),('auth'),('www'),('help');

-- One row per authenticated user. Created by handle_new_user() trigger.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  account_type seller_account_type not null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  -- Reserved-name exclusion can't live in a CHECK (no subqueries allowed);
  -- enforced by the enforce_username_not_reserved() trigger instead.
  username citext not null unique check (username ~ '^[a-zA-Z0-9_.]{3,30}$'),
  profile_image_path text,
  bio text check (char_length(bio) <= 1000),
  city text not null,
  state text not null,
  website_url text,
  instagram_url text,
  status seller_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table seller_entitlements (
  seller_id uuid primary key references seller_profiles(id) on delete cascade,
  free_active_listing_limit int not null default 5,
  additional_listing_slots int not null default 0,
  billing_status billing_status not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  slug text unique,
  title text check (char_length(title) <= 120),
  description text check (char_length(description) <= 5000),
  property_type property_type not null default 'single_family',
  listing_status property_status not null default 'draft',
  paused_from_status property_status,
  moderation_status moderation_status not null default 'clear',

  address_line_1 text not null default '',
  address_line_2 text,
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  county text,
  latitude double precision,
  longitude double precision,
  address_visibility address_visibility not null default 'full',

  bedrooms int,
  full_bathrooms int,
  half_bathrooms int,
  square_feet int,
  lot_size numeric,
  lot_size_unit lot_size_unit,
  year_built int,
  stories int,
  parking_spaces int,
  garage_spaces int,
  number_of_units int,
  basement_type text,
  heating_type text,
  cooling_type text,
  parking_type text,
  hoa_fee_cents int,
  property_taxes_annual_cents int,

  asking_price_cents bigint,
  expected_price_min_cents bigint,
  expected_price_max_cents bigint,
  pricing_type pricing_type not null default 'price_undecided',

  sale_method sale_method not null default 'independent',
  lead_recipient lead_recipient not null default 'seller',

  video_url text,
  virtual_tour_url text,

  publish_acknowledged_at timestamptz,
  wizard_last_step int not null default 1,
  sold_price_cents bigint,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  storage_path text not null,
  display_order int not null default 0,
  is_cover boolean not null default false,
  width int,
  height int,
  alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table property_agents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  brokerage text,
  email text,
  phone text,
  show_contact_publicly boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table features (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  slug text not null unique
);

create table property_features (
  property_id uuid not null references properties(id) on delete cascade,
  feature_id uuid not null references features(id) on delete cascade,
  primary key (property_id, feature_id)
);

create table property_custom_features (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table seller_follows (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  notify_new_properties boolean not null default true,
  notify_coming_soon boolean not null default true,
  notify_open_houses boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, follower_user_id)
);

create table property_saves (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (property_id, user_id)
);

create table open_houses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/New_York',
  registration_type registration_type not null default 'optional',
  instructions text check (char_length(instructions) <= 1000),
  host_type host_type not null default 'seller',
  status open_house_status not null default 'scheduled',
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table open_house_rsvps (
  id uuid primary key default gen_random_uuid(),
  open_house_id uuid not null references open_houses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email citext not null,
  phone text,
  party_size int not null default 1 check (party_size between 1 and 20),
  agent_status rsvp_agent_status not null default 'prefer_not_to_say',
  message text check (char_length(message) <= 1000),
  status rsvp_status not null default 'confirmed',
  idempotency_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete set null,
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email citext not null,
  phone text,
  preferred_contact_method contact_method not null default 'email',
  inquiry_type inquiry_type not null default 'question',
  buying_stage buying_stage not null default 'prefer_not_to_say',
  agent_status agent_status not null default 'prefer_not_to_say',
  message text check (char_length(message) <= 2000),
  lead_status lead_status not null default 'new',
  idempotency_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references inquiries(id) on delete cascade,
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table lead_activity (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references inquiries(id) on delete cascade,
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  activity_type text not null,
  previous_value text,
  new_value text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_followed_new_properties boolean not null default true,
  email_followed_coming_soon boolean not null default true,
  email_followed_open_houses boolean not null default true,
  email_new_leads boolean not null default true,
  email_open_house_rsvps boolean not null default true,
  updated_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references auth.users(id) on delete set null,
  reporter_email citext,
  property_id uuid references properties(id) on delete cascade,
  seller_id uuid references seller_profiles(id) on delete cascade,
  reason report_reason not null,
  description text check (char_length(description) <= 2000),
  status report_status not null default 'open',
  admin_resolution_note text,
  idempotency_key uuid unique,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  check (property_id is not null or seller_id is not null)
);

create table property_activity (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  event_type text not null,
  metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table email_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references notifications(id) on delete set null,
  email_type text not null,
  recipient citext not null,
  provider_message_id text,
  status email_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);
