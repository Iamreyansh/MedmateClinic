import type { RouteObject } from "react-router-dom";
import { LandingScreen } from "@/features/landing";
import { LoginScreen } from "@/features/auth";
import { StartScreen } from "@/features/onboarding";
import { LockScreen } from "@/features/lock";
import { DashboardScreen } from "@/features/dashboard";
import { QueueScreen } from "@/features/queue";
import { ConsultScreen } from "@/features/consult";
import { PatientRecordScreen } from "@/features/patients";
import { InboxScreen } from "@/features/inbox";
import { TeleconsultScreen } from "@/features/teleconsult";
import { TemplatesScreen } from "@/features/templates";
import { PrescriptionScreen } from "@/features/prescription";
import { CertificateScreen } from "@/features/certificate";
import { DevToolsScreen } from "@/features/dev-tools";

/**
 * The routes.
 *
 * A flat list on purpose: the product has one shell, and the nav is driven by
 * the capability set the API returns.
 */
export const routes: RouteObject[] = [
  { path: "/", element: <LandingScreen /> },
  { path: "/login", element: <LoginScreen /> },
  { path: "/start", element: <StartScreen /> },
  { path: "/lock", element: <LockScreen /> },
  { path: "/dashboard", element: <DashboardScreen /> },
  { path: "/queue", element: <QueueScreen /> },
  { path: "/visit/:id", element: <ConsultScreen /> },
  { path: "/patients", element: <PatientRecordScreen /> },
  { path: "/inbox", element: <InboxScreen /> },
  { path: "/teleconsult", element: <TeleconsultScreen /> },
  { path: "/templates", element: <TemplatesScreen /> },
  { path: "/rx/:id", element: <PrescriptionScreen /> },
  { path: "/certificate", element: <CertificateScreen /> },
  { path: "/fidelity", element: <DevToolsScreen /> },
];
