import type { PropertyCardData } from "@/features/properties/components/PropertyCard";
import type { Tables } from "@/types/database";

export type OpenHouseRow = Tables<"public_open_houses">;
export type OpenHouseWithProperty = { openHouse: OpenHouseRow; property: PropertyCardData };

/**
 * Pairs each open house event with its property's card data (beds/baths/sqft,
 * listing status, seller, etc. — fields public_open_houses doesn't carry).
 * Events whose property can't be found (e.g. since deleted or hidden) are
 * dropped rather than shown incomplete. Multiple events for the same
 * property are kept as separate entries so every one stays reachable.
 */
export function mergeOpenHousesWithProperties(openHouses: OpenHouseRow[], properties: PropertyCardData[]): OpenHouseWithProperty[] {
  const byId = new Map(properties.map((p) => [p.id, p]));
  const merged: OpenHouseWithProperty[] = [];
  for (const openHouse of openHouses) {
    const property = openHouse.property_id ? byId.get(openHouse.property_id) : undefined;
    if (property) merged.push({ openHouse, property });
  }
  return merged;
}
