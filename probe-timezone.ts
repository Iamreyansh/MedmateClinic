/**
 * The timezone probe.
 *
 * The mock used to store an appointment as the clinic's wall clock wearing a
 * `Z`, and the schedule screen sliced that string to show a time. The
 * service stores a true instant and answers with the clinic's own label
 * beside it. This prints both, in two zones, so the difference is a number
 * and not an argument.
 */
import { mock } from "@/services/api/mock/router";
import "@/services/api/mock/routes";
import { clinicLocal, clinicTimeOf } from "@/services/api/mock/clinicClock";

/** The mock's own sign-in. */
async function signIn() {
  const otp = (await mock.handle("POST", "/auth/otp", { phone: "9845012345" })) as {
    code: string;
  };
  await mock.handle("POST", "/auth/verify", { phone: "9845012345", code: otp.code });
}

await signIn();

const day = await mock.handle("GET", "/clinic/appointments?date=2026-11-25", undefined);
const rows = (day as { appointments: Array<{ time: string; startsAt: string }> }).appointments;

const ZONES = ["Asia/Kolkata", "America/New_York"];
const clock = (instant: string, zone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zone,
  }).format(new Date(instant));

console.log("the mock's appointment rows");
for (const row of rows.slice(0, 4)) {
  // what the old convention stored, and what it showed when sliced
  const oldStored = `${row.startsAt.slice(0, 10)}T${row.time}:00Z`;
  const oldShown = oldStored.slice(11, 16);
  console.log(`  instant ${row.startsAt} · label ${row.time} · old shown ${oldShown}`);
  console.log(
    `    browser zone: ${ZONES.map((zone) => `${zone} ${clock(row.startsAt, zone)}`).join(" · ")}`,
  );
  console.log(`    clinic zone : ${clinicTimeOf(row.startsAt)} · clinic day ${clinicLocal(row.startsAt).day}`);
}

const labels = rows.map((row) => row.time);
const slices = rows.map((row) => `${row.startsAt.slice(0, 10)}T${row.time}:00Z`.slice(11, 16));
const same = labels.every((label, index) => label === slices[index]);
console.log(`\nthe label and the old slice agree for every row: ${same}`);
console.log(`labels: ${labels.join(", ")}`);
