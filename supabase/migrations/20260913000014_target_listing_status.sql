-- Step 2 of the listing wizard used to write listing_status directly. Because
-- public_properties filters only on listing_status, that made a property
-- public before any publish checks ran (address, photos, price,
-- acknowledgement, listing limit), and change_property_status then rejected
-- the real publish as a for_sale -> for_sale transition. The seller's chosen
-- status now lives here until change_property_status publishes the listing.
alter table properties
  add column target_listing_status property_status
  check (target_listing_status in ('coming_soon', 'for_sale'));

-- Repair rows the old step 2 flipped to a public status without publishing.
update properties
set target_listing_status = listing_status,
    listing_status = 'draft',
    updated_at = now()
where published_at is null
  and listing_status in ('coming_soon', 'for_sale');
