/**
 * The clinic's own clock.
 *
 * The service stores an appointment as a true instant: 10:00 at the clinic
 * is 10:00 on the wall and 04:30Z in the database. The mock used to store
 * the wall clock with a `Z` on it — 10:00Z — which is a different moment
 * altogether, and the mock contradicted itself about it: the schedule screen
 * sliced the string as if it were a wall clock, while the patient's own
 * booking screen read the same string as an instant and shifted it.
 *
 * Everything that writes an appointment now writes a true instant, and
 * everything that shows a time reads it in the clinic's own zone — the way
 * `AppointmentService.card()` does it on the service.
 */

/** The clinic's zone. Asia/Kolkata is +05:30 and has no daylight saving. */
export const CLINIC_ZONE = "Asia/Kolkata";

/** The minutes the clinic's clock is ahead of UTC. */
const OFFSET_MINUTES = 330;

/** Two digits, so nine o'clock does not become 9:00. */
function two(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/**
 * An instant, in the clinic's own zone.
 *
 * `clinicInstant("2026-11-26", "09:00")` is the instant of 09:00 at the
 * clinic on that day — the one the service compares against.
 */
export function clinicInstant(day: string, time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  // The wall time is read on the clinic's own day, and the offset is then
  // taken off it. Starting the day at midnight in the clinic's own offset
  // would land on the day before: the clinic's midnight is the evening
  // before in UTC, and the instant that comes back is a day early.
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCHours(hour, minute, 0, 0);
  date.setUTCMinutes(date.getUTCMinutes() - OFFSET_MINUTES);
  return date.toISOString();
}

/** The day and the time of an instant, in the clinic's own zone. */
export function clinicLocal(instant: string): { day: string; time: string } {
  const at = new Date(instant);
  if (Number.isNaN(at.getTime())) return { day: "", time: "" };
  const shifted = new Date(at.getTime() + OFFSET_MINUTES * 60000);
  const day = `${shifted.getUTCFullYear()}-${two(shifted.getUTCMonth() + 1)}-${two(shifted.getUTCDate())}`;
  return { day, time: `${two(shifted.getUTCHours())}:${two(shifted.getUTCMinutes())}` };
}

/**
 * The time of day of an instant, in the clinic's own clock.
 *
 * The service answers with this label beside the instant: `startsAt` is the
 * moment, `time` is what the wall says, and both are the same moment told
 * two ways.
 */
export function clinicTimeOf(instant: string): string {
  return clinicLocal(instant).time;
}
