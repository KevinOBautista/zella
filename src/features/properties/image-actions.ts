"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/auth/session";

async function assertOwnsProperty(propertyId: string) {
  const { seller } = await requireSeller();
  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("id, seller_id").eq("id", propertyId).maybeSingle();
  if (!property || property.seller_id !== seller.id) throw new Error("Property not found");
  return supabase;
}

export async function reorderPropertyImagesAction(propertyId: string, orderedImageIds: string[]) {
  const supabase = await assertOwnsProperty(propertyId);
  await Promise.all(
    orderedImageIds.map((id, index) => supabase.from("property_images").update({ display_order: index }).eq("id", id).eq("property_id", propertyId)),
  );
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  return { success: true } as const;
}

export async function setCoverImageAction(propertyId: string, imageId: string) {
  const supabase = await assertOwnsProperty(propertyId);
  // Two sequential updates avoid violating the "one cover per property"
  // partial unique index — unset the old cover before setting the new one.
  await supabase.from("property_images").update({ is_cover: false }).eq("property_id", propertyId).eq("is_cover", true);
  const { error } = await supabase.from("property_images").update({ is_cover: true }).eq("id", imageId).eq("property_id", propertyId);
  if (error) return { error: "Could not set cover photo" };
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  return { success: true } as const;
}

export async function deletePropertyImageAction(propertyId: string, imageId: string) {
  const supabase = await assertOwnsProperty(propertyId);
  const { data: image } = await supabase.from("property_images").select("*").eq("id", imageId).eq("property_id", propertyId).maybeSingle();
  if (!image) return { error: "Image not found" };

  const admin = createAdminClient();
  await admin.storage.from("property-images").remove([image.storage_path]);
  await supabase.from("property_images").delete().eq("id", imageId);

  if (image.is_cover) {
    const { data: next } = await supabase
      .from("property_images")
      .select("id")
      .eq("property_id", propertyId)
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("property_images").update({ is_cover: true }).eq("id", next.id);
    }
  }

  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  return { success: true } as const;
}

export async function rotatePropertyImageAction(propertyId: string, imageId: string) {
  const supabase = await assertOwnsProperty(propertyId);
  const { data: image } = await supabase.from("property_images").select("*").eq("id", imageId).eq("property_id", propertyId).maybeSingle();
  if (!image) return { error: "Image not found" };

  const admin = createAdminClient();
  const { data: file, error: downloadError } = await admin.storage.from("property-images").download(image.storage_path);
  if (downloadError || !file) return { error: "Could not load image" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const rotated = await sharp(buffer).rotate(90).webp({ quality: 82 }).toBuffer();
  const meta = await sharp(rotated).metadata();

  const { error: uploadError } = await admin.storage.from("property-images").update(image.storage_path, rotated, {
    contentType: "image/webp",
    upsert: true,
  });
  if (uploadError) return { error: "Could not save rotated image" };

  await supabase.from("property_images").update({ width: meta.width, height: meta.height, updated_at: new Date().toISOString() }).eq("id", imageId);

  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  return { success: true } as const;
}
