import type { RouteObject } from "react-router-dom";
import { LandingScreen } from "@/features/landing";
import { LoginScreen, LockScreen } from "@/features/auth";
import { StartScreen } from "@/features/onboarding";
import { DashboardScreen } from "@/features/dashboard";
import { QueueScreen } from "@/features/queue";
import { ConsultScreen } from "@/features/consult";
import { PatientRecordScreen } from "@/features/patients";
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
import { PlaceholderScreen } from "@/features/placeholders";
import { NurseScreen } from "@/features/nurse";
import { LabScreen } from "@/features/lab";
import { KioskScreen } from "@/features/kiosk";
import { BookScreen, LiveTokenScreen, IntakeScreen, VerifyScreen } from "@/features/patient-web";
import { RequireSession } from "@/app/routes/RequireSession";
import { NotFoundScreen } from "@/app/routes/NotFoundScreen";

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
  { path: "/t/:token", element: <LiveTokenScreen /> },
  { path: "/intake/:token", element: <IntakeScreen /> },
  { path: "/verify/:id", element: <VerifyScreen /> },
  ...guard("/dashboard", <DashboardScreen />),
  ...guard("/queue", <QueueScreen />),
  ...guard("/visit/:id", <ConsultScreen />),
  ...guard("/patients", <PatientRecordScreen />),
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
  ...guard(
    "/kiosk",
    <KioskScreen />,
  ),
  ...guard(
    "/doctors",
    <PlaceholderScreen
      activeHref="/doctors"
      title="Doctors"
      icon="stetho"
      purpose="The doctors in the clinic: their fees, their hours and where they work."
      dependsOn="the doctors and HPR lookup"
    />,
  ),
  ...guard(
    "/staff",
    <PlaceholderScreen
      activeHref="/staff"
      title="Staff & roles"
      icon="users"
      purpose="The team, what each person may open, and the activity log."
      dependsOn="the staff and roles endpoints"
    />,
  ),
  ...guard(
    "/messages",
    <PlaceholderScreen
      activeHref="/messages"
      title="Patient messages"
      icon="send"
      purpose="Every message to a patient, word for word, and the wording to register."
      dependsOn="the messages endpoints"
    />,
  ),
  ...guard(
    "/locations",
    <PlaceholderScreen
      activeHref="/locations"
      title="Locations"
      icon="pin"
      purpose="The clinic's branches, their rooms and which doctors work where."
      dependsOn="the branches endpoints"
    />,
  ),
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

  { path: "/fidelity", element: <DevToolsScreen /> },
  { path: "*", element: <NotFoundScreen /> },
];

/** One route, behind the session. */
function guard(path: string, element: React.ReactNode): RouteObject[] {
  return [{ path, element: <RequireSession>{element}</RequireSession> }];
}
