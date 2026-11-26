/**
 * The staff and admin endpoints.
 *
 * Same paths and same shapes as the Java API: a list is `{items, meta}` with
 * a total, a write answers with the thing it wrote, and an error is the
 * service's `{title, detail}`.
 */

import { ApiError } from "@/services/api/client";
import { mock } from "@/services/api/mock/router";
import { requireSession } from "@/services/api/mock/guard";
import { restorableArray, restorableObject } from "@/services/api/mock/reset";

/** The clinic's roles, the way the service holds them. */
type MockRole = { id: string; name: string; label: string; owner: boolean; people: number };

const ROLES: MockRole[] = [
  { id: "role_owner", name: "owner", label: "Owner", owner: true, people: 1 },
  { id: "role_doctor", name: "doctor", label: "Doctor", owner: false, people: 3 },
  { id: "role_nurse", name: "nurse", label: "Nurse", owner: false, people: 1 },
  { id: "role_front_desk", name: "front_desk", label: "Front Desk", owner: false, people: 1 },
  { id: "role_admin", name: "admin", label: "Clinic Admin", owner: false, people: 1 },
];

/** What each role may open. The vocabulary is the service's: none, view, use. */
const CAPABILITIES: Record<string, Record<string, string>> = {
  owner: {
    console: "use",
    inbox: "use",
    template: "use",
    nurse: "use",
    lab: "use",
    tele: "use",
    kiosk: "use",
    desk: "use",
    appointment: "use",
    report: "view",
    patient: "use",
    billing: "use",
    doctor: "use",
    staff: "use",
    message: "use",
    location: "use",
    subscription: "use",
    settings: "use",
  },
  doctor: {
    console: "use",
    inbox: "use",
    template: "use",
    report: "view",
    patient: "use",
    doctor: "use",
  },
  nurse: { nurse: "use", patient: "use" },
  front_desk: {
    kiosk: "use",
    desk: "use",
    appointment: "use",
    patient: "use",
    billing: "use",
    message: "use",
  },
  admin: {
    kiosk: "use",
    desk: "use",
    appointment: "use",
    patient: "use",
    billing: "use",
    doctor: "use",
    staff: "use",
    message: "use",
    location: "use",
    subscription: "use",
    settings: "use",
  },
};

/** The screens the matrix has a column for. */
const SCREENS = [
  { resource: "console", label: "Doctor Console & prescriptions", group: "Clinical", locked: true },
  { resource: "inbox", label: "Doctor's inbox & templates", group: "Clinical", locked: false },
  { resource: "nurse", label: "Nurse Station (vitals)", group: "Clinical", locked: false },
  { resource: "lab", label: "Lab & Diagnostics", group: "Clinical", locked: false },
  { resource: "tele", label: "Teleconsult", group: "Clinical", locked: false },
  { resource: "kiosk", label: "Patient Kiosk", group: "Front desk", locked: false },
  { resource: "desk", label: "Reception Desk", group: "Front desk", locked: false },
  { resource: "appointment", label: "Appointments", group: "Front desk", locked: false },
  { resource: "message", label: "Patient messages", group: "Front desk", locked: false },
  { resource: "patient", label: "Patients (contact & visits)", group: "Front desk", locked: false },
  { resource: "billing", label: "Billing & POS", group: "Money", locked: false },
  { resource: "report", label: "Reports", group: "Money", locked: false },
  { resource: "doctor", label: "Doctors", group: "Clinic", locked: false },
  { resource: "staff", label: "Staff & roles", group: "Clinic", locked: false },
  { resource: "location", label: "Locations", group: "Clinic", locked: false },
  { resource: "settings", label: "Clinic settings & letterhead", group: "Clinic", locked: false },
  { resource: "subscription", label: "Subscription", group: "Clinic", locked: false },
];

const LOCKED_NOTE =
  "Diagnoses, notes and prescriptions are for the treating doctor. The law does not let another role read them.";

/** The team the mock keeps. */
type MockMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  roleName: string;
  level: "none" | "view" | "use";
  detail: string;
  email: string;
  mobile: string;
  active: boolean;
};

const TEAM: MockMember[] = restorableArray([
  {
    id: "stf_mary",
    name: "Mary Joseph",
    initials: "MJ",
    role: "Nurse",
    roleName: "nurse",
    level: "use",
    detail: "Nurse Station",
    email: "mary@medmateclinic.in",
    mobile: "9876543220",
    active: true,
  },
  {
    id: "stf_reception",
    name: "Priya Shetty",
    initials: "PS",
    role: "Front Desk",
    roleName: "front_desk",
    level: "use",
    detail: "Reception, billing and the appointments",
    email: "priya@medmateclinic.in",
    mobile: "9876543221",
    active: true,
  },
  {
    id: "stf_admin",
    name: "Rohit Menon",
    initials: "RM",
    role: "Clinic Admin",
    roleName: "admin",
    level: "use",
    detail: "Runs the clinic: team, doctors, locations and settings",
    email: "rohit@medmateclinic.in",
    mobile: "9876543222",
    active: true,
  },
]);

/** The exceptions one person has to their role. */
const ACCESS_OVERRIDES: Record<string, Record<string, string>> = restorableObject({});

/** The branches the clinic works from. */
type MockBranch = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  rooms: number;
  hfrId: string;
  primary: boolean;
  active: boolean;
  doctors: number;
};

const BRANCHES: MockBranch[] = restorableArray([
  {
    id: "brc_indiranagar",
    name: "Indiranagar",
    address: "12, 100 Feet Road, Near Metro Station",
    city: "Bengaluru",
    state: "Karnataka",
    phone: "08041234567",
    rooms: 3,
    hfrId: "IN2910000123",
    primary: true,
    active: true,
    doctors: 2,
  },
  {
    id: "brc_koramangala",
    name: "Koramangala",
    address: "58, 80 Feet Road",
    city: "Bengaluru",
    state: "Karnataka",
    phone: "08041234599",
    rooms: 2,
    hfrId: "IN2910000456",
    primary: false,
    active: true,
    doctors: 1,
  },
]);

/** The pharmacies the clinic sends prescriptions to. */
type MockPharmacy = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  contactPerson: string;
  active: boolean;
  prescriptions: number;
};

const PHARMACIES: MockPharmacy[] = restorableArray([
  {
    id: "phm_medmate",
    name: "MedMate Pharmacy, Indiranagar",
    address: "12, 100 Feet Road",
    city: "Bengaluru",
    state: "Karnataka",
    phone: "08041234600",
    email: "hello@medmatepharmacy.in",
    contactPerson: "Suresh",
    active: true,
    prescriptions: 0,
  },
]);

/** The profiles the clinic adds people from. */
type MockProfile = {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  speciality: string;
  registration: string;
  hprId: string;
  consultationFee: number;
  videoFee: number;
  sessionStart: string;
  sessionEnd: string;
};

const PROFILES: MockProfile[] = restorableArray([
  {
    id: "prf_consultant",
    name: "Consultant",
    role: "doctor",
    roleLabel: "Doctor",
    speciality: "General Medicine",
    registration: "",
    hprId: "",
    consultationFee: 600,
    videoFee: 400,
    sessionStart: "10:00",
    sessionEnd: "13:00",
  },
]);

/** The doctors the mock keeps, for the add and edit writes. */
type MockDoctorRow = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  speciality: string;
  registration: string;
  hprId: string;
  room: string;
  consultationFee: number;
  videoFee: number;
};

const DOCTORS: MockDoctorRow[] = restorableArray([
  {
    id: "dr_ananya",
    name: "Dr. Ananya Rao",
    mobile: "9876543210",
    email: "ananya.rao@example.in",
    speciality: "General Medicine",
    registration: "Reg. KMC 84213",
    hprId: "71-4421-8890-3326",
    room: "Room 2",
    consultationFee: 600,
    videoFee: 400,
  },
  {
    id: "dr_vikram",
    name: "Dr. Vikram Shenoy",
    mobile: "9876543211",
    email: "vikram.shenoy@example.in",
    speciality: "Pediatrics",
    registration: "Reg. KMC 71840",
    hprId: "71-2233-8890-1104",
    room: "Room 3",
    consultationFee: 600,
    videoFee: 400,
  },
  {
    id: "dr_meghana",
    name: "Dr. Meghana Iyer",
    mobile: "9876543212",
    email: "meghana.iyer@example.in",
    speciality: "Obstetrics & Gynaecology",
    registration: "Reg. KMC 65512",
    hprId: "71-8890-1122-3344",
    room: "Room 1",
    consultationFee: 700,
    videoFee: 400,
  },
]);

/** The hours a doctor keeps, and the days they are away. */
const SESSIONS: Record<string, { weekday: number; start: string; end: string; slotMinutes: number }[]> = restorableObject({
  dr_ananya: [
    { weekday: 1, start: "10:00", end: "13:00", slotMinutes: 15 },
    { weekday: 1, start: "16:00", end: "19:00", slotMinutes: 15 },
    { weekday: 2, start: "10:00", end: "13:00", slotMinutes: 15 },
    { weekday: 3, start: "10:00", end: "13:00", slotMinutes: 15 },
  ],
});

const LEAVE: Record<string, { from: string; to: string; reason: string }[]> = restorableObject({});

/** The clinic's own settings. */
const CLINIC_SETTINGS = restorableObject({
  id: "clinic_11111111",
  name: "MedMate Clinic",
  displayName: "MedMate Clinic, Indiranagar",
  initials: "MC",
  bookingSlug: "medmate-clinic",
  address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
  city: "Bengaluru",
  state: "Karnataka",
  phone: "080 4123 4567",
  email: "accounts@medmate.in",
  gstin: "29AAJCM4821K1Z7",
  pan: "AAJCM4821K",
  registration: "KPME/BLR/2024/01873",
  hfrId: "IN2910000123",
  letterheadNote: "Open 9:00 – 20:00 · Emergency: 080 4123 4567",
  timezone: "Asia/Kolkata",
  locations: 2,
  branches: BRANCHES.length,
});

/** The agreements the clinic has been asked to accept. */
const AGREEMENTS = restorableArray([
  { kind: "terms", title: "Terms of use", version: "2026-01", accepted: true, acceptedAt: "2026-01-04T10:12:00Z" },
  { kind: "privacy", title: "Privacy policy", version: "2026-01", accepted: true, acceptedAt: "2026-01-04T10:12:00Z" },
  { kind: "consent", title: "Patient consent to treatment and data", version: "2026-01", accepted: false, acceptedAt: "" },
]);

/** The person signed in, as the account screen reads them. */
const ACCOUNT = restorableObject({
  id: "stf_owner",
  name: "Dr. Ananya Rao",
  initials: "AR",
  mobile: "9876543210",
  email: "ananya.rao@example.in",
  speciality: "General Medicine",
  registration: "Reg. KMC 84213",
  room: "Room 2",
  role: "Owner",
  pinSet: true,
});

const DEVICES = restorableArray([
  { id: "dev_1", name: "This device", platform: "Chrome on macOS", lastSeenAt: "2026-01-04T10:12:00Z" },
]);

/** The list envelope every list in this package answers with. */
function list<T>(items: T[]) {
  return { items, meta: { total: items.length } };
}

/** The failure envelope the service answers with. */
/**
 * The status each kind of refusal answers with.
 *
 * These are the service's own titles, with the statuses it answers them
 * with: a person or a place that is not there is a 404, a change the clinic
 * has to sort out before it can happen is a 409, and a body that does not
 * make sense is a 400.
 */
const REFUSAL_STATUSES: Record<string, number> = {
  "Not found": 404,
  "Not allowed": 409,
  "Check the form": 400,
  "That did not work": 400,
  "Please sign in": 401,
};

/**
 * A refusal, in the service's envelope.
 *
 * The service answers a refusal with a title and a sentence for a person;
 * the mock answers with the same title, the same sentence and the same
 * status, so a screen that reads the status behaves the same either way.
 */
function refusal(title: string, detail: string) {
  return new ApiError(REFUSAL_STATUSES[title] ?? 400, detail, undefined, "api", title);
}

function text(body: unknown, field: string): string {
  const value = (body as Record<string, unknown> | null)?.[field];
  return typeof value === "string" ? value.trim() : "";
}

function number(body: unknown, field: string): number {
  const value = (body as Record<string, unknown> | null)?.[field];
  return typeof value === "number" ? value : 0;
}

function records(body: unknown, field: string): Record<string, string>[] {
  const value = (body as Record<string, unknown> | null)?.[field];
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, string> => typeof row === "object" && row !== null);
}

export function registerAdminRoutes() {
  // ------------------------------------------------------------------ the team

  mock.on("GET", "/clinic/admin/members", (_body, context) => {
    requireSession();
    const wanted = (context.query.get("search") ?? "").trim().toLowerCase();
    const items = TEAM.filter((person) =>
      wanted
        ? [person.name, person.email, person.detail, person.mobile].some((field) =>
            field.toLowerCase().includes(wanted),
          )
        : true,
    );
    return list(items);
  });

  mock.on("POST", "/clinic/admin/members", (body) => {
    requireSession();
    const name = text(body, "name");
    const mobile = text(body, "mobile").replace(/\D/g, "");
    const role = text(body, "role") || "front_desk";
    if (name.length < 2) throw refusal("Check the form", "A name is needed.");
    if (mobile.length !== 10) throw refusal("Check the form", "A mobile number is ten digits.");

    const already = TEAM.find((person) => person.mobile === mobile);
    if (already) return list([already]);

    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    const roleRow = ROLES.find((entry) => entry.name === role) ?? ROLES[3];
    const member: MockMember = {
      id: `stf_${mobile}`,
      name,
      initials,
      role: roleRow.label,
      roleName: roleRow.name,
      level: "use",
      detail: text(body, "speciality"),
      email: text(body, "email"),
      mobile,
      active: true,
    };
    TEAM.push(member);
    return list([member]);
  });

  mock.on("PUT", "/clinic/admin/members/:memberId", (body, context) => {
    requireSession();
    const member = TEAM.find((person) => person.id === context.params.memberId);
    if (!member) throw refusal("Not found", "That person is not in this clinic.");
    const name = text(body, "name");
    const role = text(body, "role");
    if (name) member.name = name;
    if (role) {
      member.roleName = role;
      const roleRow = ROLES.find((entry) => entry.name === role);
      if (roleRow) member.role = roleRow.label;
    }
    const email = text(body, "email");
    if (email) member.email = email;
    const speciality = text(body, "speciality");
    if (speciality) member.detail = speciality;
    return list([member]);
  });

  mock.on("GET", "/clinic/admin/members/:memberId/access", (_body, context) => {
    requireSession();
    const member = TEAM.find((person) => person.id === context.params.memberId);
    if (!member) throw refusal("Not found", "That person is not in this clinic.");
    const roleCapabilities = CAPABILITIES[member.roleName] ?? {};
    const overrides = ACCESS_OVERRIDES[member.id] ?? {};
    return list([
      {
        staffId: member.id,
        name: member.name,
        role: member.role,
        roleId: `role_${member.roleName}`,
        capabilities: { ...roleCapabilities, ...overrides },
        roleCapabilities,
        overrides,
        levels: ["none", "view", "use"],
        resources: CAPABILITIES.owner,
      },
    ]);
  });

  mock.on("PUT", "/clinic/admin/members/:memberId/access", (body, context) => {
    requireSession();
    const member = TEAM.find((person) => person.id === context.params.memberId);
    if (!member) throw refusal("Not found", "That person is not in this clinic.");
    const role = text(body, "role");
    if (role) {
      member.roleName = role;
      const roleRow = ROLES.find((entry) => entry.name === role);
      if (roleRow) member.role = roleRow.label;
    }
    const overrides = records(body, "overrides");
    const clean: Record<string, string> = {};
    for (const override of overrides) {
      const [resource, level] = Object.entries(override)[0] ?? [];
      if (!resource || !level || level === "none") continue;
      if (!(resource in CAPABILITIES.owner)) {
        throw refusal("That did not work", `This clinic does not have a ${resource} screen to give.`);
      }
      clean[resource] = level;
    }
    ACCESS_OVERRIDES[member.id] = clean;
    const roleCapabilities = CAPABILITIES[member.roleName] ?? {};
    return list([
      {
        staffId: member.id,
        name: member.name,
        role: member.role,
        roleId: `role_${member.roleName}`,
        capabilities: { ...roleCapabilities, ...clean },
        roleCapabilities,
        overrides: clean,
        levels: ["none", "view", "use"],
        resources: CAPABILITIES.owner,
      },
    ]);
  });

  // --------------------------------------------------------- roles & access

  mock.on("GET", "/clinic/admin/roles", () => {
    requireSession();
    return list(
      ROLES.map((role) => ({
        id: role.id,
        name: role.name,
        label: role.label,
        owner: role.owner,
        people: role.people,
        capabilities: CAPABILITIES[role.name] ?? {},
      })),
    );
  });

  mock.on("GET", "/clinic/admin/screens", () => {
    requireSession();
    return list(
      SCREENS.map((screen) => ({
        ...screen,
        note: screen.locked ? LOCKED_NOTE : "",
      })),
    );
  });

  // ---------------------------------------------------------------- the doctors

  mock.on("POST", "/clinic/admin/doctors", (body) => {
    requireSession();
    const name = text(body, "name");
    const mobile = text(body, "mobile").replace(/\D/g, "");
    if (name.length < 2) throw refusal("Check the form", "A name is needed.");
    if (mobile.length !== 10) throw refusal("Check the form", "A mobile number is ten digits.");
    const doctor: MockDoctorRow = {
      id: `dr_${mobile}`,
      name,
      mobile,
      email: text(body, "email"),
      speciality: text(body, "speciality"),
      registration: text(body, "registration"),
      hprId: text(body, "hprId"),
      room: text(body, "room"),
      consultationFee: number(body, "consultationFee") || 500,
      videoFee: number(body, "videoFee") || 400,
    };
    DOCTORS.push(doctor);
    return list([doctorCard(doctor)]);
  });

  mock.on("PUT", "/clinic/admin/doctors/:doctorId", (body, context) => {
    requireSession();
    const doctor = DOCTORS.find((entry) => entry.id === context.params.doctorId);
    if (!doctor) throw refusal("Not found", "That doctor is not in this clinic.");
    const name = text(body, "name");
    if (name) doctor.name = name;
    const speciality = text(body, "speciality");
    if (speciality) doctor.speciality = speciality;
    const registration = text(body, "registration");
    if (registration) doctor.registration = registration;
    const hprId = text(body, "hprId");
    if (hprId) doctor.hprId = hprId;
    const room = text(body, "room");
    if (room) doctor.room = room;
    const fee = number(body, "consultationFee");
    if (fee) doctor.consultationFee = fee;
    const videoFee = number(body, "videoFee");
    if (videoFee) doctor.videoFee = videoFee;
    const email = text(body, "email");
    if (email) doctor.email = email;
    return list([doctorCard(doctor)]);
  });

  mock.on("GET", "/clinic/admin/doctors/by-hpr/:hprId", (_body, context) => {
    requireSession();
    const wanted = context.params.hprId.replace(/\D/g, "");
    const doctor = DOCTORS.find((entry) => entry.hprId.replace(/\D/g, "") === wanted);
    if (!doctor) {
      throw refusal(
        "Not found",
        "This clinic has no doctor under that HPR id yet. Enter their details yourself.",
      );
    }
    return list([
      {
        id: doctor.id,
        name: doctor.name,
        speciality: doctor.speciality,
        registration: doctor.registration,
        hprId: doctor.hprId,
        room: doctor.room,
        known: true,
      },
    ]);
  });

  mock.on("GET", "/clinic/admin/doctors/schedules", () => {
    requireSession();
    return list(DOCTORS.map((doctor) => scheduleOf(doctor)));
  });

  mock.on("GET", "/clinic/admin/doctors/:doctorId/schedule", (_body, context) => {
    requireSession();
    const doctor = DOCTORS.find((entry) => entry.id === context.params.doctorId);
    if (!doctor) throw refusal("Not found", "That doctor is not in this clinic.");
    return list([scheduleOf(doctor)]);
  });

  mock.on("PUT", "/clinic/admin/doctors/:doctorId/schedule", (body, context) => {
    requireSession();
    const doctor = DOCTORS.find((entry) => entry.id === context.params.doctorId);
    if (!doctor) throw refusal("Not found", "That doctor is not in this clinic.");
    const sessions = records(body, "sessions").map((row) => ({
      weekday: Number(row.weekday),
      start: row.start,
      end: row.end,
      slotMinutes: Number(row.slotMinutes) || 15,
    }));
    const leave = records(body, "leave").map((row) => ({
      from: row.from,
      to: row.to,
      reason: row.reason ?? "",
    }));
    SESSIONS[doctor.id] = sessions;
    LEAVE[doctor.id] = leave;
    return list([scheduleOf(doctor)]);
  });

  // ---------------------------------------------------------------- the branches

  mock.on("GET", "/clinic/admin/locations", (_body, context) => {
    requireSession();
    const wanted = (context.query.get("search") ?? "").trim().toLowerCase();
    const items = BRANCHES.filter((branch) =>
      wanted
        ? [branch.name, branch.city].some((field) => field.toLowerCase().includes(wanted))
        : true,
    );
    return list(items);
  });

  mock.on("POST", "/clinic/admin/locations", (body) => {
    requireSession();
    const name = text(body, "name");
    if (name.length < 2) throw refusal("Check the form", "A name is needed.");
    const already = BRANCHES.find((branch) => branch.name.toLowerCase() === name.toLowerCase());
    if (already) return list([already]);
    const branch: MockBranch = {
      id: `brc_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name,
      address: text(body, "address"),
      city: text(body, "city"),
      state: text(body, "state"),
      phone: text(body, "phone"),
      rooms: number(body, "rooms") || 1,
      hfrId: text(body, "hfrId"),
      primary: false,
      active: true,
      doctors: 0,
    };
    BRANCHES.push(branch);
    return list([branch]);
  });

  mock.on("PUT", "/clinic/admin/locations/:branchId", (body, context) => {
    requireSession();
    const branch = BRANCHES.find((entry) => entry.id === context.params.branchId);
    if (!branch) throw refusal("Not found", "That branch is not in this clinic.");
    const name = text(body, "name");
    if (name) branch.name = name;
    const address = text(body, "address");
    if (address) branch.address = address;
    const city = text(body, "city");
    if (city) branch.city = city;
    const state = text(body, "state");
    if (state) branch.state = state;
    const phone = text(body, "phone");
    if (phone) branch.phone = phone;
    const rooms = number(body, "rooms");
    if (rooms) branch.rooms = rooms;
    const hfrId = text(body, "hfrId");
    if (hfrId) branch.hfrId = hfrId;
    return list([branch]);
  });

  mock.on("DELETE", "/clinic/admin/locations/:branchId", (_body, context) => {
    requireSession();
    const index = BRANCHES.findIndex((entry) => entry.id === context.params.branchId);
    if (index < 0) throw refusal("Not found", "That branch is not in this clinic.");
    const branch = BRANCHES[index];
    if (branch.primary) {
      throw refusal(
        "Not allowed",
        "This is the clinic's main branch. Make another branch the main one first.",
      );
    }
    if (branch.doctors > 0) {
      throw refusal(
        "Not allowed",
        `${branch.doctors} ${branch.doctors === 1 ? "doctor still works" : "doctors still work"} at this branch. Move them to another branch first.`,
      );
    }
    BRANCHES.splice(index, 1);
    return list([branch]);
  });

  // -------------------------------------------------------------- the pharmacies

  mock.on("GET", "/clinic/admin/pharmacies", () => {
    requireSession();
    return list(PHARMACIES);
  });

  mock.on("POST", "/clinic/admin/pharmacies", (body) => {
    requireSession();
    const name = text(body, "name");
    if (name.length < 2) throw refusal("Check the form", "A name is needed.");
    const already = PHARMACIES.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
    if (already) return list([already]);
    const pharmacy: MockPharmacy = {
      id: `phm_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name,
      address: text(body, "address"),
      city: text(body, "city"),
      state: text(body, "state"),
      phone: text(body, "phone"),
      email: text(body, "email"),
      contactPerson: text(body, "contactPerson"),
      active: !body || (body as Record<string, unknown>).inactive !== true,
      prescriptions: 0,
    };
    PHARMACIES.push(pharmacy);
    return list([pharmacy]);
  });

  mock.on("PUT", "/clinic/admin/pharmacies/:pharmacyId", (body, context) => {
    requireSession();
    const pharmacy = PHARMACIES.find((entry) => entry.id === context.params.pharmacyId);
    if (!pharmacy) throw refusal("Not found", "That pharmacy is not in this clinic.");
    const name = text(body, "name");
    if (name) pharmacy.name = name;
    const address = text(body, "address");
    if (address) pharmacy.address = address;
    const city = text(body, "city");
    if (city) pharmacy.city = city;
    const state = text(body, "state");
    if (state) pharmacy.state = state;
    const phone = text(body, "phone");
    if (phone) pharmacy.phone = phone;
    const email = text(body, "email");
    if (email) pharmacy.email = email;
    const contactPerson = text(body, "contactPerson");
    if (contactPerson) pharmacy.contactPerson = contactPerson;
    pharmacy.active = !body || (body as Record<string, unknown>).inactive !== true;
    return list([pharmacy]);
  });

  mock.on("DELETE", "/clinic/admin/pharmacies/:pharmacyId", (_body, context) => {
    requireSession();
    const index = PHARMACIES.findIndex((entry) => entry.id === context.params.pharmacyId);
    if (index < 0) throw refusal("Not found", "That pharmacy is not in this clinic.");
    const pharmacy = PHARMACIES[index];
    if (pharmacy.prescriptions > 0) {
      throw refusal(
        "Not allowed",
        `${pharmacy.prescriptions} ${pharmacy.prescriptions === 1 ? "prescription has" : "prescriptions have"} been sent to this pharmacy. Keep it on the list, or mark it as one you no longer send to.`,
      );
    }
    PHARMACIES.splice(index, 1);
    return list([pharmacy]);
  });

  // ----------------------------------------------------------------- the profiles

  mock.on("GET", "/clinic/admin/profiles", () => {
    requireSession();
    return list(PROFILES);
  });

  mock.on("POST", "/clinic/admin/profiles", (body) => {
    requireSession();
    const name = text(body, "name");
    if (name.length < 2) throw refusal("Check the form", "A name is needed.");
    const role = text(body, "role") || "doctor";
    const roleRow = ROLES.find((entry) => entry.name === role);
    if (!roleRow) throw refusal("That did not work", "That role is not one of this clinic's roles.");
    const profile: MockProfile = {
      id: `prf_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name,
      role,
      roleLabel: roleRow.label,
      speciality: text(body, "speciality"),
      registration: text(body, "registration"),
      hprId: text(body, "hprId"),
      consultationFee: number(body, "consultationFee"),
      videoFee: number(body, "videoFee"),
      sessionStart: text(body, "sessionStart"),
      sessionEnd: text(body, "sessionEnd"),
    };
    PROFILES.push(profile);
    return list([profile]);
  });

  mock.on("PUT", "/clinic/admin/profiles/:profileId", (body, context) => {
    requireSession();
    const profile = PROFILES.find((entry) => entry.id === context.params.profileId);
    if (!profile) throw refusal("Not found", "That profile is not in this clinic.");
    const name = text(body, "name");
    if (name) profile.name = name;
    const speciality = text(body, "speciality");
    if (speciality) profile.speciality = speciality;
    return list([profile]);
  });

  mock.on("DELETE", "/clinic/admin/profiles/:profileId", (_body, context) => {
    requireSession();
    const index = PROFILES.findIndex((entry) => entry.id === context.params.profileId);
    if (index < 0) throw refusal("Not found", "That profile is not in this clinic.");
    const profile = PROFILES[index];
    PROFILES.splice(index, 1);
    return list([profile]);
  });

  // ----------------------------------------------------------------- the settings

  mock.on("GET", "/clinic/admin/settings", () => {
    requireSession();
    return list([CLINIC_SETTINGS]);
  });

  mock.on("PUT", "/clinic/admin/settings", (body) => {
    requireSession();
    const displayName = text(body, "displayName");
    if (displayName) CLINIC_SETTINGS.displayName = displayName;
    const email = text(body, "email");
    if (email) CLINIC_SETTINGS.email = email;
    const address = text(body, "address");
    if (address) CLINIC_SETTINGS.address = address;
    const city = text(body, "city");
    if (city) CLINIC_SETTINGS.city = city;
    const state = text(body, "state");
    if (state) CLINIC_SETTINGS.state = state;
    const phone = text(body, "phone");
    if (phone) CLINIC_SETTINGS.phone = phone;
    const gstin = text(body, "gstin");
    if (gstin) CLINIC_SETTINGS.gstin = gstin;
    const pan = text(body, "pan");
    if (pan) CLINIC_SETTINGS.pan = pan;
    const registration = text(body, "registration");
    if (registration) CLINIC_SETTINGS.registration = registration;
    const letterheadNote = text(body, "letterheadNote");
    if (letterheadNote) CLINIC_SETTINGS.letterheadNote = letterheadNote;
    return list([CLINIC_SETTINGS]);
  });

  mock.on("GET", "/clinic/admin/settings/device", () => {
    requireSession();
    return list([{ pinSet: true, devices: DEVICES, locksAfterMinutes: 15 }]);
  });

  mock.on("PUT", "/clinic/admin/settings/pin", (body) => {
    requireSession();
    const newPin = text(body, "newPin");
    const again = text(body, "newPinAgain");
    if (!/^\d{4}$/.test(newPin)) throw refusal("Check the form", "A PIN is four digits.");
    if (newPin !== again) throw refusal("That did not work", "The two new PINs are not the same.");
    return list([{ pinSet: true, devices: DEVICES, locksAfterMinutes: 15 }]);
  });

  mock.on("GET", "/clinic/admin/settings/agreements", () => {
    requireSession();
    return list(AGREEMENTS);
  });

  mock.on("PUT", "/clinic/admin/settings/agreements/:kind", (body, context) => {
    requireSession();
    const agreement = AGREEMENTS.find((entry) => entry.kind === context.params.kind);
    if (!agreement) throw refusal("That did not work", "There is no agreement by that name.");
    const version = text(body, "version");
    if (!version) throw refusal("Check the form", "An agreement is accepted at a version.");
    agreement.accepted = true;
    agreement.acceptedAt = new Date().toISOString();
    return list(AGREEMENTS);
  });

  mock.on("GET", "/clinic/admin/settings/readiness", () => {
    requireSession();
    const outside = [
      {
        label: "Text messages to patients",
        done: false,
        detail:
          "Not connected. Messages to patients need an SMS provider account with DLT-approved templates.",
        action: "See messages",
      },
      {
        label: "Legal signing of prescriptions",
        done: false,
        detail:
          "Test signatures only. Prescriptions need an account with a licensed eSign provider before they are legally signed.",
        action: "",
      },
      {
        label: "ABDM (ABHA and health records)",
        done: false,
        detail: "Needs registration as a health facility and ABDM approval.",
        action: "",
      },
      {
        label: "Online and UPI payments",
        done: false,
        detail:
          "Test payments only. Cash and card at the desk still work. Online payment needs a Razorpay account.",
        action: "",
      },
      {
        label: "Patient data stored in India",
        done: true,
        detail:
          "This clinic's data is held on the hosting provider's database. Connect a database in an Indian region before real patients.",
        action: "",
      },
    ];
    const details = [
      {
        label: "Clinic registration",
        done: true,
        detail: "Registered. The registration is on every prescription the clinic prints.",
        action: "",
      },
      {
        label: "GSTIN on bills",
        done: true,
        detail: "Bills show the clinic's GSTIN.",
        action: "",
      },
      {
        label: "Prescription letterhead",
        done: true,
        detail: "The letterhead has a subtitle and a footer with the timings.",
        action: "Edit letterhead",
      },
      {
        label: "HFR facility ID for each branch",
        done: BRANCHES.every((branch) => branch.hfrId.length > 0),
        detail: "Every branch has one.",
        action: "",
      },
      {
        label: "Phone number patients can call",
        done: BRANCHES.every((branch) => branch.phone.length > 0),
        detail: "Every branch has its own number.",
        action: "",
      },
    ];
    const team = [
      {
        label: "Doctors verified on HPR",
        done: DOCTORS.every((doctor) => doctor.hprId.length > 0),
        detail: "Every doctor has an HPR id on their record.",
        action: "",
      },
      {
        label: "Doctors' signing certificates",
        done: true,
        detail: "Doctors sign with Aadhaar eSign; nothing to renew.",
        action: "",
      },
      {
        label: "Everyone has their own PIN",
        done: true,
        detail: "Everyone can lock and unlock their screen.",
        action: "",
      },
    ];
    const groups = [
      { title: "Outside services", checks: outside },
      { title: "Clinic details", checks: details },
      { title: "Team", checks: team },
    ];
    const all = groups.flatMap((group) => group.checks);
    return list([
      {
        done: all.filter((check) => check.done).length,
        total: all.length,
        groups,
      },
    ]);
  });

  // --------------------------------------------------------------- the account

  mock.on("GET", "/clinic/admin/account", () => {
    requireSession();
    return list([ACCOUNT]);
  });

  mock.on("PUT", "/clinic/admin/account", (body) => {
    requireSession();
    const name = text(body, "name");
    if (name) ACCOUNT.name = name;
    const email = text(body, "email");
    if (email) ACCOUNT.email = email;
    const speciality = text(body, "speciality");
    if (speciality) ACCOUNT.speciality = speciality;
    const registration = text(body, "registration");
    if (registration) ACCOUNT.registration = registration;
    return list([ACCOUNT]);
  });

  mock.on("GET", "/clinic/admin/activity", () => {
    requireSession();
    return list([
      {
        id: "act_1",
        action: "auth.sign_in",
        category: "auth",
        resourceType: "staff",
        resourceId: "stf_owner",
        actor: "stf_owner",
        role: "owner",
        detail: "signed in",
        ip: "127.0.0.1",
        at: "2026-01-04T09:02:00Z",
      },
      {
        id: "act_2",
        action: "prescription.signed",
        category: "prescription",
        resourceType: "prescription",
        resourceId: "rx_kavya",
        actor: "stf_owner",
        role: "owner",
        detail: "prescription signed",
        ip: "127.0.0.1",
        at: "2026-01-04T09:41:00Z",
      },
    ]);
  });
}

/** The doctor's card, in the shape the doctors screen reads. */
function doctorCard(doctor: MockDoctorRow) {
  return {
    id: doctor.id,
    name: doctor.name,
    speciality: doctor.speciality,
    room: doctor.room,
    registration: doctor.registration,
    fee: doctor.consultationFee,
    videoFee: doctor.videoFee,
    hours: "09:00 – 18:30",
    bookedToday: 4,
    freeToday: 16,
    nextFree: "09:00",
    waiting: 0,
  };
}

/** One doctor's week and leave. */
function scheduleOf(doctor: MockDoctorRow) {
  const weekdayLabels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const sessions = (SESSIONS[doctor.id] ?? []).map((session, index) => ({
    id: `ses_${doctor.id}_${index}`,
    weekday: session.weekday,
    weekdayLabel: weekdayLabels[session.weekday] ?? "",
    start: session.start,
    end: session.end,
    slotMinutes: session.slotMinutes,
  }));
  const leave = (LEAVE[doctor.id] ?? []).map((row, index) => ({
    id: `lea_${doctor.id}_${index}`,
    from: row.from,
    to: row.to,
    reason: row.reason,
  }));
  return { staffId: doctor.id, name: doctor.name, sessions, leave };
}
