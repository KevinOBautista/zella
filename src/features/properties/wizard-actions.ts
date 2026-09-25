"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSeller } from "@/lib/auth/session";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  type Step1Values,
} from "@/features/properties/wizard-schemas";
import { canPublish } from "@/features/properties/domain";
import { notifyFollowersOfNewProperty } from "@/features/properties/notify";

export type StepSaveResult = { success: true } | { error: string; field?: string };
export type CreatePropertyResult = { success: true; propertyId: string } | { error: string; field?: string };

function step1Columns(v: Step1Values) {
  return {
    address_line_1: v.addressLine1,
    address_line_2: v.addressLine2 || null,
    city: v.city,
    state: v.state.toUpperCase(),
    postal_code: v.postalCode,
    county: v.county || null,
    property_type: v.propertyType,
    number_of_units: v.numberOfUnits ?? null,
    hoa_fee_cents: v.hoaFeeCents ?? null,
    wizard_last_step: 2,
  };
}

/** Step 1 of the "Add Property" flow: the row is only created once the seller submits real data. */
export async function createPropertyAction(raw: unknown): Promise<CreatePropertyResult> {
  const { seller, isSuspended } = await requireSeller();
  if (isSuspended) return { error: "Your account is suspended and cannot add listings." };

  const parsed = step1Schema.safeParse(raw);
  if (!parsed.success) return firstError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ seller_id: seller.id, listing_status: "draft", ...step1Columns(parsed.data) })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not create the property. Please try again." };

  revalidatePath("/dashboard/properties");
  return { success: true, propertyId: data.id };
}

export async function saveWizardStepAction(propertyId: string, step: number, raw: unknown): Promise<StepSaveResult> {
  const { seller } = await requireSeller();
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, seller_id, published_at")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property || property.seller_id !== seller.id) return { error: "Property not found" };

  if (step === 1) {
    const parsed = step1Schema.safeParse(raw);
    if (!parsed.success) return firstError(parsed.error);
    const { error } = await supabase.from("properties").update(step1Columns(parsed.data)).eq("id", propertyId);
    if (error) return { error: "Could not save. Please try again." };
  } else if (step === 2) {
    const parsed = step2Schema.safeParse(raw);
    if (!parsed.success) return firstError(parsed.error);
    const v = parsed.data;
    const { error } = await supabase
      .from("properties")
      .update({
        // Never write listing_status here: it is what makes a listing public, and
        // only change_property_status (run on publish) may move it. Before the
        // first publish we just record the seller's choice.
        ...(property.published_at === null && {
          target_listing_status: v.listingStatus === "draft" ? null : v.listingStatus,
        }),
        address_visibility: v.addressVisibility,
        sale_method: v.saleMethod,
        lead_recipient: v.leadRecipient,
        wizard_last_step: 3,
      })
      .eq("id", propertyId);
    if (error) return { error: "Could not save. Please try again." };

    if (v.saleMethod === "agent_assisted" && v.agentName) {
      await supabase.from("property_agents").delete().eq("property_id", propertyId);
      await supabase.from("property_agents").insert({
        property_id: propertyId,
        name: v.agentName,
        brokerage: v.agentBrokerage || null,
        email: v.agentEmail || null,
        phone: v.agentPhone || null,
      });
    } else {
      await supabase.from("property_agents").delete().eq("property_id", propertyId);
    }
  } else if (step === 3) {
    const parsed = step3Schema.safeParse(raw);
    if (!parsed.success) return firstError(parsed.error);
    const v = parsed.data;
    const { error } = await supabase
      .from("properties")
      .update({
        bedrooms: v.bedrooms ?? null,
        full_bathrooms: v.fullBathrooms ?? null,
        half_bathrooms: v.halfBathrooms ?? null,
        square_feet: v.squareFeet ?? null,
        lot_size: v.lotSize ?? null,
        lot_size_unit: v.lotSizeUnit ?? null,
        year_built: v.yearBuilt ?? null,
        stories: v.stories ?? null,
        parking_spaces: v.parkingSpaces ?? null,
        garage_spaces: v.garageSpaces ?? null,
        basement_type: v.basementType || null,
        heating_type: v.heatingType || null,
        cooling_type: v.coolingType || null,
        parking_type: v.parkingType || null,
        property_taxes_annual_cents: v.propertyTaxesAnnualCents ?? null,
        wizard_last_step: 4,
      })
      .eq("id", propertyId);
    if (error) return { error: "Could not save. Please try again." };
  } else if (step === 4) {
    const parsed = step4Schema.safeParse(raw);
    if (!parsed.success) return firstError(parsed.error);
    const v = parsed.data;
    const { error } = await supabase
      .from("properties")
      .update({
        pricing_type: v.pricingType,
        asking_price_cents: v.pricingType === "asking_price" ? (v.askingPriceCents ?? null) : null,
        expected_price_min_cents: v.pricingType === "expected_range" ? (v.expectedPriceMinCents ?? null) : null,
        expected_price_max_cents: v.pricingType === "expected_range" ? (v.expectedPriceMaxCents ?? null) : null,
        wizard_last_step: 5,
      })
      .eq("id", propertyId);
    if (error) return { error: "Could not save. Please try again." };
  } else if (step === 5) {
    const parsed = step5Schema.safeParse(raw);
    if (!parsed.success) return firstError(parsed.error);
    const v = parsed.data;
    const { error } = await supabase
      .from("properties")
      .update({
        title: v.title,
        description: v.description || null,
        video_url: v.videoUrl || null,
        virtual_tour_url: v.virtualTourUrl || null,
        wizard_last_step: 6,
      })
      .eq("id", propertyId);
    if (error) return { error: "Could not save. Please try again." };

    await supabase.from("property_features").delete().eq("property_id", propertyId);
    if (v.featureIds.length) {
      await supabase.from("property_features").insert(v.featureIds.map((featureId) => ({ property_id: propertyId, feature_id: featureId })));
    }
    await supabase.from("property_custom_features").delete().eq("property_id", propertyId);
    if (v.customFeatures.length) {
      await supabase
        .from("property_custom_features")
        .insert(v.customFeatures.map((name) => ({ property_id: propertyId, name })));
    }
  } else if (step === 6) {
    await supabase.from("properties").update({ wizard_last_step: 7 }).eq("id", propertyId);
  } else {
    return { error: "Invalid step" };
  }

  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  return { success: true };
}

function firstError(error: { issues: { message: string; path: (string | number)[] }[] }): { error: string; field?: string } {
  const issue = error.issues[0];
  return { error: issue?.message ?? "Invalid input", field: issue?.path[0] as string | undefined };
}

export type PublishResult =
  | { success: true }
  | { error: string; step?: number; field?: string };

export async function publishPropertyAction(
  propertyId: string,
  targetStatus: "for_sale" | "coming_soon",
  acknowledged: boolean,
): Promise<PublishResult> {
  const { seller, isSuspended } = await requireSeller();
  if (isSuspended) return { error: "Your account is suspended and cannot publish listings." };

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("*").eq("id", propertyId).maybeSingle();
  if (!property || property.seller_id !== seller.id) return { error: "Property not found" };

  const { count: photoCount } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const validation = canPublish({
    addressLine1: property.address_line_1,
    city: property.city,
    state: property.state,
    postalCode: property.postal_code,
    propertyType: property.property_type,
    listingStatus: targetStatus,
    pricingType: property.pricing_type,
    askingPriceCents: property.asking_price_cents,
    expectedPriceMinCents: property.expected_price_min_cents,
    expectedPriceMaxCents: property.expected_price_max_cents,
    photoCount: photoCount ?? 0,
    publishAcknowledged: acknowledged,
  });

  if (!validation.ok) {
    const first = validation.errors[0]!;
    return { error: first.message, field: first.field, step: fieldToStep(first.field) };
  }

  if (acknowledged && !property.publish_acknowledged_at) {
    await supabase.from("properties").update({ publish_acknowledged_at: new Date().toISOString() }).eq("id", propertyId);
  }

  const { error } = await supabase.rpc("change_property_status", {
    p_property_id: propertyId,
    p_target_status: targetStatus,
  });

  if (error) {
    if (error.hint === "listing_limit_reached" || error.message.includes("limit")) {
      return { error: "You have reached your five active property limit. Additional listing capacity will be available later." };
    }
    return { error: "Could not publish. Please try again." };
  }

  await supabase.from("properties").update({ target_listing_status: null }).eq("id", propertyId);

  // Only a first publish notifies followers, never a later edit.
  if (property.published_at === null) {
    try {
      const { data: publishedProperty } = await supabase.from("properties").select("slug").eq("id", propertyId).maybeSingle();
      await notifyFollowersOfNewProperty({
        sellerId: seller.id,
        propertyId,
        propertyTitle: property.title,
        addressLine1: property.address_line_1,
        city: property.city,
        slug: publishedProperty?.slug ?? null,
        kind: targetStatus,
      });
    } catch (err) {
      console.error("notifyFollowersOfNewProperty failed", err);
    }
  }

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${propertyId}`);
  return { success: true };
}

function fieldToStep(field: string): number {
  if (["addressLine1", "city", "state", "postalCode"].includes(field)) return 1;
  if (["askingPriceCents", "expectedPriceMinCents", "expectedPriceMaxCents"].includes(field)) return 4;
  if (field === "photos") return 6;
  return 7;
}
