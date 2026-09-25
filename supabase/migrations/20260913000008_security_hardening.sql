-- ============================================================================
-- Hardening pass in response to the Supabase security advisor run after
-- migration 0007: (1) trigger/helper functions were missing a pinned
-- search_path, (2) CREATE FUNCTION grants EXECUTE to PUBLIC by default,
-- which silently included `anon` on every RPC even though only
-- `authenticated` (or, for check_rate_limit, pre-auth callers) should have
-- it, and (3) is_admin() took a caller-suppliable check_user_id, which
-- would let any signed-in user probe another user's admin status. See
-- docs/architecture.md.
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function enforce_username_not_reserved()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from reserved_usernames r where r.username = new.username) then
    raise exception 'username "%" is reserved', new.username
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- is_admin() keeps its (unused) parameter rather than being dropped and
-- recreated — RLS policies already depend on the is_admin(uuid) function
-- OID, and dropping it would cascade-drop every policy that calls it. The
-- body now ignores check_user_id entirely and always resolves auth.uid(),
-- so calling it directly as an RPC can no longer be used to probe another
-- user's admin status.
create or replace function is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function is_admin(uuid) from public;
grant execute on function is_admin(uuid) to authenticated;

revoke execute on function is_own_seller(uuid) from public;
grant execute on function is_own_seller(uuid) to authenticated;

revoke execute on function change_property_status(uuid, property_status, bigint) from public;
revoke execute on function cancel_open_house(uuid, text) from public;
revoke execute on function update_lead_status(uuid, lead_status) from public;
revoke execute on function add_lead_note(uuid, text) from public;
revoke execute on function admin_set_property_moderation(uuid, moderation_status) from public;
revoke execute on function admin_set_seller_status(uuid, seller_status) from public;
revoke execute on function admin_grant_listing_slots(uuid, int) from public;
revoke execute on function admin_resolve_report(uuid, report_status, text) from public;
-- (each already has an explicit `grant ... to authenticated` from migration 0007)

-- check_rate_limit intentionally stays callable pre-auth (guest inquiry/RSVP/
-- report submissions must be rate-limited too) — no change needed there.

-- Scope every owner/admin policy to `authenticated` explicitly, instead of
-- the implicit PUBLIC (which includes anon) it got by omitting `TO`. Tables
-- meant to stay genuinely public (features, reserved_usernames) already
-- declare `TO anon, authenticated` and are untouched.
do $$
declare
  p record;
begin
  for p in
    select * from (values
      ('profiles','profiles_select_own'), ('profiles','profiles_update_own'), ('profiles','profiles_admin_all'),
      ('user_roles','user_roles_select_own'), ('user_roles','user_roles_admin_write'),
      ('user_roles','user_roles_admin_update'), ('user_roles','user_roles_admin_delete'),
      ('seller_profiles','seller_profiles_select_own'), ('seller_profiles','seller_profiles_insert_own'),
      ('seller_profiles','seller_profiles_update_own'),
      ('seller_entitlements','seller_entitlements_select_own'), ('seller_entitlements','seller_entitlements_admin_write'),
      ('properties','properties_select_own'), ('properties','properties_insert_own'),
      ('properties','properties_update_own'), ('properties','properties_delete_own'),
      ('property_images','property_images_select_own'), ('property_images','property_images_write_own'),
      ('property_agents','property_agents_select_own'), ('property_agents','property_agents_write_own'),
      ('features','features_admin_write'),
      ('property_features','property_features_owner'), ('property_custom_features','property_custom_features_owner'),
      ('seller_follows','seller_follows_owner'),
      ('property_saves','property_saves_owner'),
      ('open_houses','open_houses_select_own'), ('open_houses','open_houses_write_own'),
      ('open_house_rsvps','open_house_rsvps_select'), ('open_house_rsvps','open_house_rsvps_update'),
      ('inquiries','inquiries_select'), ('inquiries','inquiries_update_seller'),
      ('lead_notes','lead_notes_owner'), ('lead_activity','lead_activity_select'), ('lead_activity','lead_activity_insert'),
      ('notifications','notifications_select_own'), ('notifications','notifications_update_own'),
      ('notification_preferences','notification_preferences_owner'),
      ('reports','reports_admin_all'),
      ('property_activity','property_activity_select'),
      ('email_deliveries','email_deliveries_admin_only'),
      ('admin_audit_logs','admin_audit_logs_select'), ('admin_audit_logs','admin_audit_logs_insert')
    ) as t(table_name, policy_name)
  loop
    execute format('alter policy %I on %I to authenticated', p.policy_name, p.table_name);
  end loop;
end $$;
