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
import { AccountScreen } from "@/features/staff-admin";
import { NurseScreen } from "@/features/nurse";
import { LabScreen } from "@/features/lab";
import { RequireSession } from "@/app/routes/RequireSession";
import { NotFoundScreen } from "@/app/routes/NotFoundScreen";
import { mobileRoutes } from "@/app/routes/mobile";
import { patientRoutes } from "@/app/routes/patient";
import { LegalDocumentScreen } from "@/features/onboarding";

/**
 * The surfaces a clinic tablet never opens.
 *
 * The kiosk is fetched when it is asked for, so the first bundle a doctor
 * opens does not carry it. The patient-facing web is fetched the same way,
 * from its own block of routes.
 */
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
  // The kiosk is a device at the front of the clinic, not a screen in the
  // staff app: a patient walks up to it and nobody is signed in. So it stands
  // outside the shell and outside the session guard.
  { path: "/kiosk", element: <KioskScreen /> },

  // A legal document is a public document: a patient who follows the
  // clinic's terms link is not staff, and asking them to sign in to read
  // the terms is the wrong behaviour for a link they were handed.
  { path: "/legal/:document", element: <LegalDocumentScreen /> },

  { path: "/fidelity", element: <DevToolsScreen /> },
  { path: "*", element: <NotFoundScreen /> },

  // The phone app: the staff app, the patient's own screens and the
  // sign-up. It is appended, not woven in, so the desktop routes keep the
  // order they had.
  ...mobileRoutes,
  // The patient-facing public web, in one block: the paths the clinic's own
  // link carries and the aliases the app uses.
  ...patientRoutes,
  // The account of the person signed in, on a page of its own so it can be
  // linked to. It is the same account the sidebar's My account dialog opens.
  ...guard("/account", <AccountScreen />),
];

/** One route, behind the session. */
function guard(path: string, element: React.ReactNode): RouteObject[] {
  return [{ path, element: <RequireSession>{element}</RequireSession> }];
}
