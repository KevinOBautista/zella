-- ============================================================================
-- Supabase provisions new projects with a default privilege that grants
-- `anon` EXECUTE on every function created in the public schema — a
-- convenience for quick RPC prototyping that is wrong for this app, where
-- most RPCs must only ever run as an authenticated, ownership-checked
-- caller. `revoke ... from public` (migration 0008) does not touch this:
-- `anon` held its own direct grant, not merely PUBLIC's. Revoke it
-- explicitly, and stop it from happening automatically for future
-- functions in this schema.
-- ============================================================================

revoke execute on function is_admin(uuid) from anon;
revoke execute on function is_own_seller(uuid) from anon;
revoke execute on function change_property_status(uuid, property_status, bigint) from anon;
revoke execute on function cancel_open_house(uuid, text) from anon;
revoke execute on function update_lead_status(uuid, lead_status) from anon;
revoke execute on function add_lead_note(uuid, text) from anon;
revoke execute on function admin_set_property_moderation(uuid, moderation_status) from anon;
revoke execute on function admin_set_seller_status(uuid, seller_status) from anon;
revoke execute on function admin_grant_listing_slots(uuid, int) from anon;
revoke execute on function admin_resolve_report(uuid, report_status, text) from anon;

-- Trigger-only functions: never meant to be called directly via PostgREST.
-- Trigger invocation does not require the firing role to hold EXECUTE.
revoke execute on function handle_new_user() from anon, authenticated;
revoke execute on function handle_new_seller() from anon, authenticated;

-- check_rate_limit is the deliberate exception — guest inquiry/RSVP/report
-- submissions must be rate-limited pre-auth, so anon keeps EXECUTE there.

alter default privileges in schema public revoke execute on functions from anon;
