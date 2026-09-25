import { Badge } from "@/components/ui/badge";
import { DEMO_COPY } from "@/features/demo/constants";
import { brand } from "@/config/brand";

/** Marks sample content. Shown alongside (never instead of) listing status. */
export function DemoBadge({ onImage = false, className }: { onImage?: boolean; className?: string }) {
  return (
    <Badge variant={onImage ? "onImage" : "neutral"} className={className} title={`Sample content created to show how ${brand.name} works`}>
      {DEMO_COPY.badge}
    </Badge>
  );
}
