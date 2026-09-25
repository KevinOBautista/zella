-- ============================================================================
-- Bug fix: migration 20260913000012 added
--   open_houses_select_via_own_rsvp   (on open_houses, checks open_house_rsvps)
--   properties_select_via_own_rsvp    (on properties, checks open_house_rsvps
--                                       joined to open_houses)
-- and open_house_rsvps_select (from 0005/0008) checks open_houses. Together
-- these formed a policy cycle: evaluating properties -> triggers RLS on
-- open_house_rsvps -> its policy checks open_houses -> triggers RLS on
-- open_houses -> its "via own rsvp" policy checks open_house_rsvps again.
-- Postgres detected this as infinite recursion (42P17) on any query that
-- embeds properties/open_houses for an authenticated user — including
-- /dashboard/leads' `inquiries` -> `properties` embed, which affected every
-- seller, not just the buyer-RSVP case migration 0012 was written for.
--
-- Fix: move the cross-table check into a SECURITY DEFINER function. A
-- SECURITY DEFINER function owned by the migration role executes its body
-- as that role (which has BYPASSRLS), so the inner query never re-triggers
-- RLS on open_house_rsvps/open_houses — breaking the cycle instead of just
-- hiding it.
-- ============================================================================

create function has_confirmed_rsvp_for_open_house(p_open_house_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from open_house_rsvps r
    where r.open_house_id = p_open_house_id and r.user_id = auth.uid()
  );
$$;
revoke execute on function has_confirmed_rsvp_for_open_house(uuid) from public, anon;
grant execute on function has_confirmed_rsvp_for_open_house(uuid) to authenticated;

create function has_confirmed_rsvp_for_property(p_property_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from open_house_rsvps r
    join open_houses oh on oh.id = r.open_house_id
    where oh.property_id = p_property_id and r.user_id = auth.uid()
  );
$$;
revoke execute on function has_confirmed_rsvp_for_property(uuid) from public, anon;
grant execute on function has_confirmed_rsvp_for_property(uuid) to authenticated;

drop policy open_houses_select_via_own_rsvp on open_houses;
create policy open_houses_select_via_own_rsvp on open_houses for select to authenticated using (
  has_confirmed_rsvp_for_open_house(id)
);

drop policy properties_select_via_own_rsvp on properties;
create policy properties_select_via_own_rsvp on properties for select to authenticated using (
  has_confirmed_rsvp_for_property(id)
);
