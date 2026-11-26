import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { RequireSession } from "@/app/routes/RequireSession";
import "@/styles/mobile.css";

/**
 * The mobile routes.
 *
 * The phone app is fetched when it is asked for, so the first bundle a
 * doctor opens does not carry it — the same rule the patient-facing web
 * and the kiosk follow. The three groups share a chunk each: the staff app
 * is fetched once, and so are the patient's screens and the sign-up.
 */
const MobileDashboardScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileDashboardScreen })),
);
const MobileConsoleScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileConsoleScreen })),
);
const MobileInboxScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileInboxScreen })),
);
const MobilePatientListScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobilePatientListScreen })),
);
const MobilePatientRecordScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobilePatientRecordScreen })),
);
const MobileTeleconsultScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileTeleconsultScreen })),
);
const MobileTemplatesScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileTemplatesScreen })),
);
const MobileDeskScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileDeskScreen })),
);
const MobileBillingScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileBillingScreen })),
);
const MobileScheduleScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileScheduleScreen })),
);
const MobileMessagesScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileMessagesScreen })),
);
const MobileNurseScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileNurseScreen })),
);
const MobileLabScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileLabScreen })),
);
const MobileReportsScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileReportsScreen })),
);
const MobileDoctorsScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileDoctorsScreen })),
);
const MobileLocationsScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileLocationsScreen })),
);
const MobileStaffScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileStaffScreen })),
);
const MobileSubscriptionScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileSubscriptionScreen })),
);
const MobileSettingsScreen = lazy(() =>
  import("@/mobile/staff").then((module) => ({ default: module.MobileSettingsScreen })),
);

const MobileLandingScreen = lazy(() =>
  import("@/mobile/public").then((module) => ({ default: module.MobileLandingScreen })),
);
const MobileSignUpScreen = lazy(() =>
  import("@/mobile/public").then((module) => ({ default: module.MobileSignUpScreen })),
);

const MobileCheckInScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileCheckInScreen })),
);
const MobileBookScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileBookScreen })),
);
const MobileBookDetailsScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileBookDetailsScreen })),
);
const MobileBookConfirmedScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileBookConfirmedScreen })),
);
const MobileManageScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileManageScreen })),
);
const MobileLiveTokenScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileLiveTokenScreen })),
);
const MobileIntakeScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileIntakeScreen })),
);
const MobileLegalScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileLegalScreen })),
);
const MobileVerifyScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileVerifyScreen })),
);
const MobileVerifyCertificateScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileVerifyCertificateScreen })),
);
const MobileLinkNeededScreen = lazy(() =>
  import("@/mobile/phone").then((module) => ({ default: module.MobileLinkNeededScreen })),
);

/**
 * The routes.
 *
 * The staff app sits behind the session, exactly as the desktop screens do:
 * a person without a session is sent to the sign-in rather than into a
 * screen that cannot load. The patient's own screens stand outside it — a
 * patient at the clinic's front door is not staff.
 */
export const mobileRoutes: RouteObject[] = [
  { path: "/m", element: <MobileLandingScreen /> },
  { path: "/m/signup", element: <MobileSignUpScreen /> },

  // The patient's own screens. The link key travels in the URL and is
  // never drawn.
  { path: "/m/checkin", element: <MobileCheckInScreen /> },
  { path: "/m/book", element: <MobileBookScreen /> },
  { path: "/m/book/details", element: <MobileBookDetailsScreen /> },
  { path: "/m/book/confirmed", element: <MobileBookConfirmedScreen /> },
  { path: "/m/manage/:key", element: <MobileManageScreen /> },
  { path: "/m/visit", element: <MobileLinkNeededScreen what="visit" /> },
  { path: "/m/visit/:key", element: <MobileLiveTokenScreen /> },
  { path: "/m/symptoms", element: <MobileLinkNeededScreen what="symptoms" /> },
  { path: "/m/symptoms/:key", element: <MobileIntakeScreen /> },
  { path: "/m/legal", element: <MobileLegalScreen /> },
  { path: "/m/verify", element: <MobileVerifyScreen /> },
  { path: "/m/verify/certificate/:id", element: <MobileVerifyCertificateScreen /> },
  { path: "/m/verify/:id", element: <MobileVerifyScreen /> },

  // The staff app.
  { path: "/m/dashboard", element: <RequireSession><MobileDashboardScreen /></RequireSession> },
  { path: "/m/console", element: <RequireSession><MobileConsoleScreen /></RequireSession> },
  { path: "/m/inbox", element: <RequireSession><MobileInboxScreen /></RequireSession> },
  { path: "/m/patients", element: <RequireSession><MobilePatientListScreen /></RequireSession> },
  { path: "/m/patients/:id", element: <RequireSession><MobilePatientRecordScreen /></RequireSession> },
  { path: "/m/teleconsult", element: <RequireSession><MobileTeleconsultScreen /></RequireSession> },
  { path: "/m/templates", element: <RequireSession><MobileTemplatesScreen /></RequireSession> },
  { path: "/m/desk", element: <RequireSession><MobileDeskScreen /></RequireSession> },
  { path: "/m/billing", element: <RequireSession><MobileBillingScreen /></RequireSession> },
  { path: "/m/schedule", element: <RequireSession><MobileScheduleScreen /></RequireSession> },
  { path: "/m/messages", element: <RequireSession><MobileMessagesScreen /></RequireSession> },
  { path: "/m/nurse", element: <RequireSession><MobileNurseScreen /></RequireSession> },
  { path: "/m/lab", element: <RequireSession><MobileLabScreen /></RequireSession> },
  { path: "/m/reports", element: <RequireSession><MobileReportsScreen /></RequireSession> },
  { path: "/m/doctors", element: <RequireSession><MobileDoctorsScreen /></RequireSession> },
  { path: "/m/locations", element: <RequireSession><MobileLocationsScreen /></RequireSession> },
  { path: "/m/staff", element: <RequireSession><MobileStaffScreen /></RequireSession> },
  { path: "/m/subscription", element: <RequireSession><MobileSubscriptionScreen /></RequireSession> },
  { path: "/m/settings", element: <RequireSession><MobileSettingsScreen /></RequireSession> },
];
