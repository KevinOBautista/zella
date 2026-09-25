export type FollowNotificationPrefs = {
  notifyNewProperties: boolean;
  notifyComingSoon: boolean;
  notifyOpenHouses: boolean;
};

export type FollowerNotifiableEvent =
  | "new_property"
  | "coming_soon_property"
  | "open_house_created"
  | "open_house_updated"
  | "open_house_cancelled";

/** Only notify a follower for the event kinds they opted into. */
export function shouldNotifyFollower(
  pref: FollowNotificationPrefs,
  eventKind: FollowerNotifiableEvent,
): boolean {
  switch (eventKind) {
    case "new_property":
      return pref.notifyNewProperties;
    case "coming_soon_property":
      return pref.notifyComingSoon;
    case "open_house_created":
    case "open_house_updated":
    case "open_house_cancelled":
      return pref.notifyOpenHouses;
    default:
      return false;
  }
}
