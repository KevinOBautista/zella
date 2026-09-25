import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSeller } from "@/lib/auth/session";
import { WizardProgress } from "@/features/properties/components/WizardProgress";
import { Step1Property } from "@/features/properties/components/wizard-steps/Step1Property";
import { Step2SaleStatus } from "@/features/properties/components/wizard-steps/Step2SaleStatus";
import { Step3Details } from "@/features/properties/components/wizard-steps/Step3Details";
import { Step4Price } from "@/features/properties/components/wizard-steps/Step4Price";
import { Step5Description } from "@/features/properties/components/wizard-steps/Step5Description";
import { Step6Photos } from "@/features/properties/components/wizard-steps/Step6Photos";
import { Step7Review } from "@/features/properties/components/wizard-steps/Step7Review";

export const metadata: Metadata = { title: "Edit Property" };

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step: stepParam } = await searchParams;
  const step = Math.min(7, Math.max(1, Number(stepParam) || 1));

  const { seller, isSuspended } = await requireSeller();
  if (isSuspended) redirect("/dashboard");

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!property || property.seller_id !== seller.id) notFound();

  const [{ data: agent }, { data: allFeatures }, { data: selectedFeatures }, { data: customFeatures }, { data: images }] =
    await Promise.all([
      supabase.from("property_agents").select("*").eq("property_id", id).maybeSingle(),
      supabase.from("features").select("id, name, category"),
      supabase.from("property_features").select("feature_id").eq("property_id", id),
      supabase.from("property_custom_features").select("name").eq("property_id", id),
      supabase.from("property_images").select("id, storage_path, is_cover, display_order").eq("property_id", id).order("display_order"),
    ]);

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl">Edit Property</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        {property.address_line_1 || "New property"} {property.city && `— ${property.city}, ${property.state}`}
      </p>
      <WizardProgress propertyId={id} currentStep={step} />

      {step === 1 && <Step1Property propertyId={id} property={property} />}
      {step === 2 && <Step2SaleStatus propertyId={id} property={property} agent={agent ?? null} />}
      {step === 3 && <Step3Details propertyId={id} property={property} />}
      {step === 4 && <Step4Price propertyId={id} property={property} />}
      {step === 5 && (
        <Step5Description
          propertyId={id}
          property={property}
          allFeatures={allFeatures ?? []}
          selectedFeatureIds={(selectedFeatures ?? []).map((f) => f.feature_id)}
          customFeatures={(customFeatures ?? []).map((f) => f.name)}
        />
      )}
      {step === 6 && <Step6Photos propertyId={id} initialImages={images ?? []} />}
      {step === 7 && (
        <Step7Review
          propertyId={id}
          property={property}
          photoCount={images?.length ?? 0}
          coverImagePath={images?.find((i) => i.is_cover)?.storage_path ?? images?.[0]?.storage_path ?? null}
        />
      )}
    </div>
  );
}
