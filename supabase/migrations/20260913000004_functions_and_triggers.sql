-- ============================================================================
-- Shared trigger functions
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','seller_profiles','seller_entitlements','properties',
    'property_images','property_agents','seller_follows','open_houses',
    'open_house_rsvps','inquiries','lead_notes','notification_preferences'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;

-- Reserved usernames can't be enforced by a CHECK (no subqueries), so a
-- trigger does it instead. Comparison is case-insensitive via citext.
create or replace function enforce_username_not_reserved()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from reserved_usernames r where r.username = new.username) then
    raise exception 'username "%" is reserved', new.username
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger seller_profiles_username_not_reserved
  before insert or update of username on seller_profiles
  for each row execute function enforce_username_not_reserved();

-- New auth user -> profile row + default notification prefs + default 'user' role.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (user_id) values (new.id);
  insert into notification_preferences (user_id) values (new.id);
  insert into user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- New seller profile -> default entitlement row (5 free active slots).
create or replace function handle_new_seller()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into seller_entitlements (seller_id) values (new.id);
  return new;
end;
$$;

create trigger on_seller_profile_created
  after insert on seller_profiles
  for each row execute function handle_new_seller();

-- SECURITY DEFINER check used throughout RLS policies and RPCs. Reading
-- user_roles directly in a policy would need its own policy (chicken/egg),
-- so this function bypasses RLS deliberately and only ever returns a bool.
create or replace function is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from user_roles where user_id = check_user_id and role = 'admin'
  );
$$;

-- Used by RLS policies to resolve "does this seller_id belong to me".
create or replace function is_own_seller(check_seller_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from seller_profiles
    where id = check_seller_id and user_id = auth.uid()
  );
$$;
