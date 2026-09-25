import { addDays, isSameDay } from "date-fns";

/**
 * Open-house grouping needs to reason in the property's
 * launch timezone (America/New_York), not the server's or browser's local
 * time — a Postgres UTC timestamp near midnight can be "Saturday" in one
 * zone and "Sunday" in another.
 */

const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function zonedCalendarDay(date: Date, timeZone: string): { calendarDay: Date; weekdayIndex: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const weekdayIndex = WEEKDAY_ORDER.indexOf(get("weekday") as (typeof WEEKDAY_ORDER)[number]);
  // Represented as UTC noon on the zoned calendar date, purely so
  // date-fns day-level comparisons (isSameDay/addDays) behave correctly
  // without any further timezone conversion.
  return { calendarDay: new Date(Date.UTC(year, month - 1, day, 12)), weekdayIndex };
}

const GROUP_ORDER = ["This Week", "This Saturday", "This Sunday", "Next Weekend", "Later"] as const;

export function groupOpenHousesByDate<T extends { startsAt: Date }>(
  events: T[],
  now: Date,
  timeZone: string,
): { label: string; events: T[] }[] {
  const nowZoned = zonedCalendarDay(now, timeZone);
  const daysUntilSaturday = (6 - nowZoned.weekdayIndex + 7) % 7;
  const thisSaturday = addDays(nowZoned.calendarDay, daysUntilSaturday);
  const thisSunday = addDays(thisSaturday, 1);
  const nextSaturday = addDays(thisSaturday, 7);
  const nextSunday = addDays(thisSaturday, 8);

  const buckets = new Map<(typeof GROUP_ORDER)[number], T[]>(
    GROUP_ORDER.map((label) => [label, [] as T[]]),
  );

  for (const event of events) {
    const { calendarDay } = zonedCalendarDay(event.startsAt, timeZone);
    let label: (typeof GROUP_ORDER)[number];
    if (isSameDay(calendarDay, thisSaturday)) label = "This Saturday";
    else if (isSameDay(calendarDay, thisSunday)) label = "This Sunday";
    else if (isSameDay(calendarDay, nextSaturday) || isSameDay(calendarDay, nextSunday)) {
      label = "Next Weekend";
    } else if (calendarDay < thisSaturday) label = "This Week";
    else label = "Later";
    buckets.get(label)!.push(event);
  }

  return GROUP_ORDER.map((label) => ({ label, events: buckets.get(label)! })).filter(
    (group) => group.events.length > 0,
  );
}

export function isUpcoming(endsAt: Date, now: Date): boolean {
  return endsAt.getTime() > now.getTime();
}
