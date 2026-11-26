import type { PublicClinic, PublicSlot } from "@/features/patient-web/types";

/**
 * The clinic's own time.
 *
 * A patient reads a slot as "09:00", and 09:00 is 09:00 at the clinic — not
 * at the phone, and not in Greenwich. The service sends the clinic's zone,
 * and the slot it sends carries both: the label the patient reads and the
 * instant it is. Neither is worked out here; the zone is read, and the
 * offset is only worked out when the service has not sent a zone.
 */

/** Two digits, so nine o'clock does not become 9:00. */
function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** The minutes of a wall-clock time, as the service labels it. */
function minutesOfLabel(label: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * The offset the service's zone puts the clinic's wall clock ahead of UTC.
 *
 * The browser knows the zone; the service does not have to spell the offset
 * out. A zone the browser does not know is not guessed at.
 */
function offsetOfZone(zone: string, slots: PublicSlot[]): number | null {
  const at = slots[0]?.startsAt ? new Date(slots[0].startsAt) : new Date();
  if (Number.isNaN(at.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "NaN");
    if (!Number.isFinite(read("year"))) return null;
    const asUtc = Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour") % 24,
      read("minute"),
      read("second"),
    );
    return Math.round((asUtc - at.getTime()) / 60000);
  } catch {
    return null;
  }
}

/**
 * The offset between the clinic's wall clock and UTC, from the slots.
 *
 * A slot's label and the instant it points at are the same moment, told two
 * ways — so the difference between them is the clinic's offset. It is a
 * fallback: the service's own zone is the truth when it sends one.
 */
function offsetOfSlots(slots: PublicSlot[]): number | null {
  for (const slot of slots) {
    const label = minutesOfLabel(slot.label);
    if (label === null) continue;
    const at = new Date(slot.startsAt);
    if (Number.isNaN(at.getTime())) continue;
    let offset = label - (at.getUTCHours() * 60 + at.getUTCMinutes());
    if (offset > 720) offset -= 1440;
    return offset;
  }
  return null;
}

/** An offset, as it is written. */
export function formatOffset(offset: number): string {
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  return `UTC${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/**
 * The clinic's time, as the patient is told it.
 *
 * The service's zone is used when it sends one. Otherwise the slots carry
 * the same truth, and the offset is worked out from them. When neither is
 * there, nothing is shown: a timezone the service did not send is not
 * invented.
 */
export function clinicTimeLine(
  clinic: PublicClinic | undefined,
  slots: PublicSlot[],
): string | null {
  const zone = clinic?.timezone?.trim();
  if (zone) {
    const offset = offsetOfZone(zone, slots);
    return offset === null ? zone : `${zone} (${formatOffset(offset)})`;
  }
  const offset = offsetOfSlots(slots);
  return offset === null ? null : formatOffset(offset);
}

/**
 * The clinic's offset from UTC, in minutes.
 *
 * The service's zone first; the slots only when it sent no zone.
 */
export function clinicOffsetMinutes(
  clinic: PublicClinic | undefined,
  slots: PublicSlot[],
): number | null {
  const zone = clinic?.timezone?.trim();
  if (zone) {
    const offset = offsetOfZone(zone, slots);
    if (offset !== null) return offset;
  }
  return offsetOfSlots(slots);
}

/**
 * The day the service offered, in the patient's words.
 *
 * The service sends it as `YYYY-MM-DD`; it is read, not calculated — the
 * service knows what day it is offering.
 */
export function formatServiceDay(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  if (!match) return day.trim();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[Number(match[2]) - 1];
  if (!month) return day.trim();
  return `${Number(match[3])} ${month} ${match[1]}`;
}
