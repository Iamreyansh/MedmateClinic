import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { LandingScreen } from "@/features/landing";
import { LoginScreen, LockScreen } from "@/features/auth";
import { StartScreen } from "@/features/onboarding";
import { DashboardScreen } from "@/features/dashboard";
import { QueueScreen } from "@/features/queue";
import { ConsultScreen } from "@/features/consult";
import { PatientListScreen, PatientRecordScreen } from "@/features/patients";
import { InboxScreen } from "@/features/inbox";
import { TeleconsultScreen } from "@/features/teleconsult";
import { TemplatesScreen } from "@/features/templates";
import { PrescriptionScreen } from "@/features/prescription";
import { CertificateScreen } from "@/features/certificate";
import { ReportsScreen } from "@/features/reports";
import { DeskScreen } from "@/features/desk";
import { BillingScreen, ReceiptScreen } from "@/features/billing";
import { ScheduleScreen } from "@/features/schedule";
import { SubscriptionScreen } from "@/features/subscription";
import { SettingsScreen } from "@/features/settings";
import { DevToolsScreen } from "@/features/dev-tools";
import { MessagesScreen } from "@/features/messages";
import { DoctorsScreen } from "@/features/doctors";
import { StaffScreen } from "@/features/staff";
import { LocationsScreen } from "@/features/locations";
import { PlaceholderScreen } from "@/features/placeholders";
import { NurseScreen } from "@/features/nurse";
import { LabScreen } from "@/features/lab";
import { RequireSession } from "@/app/routes/RequireSession";
import { NotFoundScreen } from "@/app/routes/NotFoundScreen";

/**
 * The surfaces a clinic tablet never opens.
 *
 * The patient-facing web and the kiosk are fetched when they are asked for, so
 * the first bundle a doctor opens does not carry them. Each lazy call names
 * one screen, but they share one chunk — the feature is fetched once.
 */
const ApptScreen = lazy(() =>
  import("@/features/patient-web").then((module) => ({ default: module.ApptScreen })),
);
const BookScreen = lazy(() =>
  import("@/features/patient-web").then((module) => ({ default: module.BookScreen })),
);
const LiveTokenScreen = lazy(() =>
  import("@/features/patient-web").then((module) => ({ default: module.LiveTokenScreen })),
);
const IntakeScreen = lazy(() =>
  import("@/features/patient-web").then((module) => ({ default: module.IntakeScreen })),
);
const VerifyScreen = lazy(() =>
  import("@/features/patient-web").then((module) => ({ default: module.VerifyScreen })),
);
const KioskScreen = lazy(() =>
  import("@/features/kiosk").then((module) => ({ default: module.KioskScreen })),
);

/**
 * The routes.
 *
 * A flat list on purpose: the product has one shell, and the nav is driven by
 * the capability set the API returns.
 *
 * Every staff screen sits behind `RequireSession`, so a person without a token
 * is sent to the sign-in rather than into a screen that cannot load.
 */
export const routes: RouteObject[] = [
  { path: "/", element: <LandingScreen /> },
  { path: "/login", element: <LoginScreen /> },
  { path: "/start", element: <StartScreen /> },
  { path: "/lock", element: <LockScreen /> },

  // The patient-facing surfaces. A patient at the clinic's front door is not
  // staff and has no session, so these sit outside the guard — a booking link
  // that asked for a sign-in would be a link nobody could follow.
  { path: "/book", element: <BookScreen /> },
  { path: "/appt", element: <ApptScreen /> },
  { path: "/t/:token", element: <LiveTokenScreen /> },
  { path: "/intake/:token", element: <IntakeScreen /> },
  { path: "/verify/:id", element: <VerifyScreen /> },
  ...guard("/dashboard", <DashboardScreen />),
  ...guard("/queue", <QueueScreen />),
  ...guard("/visit/:id", <ConsultScreen />),
  // The list is the front door; the record is one patient inside it.
  ...guard("/patients", <PatientListScreen />),
  ...guard("/patients/:id", <PatientRecordScreen />),
  ...guard("/inbox", <InboxScreen />),
  ...guard("/teleconsult", <TeleconsultScreen />),
  ...guard("/templates", <TemplatesScreen />),
  ...guard("/rx/:id", <PrescriptionScreen />),
  ...guard("/certificate", <CertificateScreen />),
  ...guard("/reports", <ReportsScreen />),
  ...guard("/desk", <DeskScreen />),
  ...guard("/billing", <BillingScreen />),
  ...guard("/billing/receipt/:invoiceId", <ReceiptScreen />),
  ...guard("/schedule", <ScheduleScreen />),

  // The screens the nav links to that are not built yet. They say so plainly
  // rather than leading to a blank page.
  ...guard(
    "/nurse",
    <NurseScreen />,
  ),
  ...guard(
    "/lab",
    <LabScreen />,
  ),
  ...guard("/doctors", <DoctorsScreen />),
  ...guard("/staff", <StaffScreen />),
  ...guard("/messages", <MessagesScreen />),
  ...guard("/locations", <LocationsScreen />),
  ...guard(
    "/subscription",
    <SubscriptionScreen />,
  ),
  ...guard(
    "/settings",
    <SettingsScreen />,
  ),
  ...guard(
    "/legal/:document",
    <PlaceholderScreen
      title="Legal document"
      icon="cert"
      purpose="The terms of service, the data processing agreement and the clinic declaration."
    />,
  ),

  // The kiosk is a device at the front of the clinic, not a screen in the
  // staff app: a patient walks up to it and nobody is signed in. So it stands
  // outside the shell and outside the session guard.
  { path: "/kiosk", element: <KioskScreen /> },

  { path: "/fidelity", element: <DevToolsScreen /> },
  { path: "*", element: <NotFoundScreen /> },
];

/** One route, behind the session. */
function guard(path: string, element: React.ReactNode): RouteObject[] {
  return [{ path, element: <RequireSession>{element}</RequireSession> }];
}
