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
import { DevToolsScreen } from "@/features/dev-tools";
import { PlaceholderScreen } from "@/features/placeholders";
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

  // The screens the nav links to that are not built yet. They say so plainly
  // rather than leading to a blank page.
  ...guard(
    "/kiosk",
    <PlaceholderScreen
      activeHref="/kiosk"
      title="Patient Kiosk"
      icon="kiosk"
      purpose="Where a patient checks themselves in on a tablet and takes a token."
      dependsOn="the kiosk's own flow on the tablet"
    />,
  ),
  ...guard(
    "/nurse",
    <PlaceholderScreen
      activeHref="/nurse"
      title="Nurse Station"
      icon="nurse"
      purpose="Where vitals are recorded and each patient is routed to the right doctor."
      dependsOn="the vitals endpoint"
    />,
  ),
  ...guard(
    "/desk",
    <PlaceholderScreen
      activeHref="/desk"
      title="Reception Desk"
      icon="print"
      purpose="Where each patient is handed over: the prescription, the bill and the follow-up."
      dependsOn="the reception hand-over endpoint"
    />,
  ),
  ...guard(
    "/billing",
    <PlaceholderScreen
      activeHref="/billing"
      title="Billing & POS"
      icon="rupee"
      purpose="Where fees are collected, receipts are printed and the day is closed."
      dependsOn="the billing endpoints"
    />,
  ),
  ...guard(
    "/lab",
    <PlaceholderScreen
      activeHref="/lab"
      title="Lab & Diagnostics"
      icon="lab"
      purpose="Where samples are collected, tests are run and reports go back to the doctor."
      dependsOn="the lab endpoints"
    />,
  ),
  ...guard(
    "/schedule",
    <PlaceholderScreen
      activeHref="/schedule"
      title="Appointments"
      icon="cal"
      purpose="The day's bookings, the working hours and the follow-ups."
      dependsOn="the appointments endpoints"
    />,
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
    <PlaceholderScreen
      activeHref="/subscription"
      title="Subscription"
      icon="spark"
      purpose="The plan, the trial, the usage and the payments."
      dependsOn="the subscription endpoint"
    />,
  ),
  ...guard(
    "/settings",
    <PlaceholderScreen
      activeHref="/settings"
      title="Settings"
      icon="gear"
      purpose="The PIN, the clinic profile, the letterhead and the readiness checklist."
      dependsOn="the settings endpoints"
    />,
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
