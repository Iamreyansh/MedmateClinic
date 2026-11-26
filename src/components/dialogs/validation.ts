/**
 * The checks the forms make before they ask the service for anything.
 *
 * They say the same thing the service would say, so the person is told what
 * is wrong while they are still looking at the box rather than after a
 * round trip.
 */

/** A name that is there and is a name. */
export function requiredName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "A name is needed.";
  if (trimmed.length < 2) return "That name is too short to read on a screen.";
  if (trimmed.length > 120) return "That name is longer than a name can be.";
  return null;
}

/** The ten digits a person signs in with. */
export function mobileNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "A mobile number is needed — it is how they sign in.";
  if (digits.length !== 10) return "A mobile number is ten digits.";
  return null;
}

/** An address, when one is given. */
export function emailAddress(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "That does not look like an email address.";
  return null;
}

/** The four digits that unlock the screen. */
export function pinDigits(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "A PIN is four digits.";
  if (digits.length !== 4) return "A PIN is four digits.";
  return null;
}

/** A clock time, as the hours are written. */
export function clockTime(value: string): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim())) return "Write the time as 09:30.";
  return null;
}

/** A date, as the days are written. */
export function calendarDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return "Write the date as 2026-01-31.";
  return null;
}
