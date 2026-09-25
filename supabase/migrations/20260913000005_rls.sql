-- ============================================================================
-- Row Level Security. Deny-by-default: enabling RLS with no matching policy
-- for a role means that role gets zero rows. Public/guest reads of
-- properties, open houses, and seller profiles are intentionally NOT
-- granted here — they go through the security-definer views in the next
-- migration, which redact private columns before anon/authenticated ever
-- see them (see docs/architecture.md).
-- ============================================================================

alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table seller_profiles enable row level security;
alter table seller_entitlements enable row level security;
alter table properties enable row level security;
alter table property_images enable row level security;
alter table property_agents enable row level security;
alter table features enable row level security;
alter table property_features enable row level security;
alter table property_custom_features enable row level security;
alter table seller_follows enable row level security;
alter table property_saves enable row level security;
alter table open_houses enable row level security;
alter table open_house_rsvps enable row level security;
alter table inquiries enable row level security;
alter table lead_notes enable row level security;
alter table lead_activity enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table reports enable row level security;
alter table property_activity enable row level security;
alter table email_deliveries enable row level security;
alter table admin_audit_logs enable row level security;
alter table reserved_usernames enable row level security;
alter table rate_limit_hits enable row level security;

-- profiles ------------------------------------------------------------------
create policy profiles_select_own on profiles for select using (user_id = auth.uid() or is_admin());
create policy profiles_update_own on profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_admin_all on profiles for all using (is_admin()) with check (is_admin());

-- user_roles ------------------------------------------------------------------
create policy user_roles_select_own on user_roles for select using (user_id = auth.uid() or is_admin());
create policy user_roles_admin_write on user_roles for insert with check (is_admin());
create policy user_roles_admin_update on user_roles for update using (is_admin()) with check (is_admin());
create policy user_roles_admin_delete on user_roles for delete using (is_admin());

-- seller_profiles -------------------------------------------------------------
create policy seller_profiles_select_own on seller_profiles for select using (user_id = auth.uid() or is_admin());
create policy seller_profiles_insert_own on seller_profiles for insert with check (user_id = auth.uid());
create policy seller_profiles_update_own on seller_profiles for update using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());

-- seller_entitlements -----------------------------------------------------
create policy seller_entitlements_select_own on seller_entitlements for select using (is_own_seller(seller_id) or is_admin());
create policy seller_entitlements_admin_write on seller_entitlements for update using (is_admin()) with check (is_admin());

-- properties ----------------------------------------------------------------
create policy properties_select_own on properties for select using (is_own_seller(seller_id) or is_admin());
create policy properties_insert_own on properties for insert with check (is_own_seller(seller_id));
create policy properties_update_own on properties for update using (is_own_seller(seller_id) or is_admin()) with check (is_own_seller(seller_id) or is_admin());
create policy properties_delete_own on properties for delete using (is_own_seller(seller_id) or is_admin());

-- property_images -------------------------------------------------------------
create policy property_images_select_own on property_images for select using (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
);
create policy property_images_write_own on property_images for all using (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
) with check (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
);

-- property_agents ---------------------------------------------------------
create policy property_agents_select_own on property_agents for select using (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
);
create policy property_agents_write_own on property_agents for all using (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
) with check (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
);

-- features (public read-only taxonomy) ---------------------------------------
create policy features_select_all on features for select to anon, authenticated using (true);
create policy features_admin_write on features for all using (is_admin()) with check (is_admin());

-- property_features / property_custom_features -------------------------------
create policy property_features_owner on property_features for all using (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
) with check (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
);
create policy property_custom_features_owner on property_custom_features for all using (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
) with check (
  exists (select 1 from properties p where p.id = property_id and (is_own_seller(p.seller_id) or is_admin()))
);

-- seller_follows --------------------------------------------------------------
create policy seller_follows_owner on seller_follows for all using (follower_user_id = auth.uid() or is_admin())
  with check (follower_user_id = auth.uid() or is_admin());

-- property_saves ----------------------------------------------------------
create policy property_saves_owner on property_saves for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- open_houses -----------------------------------------------------------------
create policy open_houses_select_own on open_houses for select using (is_own_seller(seller_id) or is_admin());
create policy open_houses_write_own on open_houses for all using (is_own_seller(seller_id) or is_admin())
  with check (is_own_seller(seller_id) or is_admin());

-- open_house_rsvps --------------------------------------------------------
create policy open_house_rsvps_select on open_house_rsvps for select using (
  user_id = auth.uid()
  or is_admin()
  or exists (select 1 from open_houses oh where oh.id = open_house_id and is_own_seller(oh.seller_id))
);
create policy open_house_rsvps_update on open_house_rsvps for update using (
  user_id = auth.uid()
  or is_admin()
  or exists (select 1 from open_houses oh where oh.id = open_house_id and is_own_seller(oh.seller_id))
) with check (
  user_id = auth.uid()
  or is_admin()
  or exists (select 1 from open_houses oh where oh.id = open_house_id and is_own_seller(oh.seller_id))
);

-- inquiries -----------------------------------------------------------------
create policy inquiries_select on inquiries for select using (
  is_own_seller(seller_id) or is_admin() or user_id = auth.uid()
);
create policy inquiries_update_seller on inquiries for update using (is_own_seller(seller_id) or is_admin())
  with check (is_own_seller(seller_id) or is_admin());

-- lead_notes / lead_activity: seller-private, never visible to buyers ---------
create policy lead_notes_owner on lead_notes for all using (is_own_seller(seller_id) or is_admin())
  with check (is_own_seller(seller_id) or is_admin());
create policy lead_activity_select on lead_activity for select using (is_own_seller(seller_id) or is_admin());
create policy lead_activity_insert on lead_activity for insert with check (is_own_seller(seller_id) or is_admin());

-- notifications / notification_preferences -------------------------------
create policy notifications_select_own on notifications for select using (user_id = auth.uid() or is_admin());
create policy notifications_update_own on notifications for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy notification_preferences_owner on notification_preferences for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- reports: admin-only read; writes always go through the service role after
-- server-side validation, never a direct authenticated/anon insert policy.
create policy reports_admin_all on reports for all using (is_admin()) with check (is_admin());

-- property_activity -----------------------------------------------------------
create policy property_activity_select on property_activity for select using (is_own_seller(seller_id) or is_admin());

-- email_deliveries: admin-only, never exposed to sellers or buyers
create policy email_deliveries_admin_only on email_deliveries for select using (is_admin());

-- admin_audit_logs: admin-readable, insert-only (no update/delete policy at all)
create policy admin_audit_logs_select on admin_audit_logs for select using (is_admin());
create policy admin_audit_logs_insert on admin_audit_logs for insert with check (is_admin());

-- reserved_usernames: harmless public lookup
create policy reserved_usernames_select_all on reserved_usernames for select to anon, authenticated using (true);
