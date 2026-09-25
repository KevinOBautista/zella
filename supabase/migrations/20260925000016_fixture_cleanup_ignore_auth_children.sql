-- ============================================================================
-- admin_remove_dev_fixtures: ignore Supabase-managed auth tables in the
-- cross-link check. auth.identities, auth.sessions, auth.refresh_tokens,
-- auth.mfa_factors, auth.one_time_tokens and similar rows belong to the
-- account and are removed with it when the Admin API deletes the user, so
-- they must not block the cleanup (015 treated them as outside references).
-- The function is otherwise unchanged from 20260915000015_demo_content.sql.
-- ============================================================================

create or replace function admin_remove_dev_fixtures(p_manifest jsonb, p_operation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order text[] := array[
    'lead_activity', 'lead_notes', 'email_deliveries', 'notifications', 'admin_audit_logs', 'reports',
    'property_activity', 'property_saves', 'seller_follows', 'open_house_rsvps', 'inquiries',
    'property_images', 'open_houses', 'properties', 'seller_profiles'
  ];
  v_owned_children text[] := array[
    'property_features', 'property_custom_features', 'property_agents', 'seller_entitlements',
    'profiles', 'user_roles', 'notification_preferences'
  ];
  v_bad text;
  v_fk record;
  v_dst_ids uuid[];
  v_src_ids uuid[];
  v_has_id boolean;
  v_n bigint;
  v_problems text[] := '{}';
  v_result jsonb := '{}';
  v_table text;
  v_ids uuid[];
  v_row jsonb;
  v_exists boolean;
  v_matches boolean;
begin
  if not is_trusted_demo_writer() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select string_agg(distinct r ->> 'table', ', ') into v_bad
  from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r
  where not ((r ->> 'table') = any(v_order));
  if v_bad is not null then
    raise exception 'FIXTURE_TABLE_NOT_ALLOWED' using errcode = 'DM006', detail = v_bad;
  end if;

  -- Fingerprints (a missing row is treated as already removed, so reruns resume).
  for v_row in
    select r from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r
    union all
    select r || '{"table":"auth.users"}' from jsonb_array_elements(coalesce(p_manifest -> 'auth_users', '[]')) r
  loop
    v_table := v_row ->> 'table';
    execute format(
      'select true, date_trunc(''milliseconds'', created_at) = date_trunc(''milliseconds'', $2::timestamptz) from %s where id = $1',
      case when v_table = 'auth.users' then 'auth.users' else format('%I', v_table) end
    ) into v_exists, v_matches using (v_row ->> 'id')::uuid, v_row ->> 'created_at';
    if v_exists and not v_matches then
      raise exception 'FIXTURE_FINGERPRINT' using errcode = 'DM005', detail = v_table || ':' || (v_row ->> 'id');
    end if;
  end loop;

  -- Cross-link check across every single-column foreign key, except those from
  -- Supabase-managed auth tables (removed together with the account).
  for v_fk in
    select c.conrelid::regclass::text as src, a.attname as src_col,
           case when c.confrelid = 'auth.users'::regclass then 'auth.users' else c.confrelid::regclass::text end as dst,
           c.conrelid as src_oid
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
    join pg_class src_rel on src_rel.oid = c.conrelid
    where c.contype = 'f' and array_length(c.conkey, 1) = 1 and af.attname = 'id'
      and src_rel.relnamespace <> 'auth'::regnamespace
      and (c.confrelid = 'auth.users'::regclass or c.confrelid::regclass::text = any(v_order))
  loop
    if v_fk.dst = 'auth.users' then
      select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_dst_ids from jsonb_array_elements(coalesce(p_manifest -> 'auth_users', '[]')) r;
    else
      select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_dst_ids from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r where r ->> 'table' = v_fk.dst;
    end if;
    continue when cardinality(v_dst_ids) = 0;
    continue when v_fk.src = any(v_owned_children);

    select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_src_ids from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r where r ->> 'table' = v_fk.src;
    select exists (select 1 from pg_attribute where attrelid = v_fk.src_oid and attname = 'id' and not attisdropped) into v_has_id;

    execute format(
      'select count(*) from %s t where t.%I = any($1) and not (%s)',
      v_fk.src, v_fk.src_col, case when v_has_id then 't.id = any($2)' else 'false' end
    ) into v_n using v_dst_ids, v_src_ids;
    if v_n > 0 then
      v_problems := v_problems || format('%s rows in %s.%s reference %s', v_n, v_fk.src, v_fk.src_col, v_fk.dst);
    end if;
  end loop;
  if cardinality(v_problems) > 0 then
    raise exception 'FIXTURE_CROSS_LINKED' using errcode = 'DM004', detail = array_to_string(v_problems, '; ');
  end if;

  foreach v_table in array v_order loop
    select coalesce(array_agg((r ->> 'id')::uuid), '{}') into v_ids
    from jsonb_array_elements(coalesce(p_manifest -> 'rows', '[]')) r where r ->> 'table' = v_table;
    continue when cardinality(v_ids) = 0;
    execute format('delete from %I where id = any($1)', v_table) using v_ids;
    get diagnostics v_n = row_count;
    v_result := v_result || jsonb_build_object(v_table, v_n);
  end loop;

  insert into demo_storage_ledger (operation_id, dataset, bucket, path, sha256, state)
  select p_operation_id, 'dev-fixtures-hosted', s ->> 'bucket', s ->> 'path', null, 'delete_pending'
  from jsonb_array_elements(coalesce(p_manifest -> 'storage', '[]')) s
  on conflict (bucket, path) do update set state = 'delete_pending', operation_id = excluded.operation_id, updated_at = now()
    where demo_storage_ledger.state <> 'deleted';
  get diagnostics v_n = row_count;

  return jsonb_build_object('deleted', v_result, 'storage_delete_pending', v_n);
end;
$$;

revoke execute on function admin_remove_dev_fixtures(jsonb, uuid) from public, anon, authenticated;
grant execute on function admin_remove_dev_fixtures(jsonb, uuid) to service_role;
