import { mock } from "@/services/api/mock/router";
import { clinic, location, queue, signedInDoctor, doctors } from "@/services/api/mock/clinic";
import { dashboardMeta, manage, navCounts, stations, trial } from "@/services/api/mock/dashboard";

/**
 * The mock endpoints.
 *
 * Same paths and same shapes as the Java API. When the service answers them,
 * this file stops being used and nothing above it changes.
 */
mock.on("GET", "/me", () => ({
  clinic: {
    id: "clinic_medmate_indiranagar",
    name: clinic.name,
    initials: clinic.initials,
    locations: clinic.locations,
    doctors: clinic.doctors,
  },
  user: {
    id: signedInDoctor.id,
    name: signedInDoctor.name,
    initials: signedInDoctor.initials,
    detail: `Owner · ${signedInDoctor.speciality}`,
    tone: "doctor",
  },
  location,
  doctors,
  capabilities: {
    kiosk: "use",
    nurse: "use",
    console: "use",
    inbox: "use",
    desk: "use",
    billing: "use",
    lab: "use",
    tele: "use",
    appointment: "use",
    report: "view",
    patient: "use",
    template: "use",
    doctor: "use",
    staff: "use",
    message: "use",
    location: "use",
    subscription: "use",
    settings: "use",
  },
  navCounts,
}));

mock.on("GET", "/clinic/queue", () => ({
  items: queue,
  next: queue[0],
  room: signedInDoctor.room,
  meta: "Room 2 · 3 waiting · 9 seen today · average consult 8 min",
}));

mock.on("GET", "/clinic/dashboard", () => ({
  meta: dashboardMeta,
  trial,
  stations,
  doctors: manage.length ? [] : [],
  manage,
}));
