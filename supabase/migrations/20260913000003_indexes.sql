-- Single cover image per property
create unique index property_images_one_cover_idx on property_images(property_id) where is_cover;

-- Case-insensitive username uniqueness is native via citext's unique constraint already.

-- One active (confirmed) RSVP per email per open house
create unique index open_house_rsvps_active_email_idx
  on open_house_rsvps(open_house_id, lower(email::text)) where status = 'confirmed';

-- properties
create index properties_seller_id_idx on properties(seller_id);
create index properties_listing_status_idx on properties(listing_status);
create index properties_moderation_status_idx on properties(moderation_status);
create index properties_city_idx on properties(city);
create index properties_state_idx on properties(state);
create index properties_postal_code_idx on properties(postal_code);
create index properties_published_at_idx on properties(published_at);
create index properties_asking_price_cents_idx on properties(asking_price_cents);
create index properties_slug_idx on properties(slug);

-- seller_profiles
create index seller_profiles_status_idx on seller_profiles(status);
create index seller_profiles_city_idx on seller_profiles(city);
create index seller_profiles_state_idx on seller_profiles(state);

-- open_houses
create index open_houses_property_id_idx on open_houses(property_id);
create index open_houses_seller_id_idx on open_houses(seller_id);
create index open_houses_starts_at_idx on open_houses(starts_at);
create index open_houses_status_idx on open_houses(status);

-- inquiries
create index inquiries_seller_id_idx on inquiries(seller_id);
create index inquiries_property_id_idx on inquiries(property_id);
create index inquiries_lead_status_idx on inquiries(lead_status);
create index inquiries_created_at_idx on inquiries(created_at desc);

-- notifications
create index notifications_user_id_idx on notifications(user_id);
create index notifications_read_at_idx on notifications(read_at);
create index notifications_created_at_idx on notifications(created_at desc);

-- reports
create index reports_status_idx on reports(status);
create index reports_created_at_idx on reports(created_at desc);

-- property_images / follows / saves lookups
create index property_images_property_id_idx on property_images(property_id, display_order);
create index seller_follows_follower_idx on seller_follows(follower_user_id);
create index seller_follows_seller_idx on seller_follows(seller_id);
create index property_saves_user_idx on property_saves(user_id);

-- rate limiting: fast recent-hits lookup per bucket
create index rate_limit_hits_bucket_created_idx on rate_limit_hits(bucket_key, created_at desc);

-- lead notes / activity
create index lead_notes_inquiry_id_idx on lead_notes(inquiry_id);
create index lead_activity_inquiry_id_idx on lead_activity(inquiry_id, created_at desc);

-- admin audit log
create index admin_audit_logs_created_at_idx on admin_audit_logs(created_at desc);
create index admin_audit_logs_entity_idx on admin_audit_logs(entity_type, entity_id);

-- property_activity
create index property_activity_property_id_idx on property_activity(property_id, created_at desc);

-- full-text-ish search helper for city/address matching
create index properties_city_trgm_idx on properties using gin (city gin_trgm_ops);
