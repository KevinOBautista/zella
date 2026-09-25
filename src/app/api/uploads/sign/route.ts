import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSellerForApi, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/auth/session";
import { limits } from "@/config/limits";

export async function POST(request: Request) {
  const auth = await getSellerForApi();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { seller } = auth;

  const { propertyId, filename } = (await request.json()) as { propertyId?: string; filename?: string };

  if (!propertyId || !filename) {
    return NextResponse.json({ error: "propertyId and filename are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, seller_id")
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError) return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 503 });
  if (!property || property.seller_id !== seller.id) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const { count, error: countError } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);
  if (countError) return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 503 });
  if ((count ?? 0) >= limits.property.maxPhotos) {
    return NextResponse.json({ error: `Maximum of ${limits.property.maxPhotos} photos per property` }, { status: 400 });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${propertyId}/${crypto.randomUUID()}-${safeName}`;

  const { data, error } = await supabase.storage.from("property-uploads-raw").createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  return NextResponse.json({ path: data.path, token: data.token, signedUrl: data.signedUrl });
}
