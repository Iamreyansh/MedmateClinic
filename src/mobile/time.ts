import { CLINIC_ZONE } from "@/lib/format";

/**
 * Times on a phone.
 *
 * A patient reads a slot the way it is written on the clinic's wall clock,
 * not in the phone's own time zone — a phone that has quietly crossed a
 * border must not move the doctor's morning.
 */

/**
 * The clinic's own time zone.
 *
 * The service sends it on the booking page, and that is the truth. The
 * constant is only a fallback for a page that did not send one, so a
 * clinic in another time zone still sees its own clock.
 */
export function clinicZone(clinic: unknown): string {
  if (clinic && typeof clinic === "object") {
    const zone = (clinic as { timezone?: unknown }).timezone;
    if (typeof zone === "string" && zone.trim()) return zone;
  }
  return CLINIC_ZONE;
}

/** The time of day, as "HH:mm" in the clinic's own clock. */
export function clockTime(iso: string | null | undefined, zone: string = CLINIC_ZONE): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zone,
  }).format(date);
}

/** The day of a time, as "YYYY-MM-DD" in the clinic's own calendar. */
export function clockDay(iso: string | null | undefined, zone: string = CLINIC_ZONE): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: zone,
  }).format(date);
}
