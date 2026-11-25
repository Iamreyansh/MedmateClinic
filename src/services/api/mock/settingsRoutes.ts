/**
 * The clinic's own settings.
 *
 * The profile on the letterhead, the branches the clinic works from and the
 * services it offers. The settings screen reads it instead of hard-coding the
 * clinic's details, so a clinic with two branches sees both.
 */

import { mock } from "@/services/api/mock/router";
import { requireSession } from "@/services/api/mock/guard";

/** The clinic, as it appears on the letterhead. */
const CLINIC = {
  name: "MedMate Clinic",
  address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
  city: "Bengaluru",
  state: "Karnataka",
  phone: "080 4123 4567",
  email: "accounts@medmate.in",
  gstin: "29AAJCM4821K1Z7",
  pan: "AAJCM4821K",
  registration: "KPME/BLR/2024/01873",
  hfrId: "IN2910000123",
  locations: 2,
  pin: "560038",
};

/** The branches the clinic works from. */
const LOCATIONS = [
  {
    name: "Indiranagar",
    address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
    city: "Bengaluru",
    state: "Karnataka",
    phone: "080 4123 4567",
    rooms: 4,
    hfrId: "IN2910000123",
  },
  {
    name: "Koramangala",
    address: "58, 80 Feet Road, Koramangala, Bengaluru 560034",
    city: "Bengaluru",
    state: "Karnataka",
    phone: "080 4123 4599",
    rooms: 2,
    hfrId: "IN2910000456",
  },
];

/** The services the clinic offers. */
const SERVICES = [
  { id: "svc_consult", name: "Consultation", durationMinutes: 15, price: 500 },
  { id: "svc_followup", name: "Follow-up visit", durationMinutes: 10, price: 300 },
  { id: "svc_video", name: "Video consultation", durationMinutes: 20, price: 400 },
  { id: "svc_home", name: "Home visit", durationMinutes: 45, price: 800 },
];

export function registerSettingsRoutes() {
  mock.on("GET", "/clinic/settings", () => {
    requireSession();
    return { clinic: CLINIC, locations: LOCATIONS, services: SERVICES };
  });
}
