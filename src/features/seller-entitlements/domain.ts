export type SellerEntitlement = {
  freeActiveListingLimit: number;
  additionalListingSlots: number;
};

/** Total capacity minus what's currently active, floored at 0. */
export function activeSlotsAvailable(entitlement: SellerEntitlement, currentActiveCount: number): number {
  const total = entitlement.freeActiveListingLimit + entitlement.additionalListingSlots;
  return Math.max(0, total - currentActiveCount);
}

export function canActivateOneMore(entitlement: SellerEntitlement, currentActiveCount: number): boolean {
  return activeSlotsAvailable(entitlement, currentActiveCount) > 0;
}
