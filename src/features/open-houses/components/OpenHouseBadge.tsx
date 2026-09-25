import { Badge } from "@/components/ui/badge";
import { formatOpenHouseBadge } from "@/features/open-houses/format";

export function OpenHouseBadge({ startsAt, endsAt, isDemo = false }: { startsAt: string; endsAt: string; isDemo?: boolean }) {
  return (
    <Badge variant="onImage" title={isDemo ? "Demo event. No in-person open house is scheduled." : undefined}>
      {isDemo ? "DEMO · " : ""}
      {formatOpenHouseBadge(startsAt, endsAt)}
    </Badge>
  );
}
