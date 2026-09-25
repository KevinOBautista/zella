-- ============================================================================
-- Transactional RPCs. SECURITY DEFINER so each can lock/read rows the
-- calling user's own RLS grants wouldn't otherwise allow (e.g. locking
-- seller_entitlements while counting a competitor row), but every one of
-- them re-derives the caller's identity from auth.uid() and re-checks
-- ownership/role internally — never trust a client-submitted seller_id.
-- ============================================================================

create or replace function check_rate_limit(p_bucket_key text, p_window_seconds int, p_max_hits int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from rate_limit_hits where created_at < now() - make_interval(secs => greatest(p_window_seconds * 4, 3600));
  select count(*) into v_count from rate_limit_hits
    where bucket_key = p_bucket_key and created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_max_hits then
    return false;
  end if;
  insert into rate_limit_hits (bucket_key) values (p_bucket_key);
  return true;
end;
$$;
grant execute on function check_rate_limit(text, int, int) to anon, authenticated, service_role;


create or replace function change_property_status(
  p_property_id uuid,
  p_target_status property_status,
  p_sold_price_cents bigint default null
)
returns properties
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property properties%rowtype;
  v_old_status property_status;
  v_seller seller_profiles%rowtype;
  v_active_count int;
  v_entitlement seller_entitlements%rowtype;
  v_photo_count int;
  v_is_first_publish boolean;
  v_slug_base text;
  v_slug text;
begin
  select * into v_property from properties where id = p_property_id for update;
  if not found then
    raise exception 'property not found' using errcode = 'P0002';
  end if;
  v_old_status := v_property.listing_status;

  if not (is_own_seller(v_property.seller_id) or is_admin()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into v_seller from seller_profiles where id = v_property.seller_id;
  if v_seller.status <> 'active' and not is_admin() then
    raise exception 'seller account is suspended' using errcode = '42501';
  end if;

  if not (
    (v_old_status = 'draft' and p_target_status in ('coming_soon','for_sale')) or
    (v_old_status = 'coming_soon' and p_target_status in ('for_sale','paused','archived')) or
    (v_old_status = 'for_sale' and p_target_status in ('under_contract','sold','paused','archived')) or
    (v_old_status = 'under_contract' and p_target_status in ('for_sale','sold','paused','archived')) or
    (v_old_status = 'paused' and p_target_status in ('coming_soon','for_sale','under_contract','archived')) or
    (v_old_status = 'sold' and p_target_status = 'archived')
  ) then
    raise exception 'cannot transition from % to %', v_old_status, p_target_status
      using errcode = '22023';
  end if;

  if p_target_status in ('coming_soon','for_sale','under_contract')
     and v_old_status not in ('coming_soon','for_sale','under_contract') then
    select * into v_entitlement from seller_entitlements where seller_id = v_property.seller_id for update;
    select count(*) into v_active_count from properties
      where seller_id = v_property.seller_id
        and id <> p_property_id
        and listing_status in ('coming_soon','for_sale','under_contract');
    if v_active_count + 1 > (v_entitlement.free_active_listing_limit + v_entitlement.additional_listing_slots) then
      raise exception 'active listing limit reached' using errcode = 'P0001', hint = 'listing_limit_reached';
    end if;
  end if;

  v_is_first_publish := v_property.published_at is null and p_target_status in ('coming_soon','for_sale');
  if v_is_first_publish then
    if v_property.address_line_1 = '' or v_property.city = '' or v_property.state = '' or v_property.postal_code = '' then
      raise exception 'address is incomplete' using errcode = '22023', hint = 'address_incomplete';
    end if;
    if v_property.publish_acknowledged_at is null then
      raise exception 'publish acknowledgement is required' using errcode = '22023', hint = 'ack_required';
    end if;
    select count(*) into v_photo_count from property_images where property_id = p_property_id;
    if v_photo_count < 1 then
      raise exception 'at least one photo is required' using errcode = '22023', hint = 'photos_required';
    end if;
    if v_property.pricing_type = 'asking_price' and (v_property.asking_price_cents is null or v_property.asking_price_cents <= 0) then
      raise exception 'asking price is required' using errcode = '22023', hint = 'price_required';
    end if;
    if v_property.pricing_type = 'expected_range' and (v_property.expected_price_min_cents is null or v_property.expected_price_max_cents is null) then
      raise exception 'expected price range is required' using errcode = '22023', hint = 'price_required';
    end if;
  end if;

  if v_property.slug is null and p_target_status in ('coming_soon','for_sale') then
    v_slug_base := trim(both '-' from regexp_replace(lower(v_property.address_line_1 || ' ' || v_property.city || ' ' || v_property.state), '[^a-z0-9]+', '-', 'g'));
    v_slug := v_slug_base;
    while exists (select 1 from properties where slug = v_slug and id <> p_property_id) loop
      v_slug := v_slug_base || '-' || floor(random() * 9000 + 1000)::int;
    end loop;
  else
    v_slug := v_property.slug;
  end if;

  update properties set
    paused_from_status = case
      when p_target_status = 'paused' then v_old_status
      when v_old_status = 'paused' then null
      else paused_from_status
    end,
    listing_status = p_target_status,
    slug = v_slug,
    published_at = case when v_property.published_at is null and p_target_status in ('coming_soon','for_sale') then now() else v_property.published_at end,
    sold_price_cents = case when p_target_status = 'sold' then coalesce(p_sold_price_cents, sold_price_cents) else sold_price_cents end,
    updated_at = now()
  where id = p_property_id
  returning * into v_property;

  insert into property_activity (property_id, seller_id, event_type, metadata, created_by)
  values (
    p_property_id,
    v_property.seller_id,
    case
      when p_target_status = 'sold' then 'property_sold'
      when p_target_status = 'paused' then 'property_paused'
      when p_target_status = 'archived' then 'property_archived'
      when v_is_first_publish then 'property_published'
      else 'status_changed'
    end,
    jsonb_build_object('from', v_old_status, 'to', p_target_status),
    auth.uid()
  );

  return v_property;
end;
$$;
grant execute on function change_property_status(uuid, property_status, bigint) to authenticated;


create or replace function cancel_open_house(p_open_house_id uuid, p_reason text default null)
returns open_houses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_house open_houses%rowtype;
begin
  select * into v_open_house from open_houses where id = p_open_house_id for update;
  if not found then
    raise exception 'open house not found' using errcode = 'P0002';
  end if;
  if not (is_own_seller(v_open_house.seller_id) or is_admin()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_open_house.status <> 'scheduled' then
    raise exception 'open house is already cancelled' using errcode = '22023';
  end if;

  update open_houses set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    updated_at = now()
  where id = p_open_house_id
  returning * into v_open_house;

  insert into property_activity (property_id, seller_id, event_type, metadata, created_by)
  values (v_open_house.property_id, v_open_house.seller_id, 'open_house_cancelled', jsonb_build_object('open_house_id', p_open_house_id), auth.uid());

  return v_open_house;
end;
$$;
grant execute on function cancel_open_house(uuid, text) to authenticated;


create or replace function update_lead_status(p_inquiry_id uuid, p_new_status lead_status)
returns inquiries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inquiry inquiries%rowtype;
  v_old_status lead_status;
begin
  select * into v_inquiry from inquiries where id = p_inquiry_id for update;
  if not found then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  if not (is_own_seller(v_inquiry.seller_id) or is_admin()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  v_old_status := v_inquiry.lead_status;
  if v_old_status = p_new_status then
    return v_inquiry;
  end if;

  update inquiries set lead_status = p_new_status, updated_at = now()
  where id = p_inquiry_id
  returning * into v_inquiry;

  insert into lead_activity (inquiry_id, seller_id, activity_type, previous_value, new_value, created_by)
  values (p_inquiry_id, v_inquiry.seller_id, 'status_changed', v_old_status::text, p_new_status::text, auth.uid());

  return v_inquiry;
end;
$$;
grant execute on function update_lead_status(uuid, lead_status) to authenticated;


create or replace function add_lead_note(p_inquiry_id uuid, p_note text)
returns lead_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_note lead_notes%rowtype;
begin
  select seller_id into v_seller_id from inquiries where id = p_inquiry_id;
  if v_seller_id is null then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  if not (is_own_seller(v_seller_id) or is_admin()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into lead_notes (inquiry_id, seller_id, note) values (p_inquiry_id, v_seller_id, p_note)
  returning * into v_note;

  insert into lead_activity (inquiry_id, seller_id, activity_type, new_value, created_by)
  values (p_inquiry_id, v_seller_id, 'note_added', left(p_note, 200), auth.uid());

  return v_note;
end;
$$;
grant execute on function add_lead_note(uuid, text) to authenticated;


create or replace function admin_set_property_moderation(p_property_id uuid, p_status moderation_status)
returns properties
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property properties%rowtype;
  v_old moderation_status;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v_property from properties where id = p_property_id for update;
  if not found then
    raise exception 'property not found' using errcode = 'P0002';
  end if;
  v_old := v_property.moderation_status;

  update properties set moderation_status = p_status, updated_at = now()
  where id = p_property_id
  returning * into v_property;

  insert into admin_audit_logs (admin_user_id, action, entity_type, entity_id, previous_value, new_value)
  values (auth.uid(), 'property_moderation_changed', 'property', p_property_id,
    jsonb_build_object('moderation_status', v_old), jsonb_build_object('moderation_status', p_status));

  return v_property;
end;
$$;
grant execute on function admin_set_property_moderation(uuid, moderation_status) to authenticated;


create or replace function admin_set_seller_status(p_seller_id uuid, p_status seller_status)
returns seller_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller seller_profiles%rowtype;
  v_old seller_status;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v_seller from seller_profiles where id = p_seller_id for update;
  if not found then
    raise exception 'seller not found' using errcode = 'P0002';
  end if;
  v_old := v_seller.status;

  update seller_profiles set status = p_status, updated_at = now()
  where id = p_seller_id
  returning * into v_seller;

  insert into admin_audit_logs (admin_user_id, action, entity_type, entity_id, previous_value, new_value)
  values (auth.uid(), 'seller_status_changed', 'seller_profile', p_seller_id,
    jsonb_build_object('status', v_old), jsonb_build_object('status', p_status));

  return v_seller;
end;
$$;
grant execute on function admin_set_seller_status(uuid, seller_status) to authenticated;


create or replace function admin_grant_listing_slots(p_seller_id uuid, p_additional_slots int)
returns seller_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement seller_entitlements%rowtype;
  v_old int;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v_entitlement from seller_entitlements where seller_id = p_seller_id for update;
  if not found then
    raise exception 'seller entitlement not found' using errcode = 'P0002';
  end if;
  v_old := v_entitlement.additional_listing_slots;

  update seller_entitlements set additional_listing_slots = p_additional_slots, updated_at = now()
  where seller_id = p_seller_id
  returning * into v_entitlement;

  insert into admin_audit_logs (admin_user_id, action, entity_type, entity_id, previous_value, new_value)
  values (auth.uid(), 'listing_entitlement_changed', 'seller_entitlement', p_seller_id,
    jsonb_build_object('additional_listing_slots', v_old), jsonb_build_object('additional_listing_slots', p_additional_slots));

  return v_entitlement;
end;
$$;
grant execute on function admin_grant_listing_slots(uuid, int) to authenticated;


create or replace function admin_resolve_report(p_report_id uuid, p_status report_status, p_note text default null)
returns reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report reports%rowtype;
  v_old report_status;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v_report from reports where id = p_report_id for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;
  v_old := v_report.status;

  update reports set
    status = p_status,
    admin_resolution_note = coalesce(p_note, admin_resolution_note),
    resolved_at = case when p_status in ('resolved','dismissed') then now() else resolved_at end,
    resolved_by = case when p_status in ('resolved','dismissed') then auth.uid() else resolved_by end
  where id = p_report_id
  returning * into v_report;

  insert into admin_audit_logs (admin_user_id, action, entity_type, entity_id, previous_value, new_value)
  values (auth.uid(), 'report_status_changed', 'report', p_report_id,
    jsonb_build_object('status', v_old), jsonb_build_object('status', p_status));

  return v_report;
end;
$$;
grant execute on function admin_resolve_report(uuid, report_status, text) to authenticated;
