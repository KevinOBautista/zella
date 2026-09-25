import { describe, expect, it } from "vitest";
import { shouldNotifyFollower } from "@/features/notifications/preferences";

const allOn = { notifyNewProperties: true, notifyComingSoon: true, notifyOpenHouses: true };
const allOff = { notifyNewProperties: false, notifyComingSoon: false, notifyOpenHouses: false };

describe("shouldNotifyFollower", () => {
  it("notifies for new_property only when notifyNewProperties is on", () => {
    expect(shouldNotifyFollower(allOn, "new_property")).toBe(true);
    expect(shouldNotifyFollower(allOff, "new_property")).toBe(false);
  });

  it("notifies for coming_soon_property only when notifyComingSoon is on", () => {
    expect(shouldNotifyFollower(allOn, "coming_soon_property")).toBe(true);
    expect(shouldNotifyFollower(allOff, "coming_soon_property")).toBe(false);
  });

  it("gates all open-house event kinds on notifyOpenHouses", () => {
    expect(shouldNotifyFollower(allOn, "open_house_created")).toBe(true);
    expect(shouldNotifyFollower(allOn, "open_house_updated")).toBe(true);
    expect(shouldNotifyFollower(allOn, "open_house_cancelled")).toBe(true);
    expect(shouldNotifyFollower(allOff, "open_house_created")).toBe(false);
  });

  it("open-house prefs do not leak into property notifications", () => {
    const openHousesOnly = { ...allOff, notifyOpenHouses: true };
    expect(shouldNotifyFollower(openHousesOnly, "new_property")).toBe(false);
  });
});
