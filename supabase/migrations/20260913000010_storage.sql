-- ============================================================================
-- Storage buckets. Path convention: "<property_id>/<file>" for property
-- buckets (no user email or seller id in the path), and
-- "<user_id>/<file>" for avatars.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-uploads-raw', 'property-uploads-raw', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('property-images', 'property-images', true, 8388608, array['image/webp']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- property-uploads-raw: private. Only the owning seller (or admin) may
-- upload/read/delete, matched by the property_id path segment. The
-- processing route reads via the service role (which bypasses RLS anyway)
-- and deletes the raw object once it has produced a processed copy.
create policy property_uploads_raw_owner_all on storage.objects for all to authenticated
  using (
    bucket_id = 'property-uploads-raw'
    and exists (
      select 1 from properties p
      where p.id::text = (storage.foldername(name))[1]
        and (is_own_seller(p.seller_id) or is_admin())
    )
  )
  with check (
    bucket_id = 'property-uploads-raw'
    and exists (
      select 1 from properties p
      where p.id::text = (storage.foldername(name))[1]
        and (is_own_seller(p.seller_id) or is_admin())
    )
  );

-- property-images: public read (these are the redacted, processed
-- photos referenced by public_property_images). Writes only ever happen
-- through the service role from the image-processing route, which
-- bypasses RLS — no authenticated/anon write policy is granted here.
create policy property_images_bucket_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'property-images');

-- avatars: public read; a user may only write into their own folder.
create policy avatars_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
create policy avatars_owner_write on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
