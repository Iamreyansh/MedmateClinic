/**
 * How the clinic writes things down.
 *
 * Money, mobile numbers and times are read in one way across the product, so
 * a bill, a receipt and a subscription all say the same thing.
 */

/** The locale the clinic's own numbers are written in. */
const LOCALE = "en-IN";

/** The currency the clinic bills in. */
const CURRENCY = "INR";

/**
 * The money, as the patient reads it on a bill.
 *
 * "₹500", "₹1,25,000" — the grouping the way it is written in India.
 */
export function money(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "₹0";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * The money, without the symbol.
 *
 * For the places that put the symbol in the design themselves — a tile that
 * shows "₹" in a corner, a table that has a money column.
 */
export function amount(amountInPaise: number | null | undefined): string {
  const value = Number(amountInPaise ?? 0);
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(value);
}

/**
 * The mobile number, with the middle hidden.
 *
 * A patient record is shown to whoever is at the desk, and the number is not
 * what they are there for.
 */
export function maskPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `•••••• ${digits.slice(-5)}`;
}

/** The clinic's time zone. */
export const CLINIC_ZONE = "Asia/Kolkata";

/**
 * The time, in the clinic's own clock.
 *
 * The service sends times in UTC; a slot at 09:00 in the clinic is 09:00 on
 * the wall, whatever the browser's own time zone is.
 */
export function clinicTime(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true },
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: CLINIC_ZONE }).format(date);
}

/** The day, in the clinic's own calendar. */
export function clinicDate(iso: string | null | undefined): string {
  return clinicTime(iso, { day: "numeric", month: "short", year: "numeric" });
}

/** The weekday, in the clinic's own calendar. */
export function clinicWeekday(iso: string | null | undefined): string {
  return clinicTime(iso, { weekday: "long" });
}
