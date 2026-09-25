import { TZDate } from "@date-fns/tz";
import { groupOpenHousesByDate } from "../../src/lib/dates";

/**
 * Demo open-house times are derived from an explicit reference date in the
 * listing time zone, never from "now" at render time. Templates only allow
 * daytime hours, which also keeps them clear of daylight-saving gaps.
 */

export const DEMO_TIME_ZONE = "America/New_York";

export type OpenHouseTemplate = {
  /** Whole days after the reference date (0 = the reference date itself). */
  dayOffset: number;
  /** Local wall-clock start, "HH:MM", between 08:00 and 20:00. */
  startLocal: string;
  durationMinutes: number;
};

export type ReferenceDate = { year: number; month: number; day: number };

export function parseReferenceDate(value: string): ReferenceDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid reference date "${value}" (expected YYYY-MM-DD).`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new Error(`Invalid reference date "${value}" (not a calendar date).`);
  }
  return { year, month, day };
}

export function todayInZone(now: Date, timeZone: string = DEMO_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function buildOpenHouseTimes(
  referenceDate: string,
  template: OpenHouseTemplate,
  timeZone: string = DEMO_TIME_ZONE,
): { startsAt: Date; endsAt: Date } {
  const ref = parseReferenceDate(referenceDate);
  if (!Number.isInteger(template.dayOffset) || template.dayOffset < 0 || template.dayOffset > 60) {
    throw new Error(`dayOffset must be a whole number between 0 and 60 (got ${template.dayOffset}).`);
  }
  const time = /^(\d{2}):(\d{2})$/.exec(template.startLocal);
  const hours = Number(time?.[1]);
  const minutes = Number(time?.[2]);
  if (!time || hours < 8 || hours > 20 || minutes > 59) {
    throw new Error(`startLocal must be HH:MM between 08:00 and 20:00 (got "${template.startLocal}").`);
  }
  if (!Number.isInteger(template.durationMinutes) || template.durationMinutes < 30 || template.durationMinutes > 360) {
    throw new Error(`durationMinutes must be between 30 and 360 (got ${template.durationMinutes}).`);
  }

  const start = new TZDate(ref.year, ref.month - 1, ref.day + template.dayOffset, hours, minutes, 0, 0, timeZone);
  const startsAt = new Date(start.getTime());
  const endsAt = new Date(startsAt.getTime() + template.durationMinutes * 60_000);
  return { startsAt, endsAt };
}

/**
 * The /open-houses group labels the templates produce when viewed on the
 * morning of the reference date — used to warn the operator when a refresh
 * would not show both "This Week" and "Later".
 */
export function groupLabelsFor(referenceDate: string, templates: OpenHouseTemplate[], timeZone: string = DEMO_TIME_ZONE): string[] {
  const ref = parseReferenceDate(referenceDate);
  const morning = new Date(new TZDate(ref.year, ref.month - 1, ref.day, 9, 0, 0, 0, timeZone).getTime());
  const events = templates.map((t) => ({ startsAt: buildOpenHouseTimes(referenceDate, t, timeZone).startsAt }));
  return groupOpenHousesByDate(events, morning, timeZone).map((g) => g.label);
}
