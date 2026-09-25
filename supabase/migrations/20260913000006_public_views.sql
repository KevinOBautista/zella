-- ============================================================================
-- Public, redacted read surfaces. Owned by the migration role (postgres),
-- which has BYPASSRLS, so these views can read the full underlying rows
-- while only ever emitting the columns below to anon/authenticated grantees.
-- security_barrier stops the planner from pushing a filter that could leak
-- a pre-redaction column value through an error or timing side channel.
-- See docs/architecture.md for the full threat model.
-- ============================================================================

create view public_seller_profiles
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
  ) as has_upcoming_open_house
from seller_profiles s
where s.status = 'active' and s.deleted_at is null;

grant select on public_seller_profiles to anon, authenticated;

create view public_properties
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
  s.profile_image_path as seller_profile_image_path
from properties p
join seller_profiles s on s.id = p.seller_id
where p.deleted_at is null
  and p.moderation_status <> 'hidden'
  and p.listing_status in ('coming_soon','for_sale','under_contract','sold')
  and s.status = 'active'
  and s.deleted_at is null;

grant select on public_properties to anon, authenticated;

create view public_property_images
with (security_barrier = true) as
select pi.id, pi.property_id, pi.storage_path, pi.display_order, pi.is_cover, pi.width, pi.height, pi.alt_text
from property_images pi
where pi.property_id in (select id from public_properties);

grant select on public_property_images to anon, authenticated;

create view public_property_features
with (security_barrier = true) as
select pf.property_id, f.id as feature_id, f.name, f.category, f.slug
from property_features pf
join features f on f.id = pf.feature_id
where pf.property_id in (select id from public_properties);

grant select on public_property_features to anon, authenticated;

create view public_property_custom_features
with (security_barrier = true) as
select pcf.id, pcf.property_id, pcf.name
from property_custom_features pcf
where pcf.property_id in (select id from public_properties);

grant select on public_property_custom_features to anon, authenticated;

create view public_property_agents
with (security_barrier = true) as
select pa.id, pa.property_id, pa.name, pa.brokerage, pa.email, pa.phone
from property_agents pa
where pa.show_contact_publicly = true
  and pa.property_id in (select id from public_properties);

grant select on public_property_agents to anon, authenticated;

-- An open house is only ever public when its property exposes a
-- full public address and the property itself is publicly visible.
create view public_open_houses
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
  pp.title as property_title
from open_houses oh
join public_properties pp on pp.id = oh.property_id
where oh.status = 'scheduled'
  and pp.address_visibility = 'full';

grant select on public_open_houses to anon, authenticated;
