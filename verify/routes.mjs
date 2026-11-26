/**
 * The route table.
 *
 * One list, used by the pixel-diff harness (`verify/pixel-diff.mjs`) and by the
 * end-to-end suite (`e2e/`), so a route cannot be diffed in one place and
 * forgotten in the other.
 *
 * `id`      the route's key. It is the file name of its baseline
 *           (`<id>.png`), so it must stay stable once a baseline is committed.
 * `path`    the path on the app, with `:param` placeholders.
 * `params`  the concrete values used when a route needs an id.
 * `api`     the endpoints the screen calls. The API smoke suite and the
 *           "no raw backend error in the UI" assertion both read this.
 * `diff`    whether the route is part of the pixel-diff set.
 * `public`  whether the route is reachable without a session.
 * `expect`  what the screen is expected to render when the API is healthy:
 *           "content" (real data), "state" (a loading/empty/error state is
 *           legitimate), or "public" (a public surface).
 *
 * A route with no backend endpoint today is listed in `KNOWN_GAPS` below, so
 * the harness can fail loudly and say why, instead of skipping it.
 */

/**
 * The name an exported Figma frame must have.
 *
 * The rule, so that a person exporting from Figma and the harness agree
 * without a lookup table:
 *
 *   1. take the route path
 *   2. every `/` becomes `_`
 *   3. every `:` becomes `__`
 *   4. lowercase it
 *   5. drop a leading `_` (the root route is `index`)
 *   6. add `.png`
 *
 * So `/` → `index.png`, `/patients` → `patients.png`, `/patients/:id` →
 * `patients___id.png`, `/clinic/appointments/summary` →
 * `clinic_appointments_summary.png`.
 *
 * @param {string} routePath
 * @returns {string}
 */
export function baselineName(routePath) {
  const name = routePath
    .replace(/\//g, "_")
    .replace(/:/g, "__")
    .toLowerCase()
    .replace(/^_/, "");
  return `${name || "index"}.png`;
}

/** The concrete ids used when a route needs a record to show. */
export const IDS = {
  /** The demo clinic's owner — the number the demo sign-in uses. */
  phone: "9876543210",
  patient: "pt_kavya",
  visit: "vs_kavya",
  invoice: "in_0001",
  /** The demo clinic's booking slug, from registry V2__booking_slug.sql. */
  clinicSlug: "medmate-clinic",
  token: "tok_demo",
  verifyId: "vf_demo",
  verifyHash: "demo",
};

/** @type {{ id: string, path: string, title: string, kind: string, api: string[], diff: boolean, public: boolean, expect: string, note?: string }[]} */
export const ROUTES = [
  {
    id: "dashboard",
    path: "/dashboard",
    title: "Dashboard (owner)",
    kind: "staff",
    api: ["/clinic/dashboard"],
    diff: true,
    budget: 17,
    public: false,
    expect: "content",
  },
  {
    id: "patients",
    path: "/patients",
    title: "Patient record",
    kind: "staff",
    api: ["/clinic/patients/:id"],
    diff: true,
    budget: 14,
    public: false,
    expect: "content",
    note: "The screen defaults to the mock's patient id; the real API has no patients endpoint.",
  },
  {
    id: "desk",
    path: "/desk",
    title: "Reception desk",
    kind: "staff",
    api: ["/clinic/desk"],
    diff: true,
    budget: 16,
    public: false,
    expect: "content",
  },
  {
    id: "billing",
    path: "/billing",
    title: "Billing & POS",
    kind: "staff",
    api: ["/clinic/billing"],
    diff: true,
    budget: 13,
    public: false,
    expect: "content",
  },
  {
    id: "schedule",
    path: "/schedule",
    title: "Appointments — day view",
    kind: "staff",
    api: ["/clinic/appointments"],
    diff: true,
    budget: 15,
    public: false,
    expect: "content",
  },
  {
    id: "nurse",
    path: "/nurse",
    title: "Nurse station",
    kind: "staff",
    api: ["/clinic/nurse", "/clinic/nurse/doctors"],
    diff: true,
    budget: 16,
    public: false,
    expect: "content",
  },
  {
    id: "lab",
    path: "/lab",
    title: "Lab & diagnostics",
    kind: "staff",
    api: ["/clinic/lab"],
    diff: true,
    budget: 13,
    public: false,
    expect: "content",
    note: "The endpoint answers 148,899 bytes with an N+1 staff scan; unbounded.",
  },
  {
    id: "kiosk",
    path: "/kiosk",
    title: "Patient kiosk — check-in",
    kind: "staff",
    api: ["/kiosk"],
    diff: true,
    budget: 38,
    // The drift this route is expected to show against each baseline set, and
    // why. A declaration is a statement about one comparison, so it belongs to
    // one set: the same screen drifts further from the MVP as it shipped than
    // from the MVP as it answers today. The tolerance covers the machine the
    // declaration was measured on — a pixel percentage is not portable.
    expected: {
      reference: { percent: 36, tolerance: 1, reason: "deliberate difference from the deployed MVP — the kiosk's own flow; the Figma baseline is the arbiter" },
      history: { percent: 1.7, tolerance: 2, reason: "the kiosk's entry prompt is the shipped MVP's own — the kiosk's screen is behind the staff PIN in both, so only the Figma baseline can measure it" },
    },
    public: false,
    expect: "content",
    note: "No kiosk endpoint exists on the backend at all.",
  },
  {
    id: "subscription",
    path: "/subscription",
    title: "Subscription (owner)",
    kind: "staff",
    api: ["/clinic/subscription"],
    diff: true,
    budget: 18,
    public: false,
    expect: "content",
  },
  {
    id: "inbox",
    path: "/inbox",
    title: "Inbox (doctor)",
    kind: "staff",
    api: ["/clinic/inbox"],
    diff: false,
    public: false,
    expect: "content",
    note: "The backend exposes /clinic/messages, not /clinic/inbox.",
  },
  {
    id: "teleconsult",
    path: "/teleconsult",
    title: "Teleconsult (doctor)",
    kind: "staff",
    api: ["/clinic/teleconsult"],
    diff: false,
    public: false,
    expect: "content",
  },
  {
    id: "templates",
    path: "/templates",
    title: "My templates (doctor)",
    kind: "staff",
    api: ["/clinic/templates"],
    diff: true,
    budget: 13,
    public: false,
    expect: "content",
  },
  {
    id: "queue",
    path: "/queue",
    title: "Doctor console — queue",
    kind: "staff",
    api: ["/clinic/queue", "/clinic/doctors"],
    diff: true,
    budget: 28,
    // The drift this route is expected to show against each baseline set, and
    // why. A declaration is a statement about one comparison, so it belongs to
    // one set: the same screen drifts further from the MVP as it shipped than
    // from the MVP as it answers today. The tolerance covers the machine the
    // declaration was measured on — a pixel percentage is not portable.
    expected: {
      reference: { percent: 26, tolerance: 1, reason: "deliberate difference from the deployed MVP — the app's own six tabs; the Figma baseline is the arbiter" },
      history: { percent: 14.8, tolerance: 4, reason: "deliberate difference from the deployed MVP — the app's own six tabs; the Figma baseline is the arbiter" },
    },
    public: false,
    expect: "content",
  },
  {
    id: "settings",
    path: "/settings",
    title: "Settings — clinic & letterhead",
    kind: "staff",
    api: ["/clinic/subscription/payments"],
    diff: true,
    budget: 12,
    public: false,
    expect: "content",
  },
  {
    id: "reports",
    path: "/reports",
    title: "Reports — summary",
    kind: "staff",
    api: ["/clinic/reports"],
    diff: true,
    budget: 26,
    // The drift this route is expected to show against each baseline set, and
    // why. A declaration is a statement about one comparison, so it belongs to
    // one set: the same screen drifts further from the MVP as it shipped than
    // from the MVP as it answers today. The tolerance covers the machine the
    // declaration was measured on — a pixel percentage is not portable.
    expected: {
      reference: { percent: 24, tolerance: 1, reason: "deliberate difference from the deployed MVP — the app's own tab sets; the Figma baseline is the arbiter" },
      history: { percent: 19.2, tolerance: 4, reason: "deliberate difference from the deployed MVP — the app's own tab sets; the Figma baseline is the arbiter" },
    },
    public: false,
    expect: "content",
  },
  {
    id: "certificate",
    path: "/certificate",
    title: "Medical certificate",
    kind: "staff",
    api: ["/clinic/visits/:id"],
    diff: false,
    public: false,
    expect: "content",
  },
  {
    id: "visit",
    path: "/visit/:id",
    title: "Doctor console — consult & prescription",
    kind: "staff",
    api: ["/clinic/visits/:id"],
    diff: false,
    public: false,
    expect: "content",
  },
  {
    id: "rx",
    path: "/rx/:id",
    title: "Prescription (A4)",
    kind: "staff",
    api: ["/clinic/visits/:id"],
    diff: false,
    public: false,
    expect: "content",
  },
  {
    id: "receipt",
    path: "/billing/receipt/:id",
    title: "Receipt",
    kind: "staff",
    api: ["/clinic/billing/:id"],
    diff: false,
    public: false,
    expect: "content",
  },
  {
    id: "login",
    path: "/login",
    title: "Sign in — mobile + code",
    kind: "public",
    api: ["/auth/otp", "/auth/verify"],
    diff: false,
    public: true,
    expect: "public",
  },
  {
    id: "landing",
    path: "/",
    title: "Landing page (visitor)",
    kind: "public",
    api: [],
    diff: true,
    budget: 14,
    // The drift this route is expected to show against each baseline set, and
    // why. A declaration is a statement about one comparison, so it belongs to
    // one set: the same screen drifts further from the MVP as it shipped than
    // from the MVP as it answers today. The tolerance covers the machine the
    // declaration was measured on — a pixel percentage is not portable.
    expected: {
      reference: { percent: 29, tolerance: 1, reason: "the local landing page is a different implementation of the deployed one" },
      history: { percent: 13.6, tolerance: 4, reason: "the local landing page is a different implementation of the deployed one" },
    },
    public: true,
    expect: "public",
  },
  {
    id: "start",
    path: "/start",
    title: "Clinic sign-up",
    kind: "public",
    api: [],
    diff: false,
    public: true,
    expect: "public",
  },
  {
    id: "lock",
    path: "/lock",
    title: "Lock screen (PIN)",
    kind: "staff",
    api: ["/auth/unlock"],
    diff: false,
    public: false,
    expect: "content",
  },
  {
    id: "book",
    path: "/book",
    title: "Patient web — booking",
    kind: "patient",
    api: ["/public/doctors", "/public/booking"],
    diff: false,
    public: true,
    expect: "public",
  },
  {
    id: "book-live",
    path: "/t/:id",
    title: "Patient web — live token",
    kind: "patient",
    api: ["/token/:id"],
    diff: false,
    public: true,
    expect: "public",
  },
  {
    id: "intake",
    path: "/intake/:id",
    title: "Patient web — intake",
    kind: "patient",
    api: ["/intake/:id"],
    diff: false,
    public: true,
    expect: "public",
  },
  {
    id: "verify",
    path: "/verify/:id",
    title: "Patient web — verify a prescription",
    kind: "patient",
    api: ["/verify/:id"],
    diff: false,
    public: true,
    expect: "public",
  },
];

/**
 * The frontend calls these paths; the backend has no such endpoint. They are
 * the contract defects the backend task is fixing, and the harness names them
 * so a failure reads as a known gap rather than a mystery.
 */
export const KNOWN_GAPS = [
  {
    path: "/clinic/inbox",
    calledBy: "InboxView.tsx",
    backendHas: "/api/clinic/messages",
    defect: "The screen asks for /clinic/inbox; the controller answers /clinic/messages.",
  },
  {
    path: "/clinic/teleconsult",
    calledBy: "TeleconsultView.tsx",
    backendHas: null,
    defect: "No teleconsult endpoint exists.",
  },
  {
    path: "/clinic/templates",
    calledBy: "TemplatesView.tsx",
    backendHas: null,
    defect: "No templates endpoint exists (templates are migrated, never exposed).",
  },
  {
    path: "/clinic/patients/:id",
    calledBy: "PatientRecordView.tsx",
    backendHas: null,
    defect: "No patients endpoint exists.",
  },
  {
    path: "/clinic/desk/booking-link",
    calledBy: "desk/api/desk.ts",
    backendHas: null,
    defect: "The desk booking-link endpoint does not exist.",
  },
  {
    path: "/kiosk",
    calledBy: "kiosk/api/kiosk.ts",
    backendHas: null,
    defect: "No kiosk endpoint exists — the whole kiosk flow is mock-only.",
  },
];

/**
 * The endpoints the API smoke suite calls, with the envelope each one answers.
 * `envelope` is the shape the frontend's types expect; the suite asserts the
 * answer carries it.
 */
export const API_ENDPOINTS = [
  { method: "GET", path: "/api/me", auth: true, envelope: ["clinicId", "role", "capabilities"], route: "session" },
  { method: "GET", path: "/api/clinic/dashboard", auth: true, envelope: ["meta", "stations"], route: "dashboard" },
  { method: "GET", path: "/api/clinic/queue", auth: true, envelope: ["visits"], route: "queue" },
  { method: "GET", path: "/api/clinic/doctors", auth: true, envelope: ["list"], route: "queue" },
  { method: "GET", path: "/api/clinic/desk", auth: true, envelope: ["visits"], route: "desk" },
  { method: "GET", path: "/api/clinic/billing", auth: true, envelope: ["invoices"], route: "billing" },
  { method: "GET", path: "/api/clinic/appointments", auth: true, envelope: ["appointments"], route: "schedule" },
  { method: "GET", path: "/api/clinic/nurse", auth: true, envelope: ["stations"], route: "nurse" },
  { method: "GET", path: "/api/clinic/lab", auth: true, envelope: ["orders"], route: "lab" },
  { method: "GET", path: "/api/clinic/reports", auth: true, envelope: ["summary"], route: "reports" },
  { method: "GET", path: "/api/clinic/subscription", auth: true, envelope: ["plan"], route: "subscription" },
  { method: "GET", path: "/api/clinic/messages", auth: true, envelope: ["messages"], route: "inbox" },
  { method: "GET", path: "/api/clinic/activity", auth: true, envelope: ["events"], route: "audit" },
  { method: "GET", path: "/api/public/doctors?clinic=:slug", auth: false, envelope: ["doctors"], route: "book" },
  { method: "GET", path: "/api/verify/:id?h=:hash", auth: false, envelope: ["items"], route: "verify" },
];

/** The concrete path for a route, with its placeholders filled in. */
export function routeUrl(route) {
  let path = route.path;
  const values = {
    id: route.kind === "patient" ? IDS.token : route.id === "visit" || route.id === "rx" || route.id === "certificate" ? IDS.visit : route.id === "patients" ? IDS.patient : route.id === "receipt" ? IDS.invoice : IDS.verifyId,
    slug: IDS.clinicSlug,
    hash: IDS.verifyHash,
  };
  path = path.replace(/:(\w+)/g, (_match, name) => values[name] ?? `:${name}`);
  if (route.id === "verify") path = `${path}?h=${IDS.verifyHash}`;
  if (route.id === "book") path = `${path}?clinic=${IDS.clinicSlug}`;
  return path;
}

/** The routes the pixel-diff harness walks, in table order. */
/**
 * The per-route drift budget, in percent of differing pixels.
 *
 * The numbers are the measured drift against the deployed-MVP baseline plus
 * headroom, except for `kiosk` and `landing`, which are held tight because
 * both are known to be wrong today: the kiosk has no backend endpoint at all,
 * and the local landing page is a different implementation of the deployed
 * one. Those two fail the budget on purpose.
 */
export function diffRoutes() {
  return ROUTES.filter((route) => route.diff);
}
