const TIMEZONE = "America/New_York";

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TIMEZONE });
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIMEZONE,
});

/** e.g. "OPEN HOUSE SUN 1–4 PM". */
export function formatOpenHouseBadge(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = dayFormatter.format(start).toUpperCase();
  const startTime = timeFormatter.format(start).replace(" ", "").toUpperCase();
  const endTime = timeFormatter.format(end).replace(" ", "").toUpperCase();
  const endMeridiem = endTime.match(/[AP]M$/)?.[0] ?? "";
  const startMeridiem = startTime.match(/[AP]M$/)?.[0] ?? "";
  const startLabel =
    startMeridiem === endMeridiem ? startTime.replace(/[AP]M$/, "") : startTime;
  return `OPEN HOUSE ${day} ${startLabel}–${endTime}`;
}

export function formatOpenHouseDateTime(startsAt: string, endsAt: string): string {
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TIMEZONE,
  });
  const start = new Date(startsAt);
  return `${dateFmt.format(start)}, ${timeFormatter.format(start)} – ${timeFormatter.format(new Date(endsAt))}`;
}

/** Full date/time with the local time zone label, e.g. for a single-event card on /open-houses. */
export function formatOpenHouseDateTimeZoned(startsAt: string, endsAt: string, zoneLabel = "ET"): string {
  return `${formatOpenHouseDateTime(startsAt, endsAt)} ${zoneLabel}`;
}

/** e.g. "Sun, Sep 20 · 1–4 PM" — compact card line for upcoming open houses. */
export function formatOpenHouseShort(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: TIMEZONE }).format(start);
  const startTime = timeFormatter.format(start).replace(/:00(?= [AP]M)/, "");
  const endTime = timeFormatter.format(end).replace(/:00(?= [AP]M)/, "");
  const startMeridiem = startTime.match(/[AP]M$/)?.[0];
  const endMeridiem = endTime.match(/[AP]M$/)?.[0];
  const startLabel = startMeridiem === endMeridiem ? startTime.replace(/ [AP]M$/, "") : startTime;
  return `${date} · ${startLabel}–${endTime}`;
}
