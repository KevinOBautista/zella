import { publicEnv } from "@/config/publicEnv";
import { isFixtureMode } from "@/config/runtime";

export function propertyImageUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  // Fixture mode serves the committed demo photos copied at build time.
  if (isFixtureMode) return `/preview-fixtures/${storagePath}`;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${storagePath}`;
}

export function avatarUrl(storagePath: string | null): string | null {
  if (!storagePath || isFixtureMode) return null;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${storagePath}`;
}
