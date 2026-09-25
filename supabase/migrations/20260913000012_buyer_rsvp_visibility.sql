-- ============================================================================
-- A buyer's own confirmed RSVP is visible to them (open_house_rsvps_select
-- already allows this), but the /account/rsvps page also needs to embed
-- the related open_houses and properties rows via PostgREST — and RLS on
-- those tables only allowed the owning seller/admin. Add narrow read
-- policies so a buyer can see the event and property details for an open
-- house they've RSVP'd to (never a substitute for the public_* views —
-- this is scoped to exactly the rows the buyer is already entitled to see
-- because they registered for that specific event).
-- ============================================================================

create policy open_houses_select_via_own_rsvp on open_houses for select to authenticated using (
  exists (
    select 1 from open_house_rsvps r
    where r.open_house_id = open_houses.id and r.user_id = auth.uid()
  )
);

create policy properties_select_via_own_rsvp on properties for select to authenticated using (
  exists (
    select 1 from open_house_rsvps r
    join open_houses oh on oh.id = r.open_house_id
    where oh.property_id = properties.id and r.user_id = auth.uid()
  )
);
