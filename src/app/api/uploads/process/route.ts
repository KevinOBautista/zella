import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSellerForApi, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/auth/session";
import { sniffImageType } from "@/lib/images/validateImage";

const MAX_DIMENSION = 2400;

function unavailable() {
  return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 503 });
}

export async function POST(request: Request) {
  const auth = await getSellerForApi();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { seller } = auth;

  const { propertyId, rawPath } = (await request.json()) as { propertyId?: string; rawPath?: string };

  if (!propertyId || !rawPath) {
    return NextResponse.json({ error: "propertyId and rawPath are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, seller_id")
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError) return unavailable();
  if (!property || property.seller_id !== seller.id) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  // The raw path is client-supplied: it must live under this property's folder.
  if (!rawPath.startsWith(`${propertyId}/`)) {
    return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: rawFile, error: downloadError } = await admin.storage.from("property-uploads-raw").download(rawPath);
  if (downloadError || !rawFile) {
    return NextResponse.json({ error: "Could not read uploaded file" }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await rawFile.arrayBuffer());

  // Never trust the claimed content-type — inspect the actual bytes.
  const sniffed = sniffImageType(inputBuffer);
  if (!sniffed) {
    await admin.storage.from("property-uploads-raw").remove([rawPath]);
    return NextResponse.json({ error: "Unsupported or invalid image file" }, { status: 400 });
  }

  let processed: Buffer;
  let width: number | undefined;
  let height: number | undefined;
  try {
    // .rotate() with no args auto-orients from EXIF, then the pipeline
    // re-encodes to WebP without carrying metadata forward — EXIF and any
    // embedded GPS coordinates are stripped by default.
    const pipeline = sharp(inputBuffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 });
    processed = await pipeline.toBuffer();
    const meta = await sharp(processed).metadata();
    width = meta.width;
    height = meta.height;
  } catch {
    await admin.storage.from("property-uploads-raw").remove([rawPath]);
    return NextResponse.json({ error: "Could not process this image" }, { status: 400 });
  }

  const processedPath = `${propertyId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await admin.storage
    .from("property-images")
    .upload(processedPath, processed, { contentType: "image/webp", upsert: false });
  if (uploadError) return unavailable();

  async function insertImageRow() {
    const { count, error: countError } = await admin
      .from("property_images")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId!);
    if (countError) return { row: null, error: countError };
    const { data, error } = await admin
      .from("property_images")
      .insert({
        property_id: propertyId!,
        storage_path: processedPath,
        display_order: count ?? 0,
        is_cover: (count ?? 0) === 0,
        width,
        height,
      })
      .select("*")
      .single();
    return { row: data, error };
  }

  // Supabase occasionally answers with a gateway timeout; one retry covers a transient blip.
  let result = await insertImageRow();
  if (result.error || !result.row) result = await insertImageRow();

  if (result.error || !result.row) {
    // Drop the orphaned processed copy but keep the raw upload so the client can retry processing.
    await admin.storage.from("property-images").remove([processedPath]);
    return unavailable();
  }

  await admin.storage.from("property-uploads-raw").remove([rawPath]);
  return NextResponse.json({ image: result.row });
}
