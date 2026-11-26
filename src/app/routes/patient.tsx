import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import "@/styles/patient-web.css";

/**
 * The patient-facing public web.
 *
 * A patient at the clinic's front door is not staff and has no session, so
 * these routes sit outside the sign-in — a booking link that asked for a
 * sign-in would be a link nobody could follow.
 *
 * The screens are fetched when they are asked for, so the first bundle a
 * doctor opens does not carry them. Each lazy call names one screen, but they
 * share one chunk — the feature is fetched once.
 */
const BookScreen = lazy(() =>
  import("@/features/patient-web").then((module) => ({ default: module.BookScreen })),
);
const ApptScreen = lazy(() =>
  import("@/features/patient-web").then((module) => ({ default: module.ApptScreen })),
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

/**
 * The routes.
 *
 * The same screen answers to the path the clinic's link carries and to the
 * path the app uses: `/t/<key>` is the link the clinic hands out, `/token/
 * <key>` is the same page, and `/live/<key>` is the same page again. A
 * patient follows one link, and it opens.
 */
export const patientRoutes: RouteObject[] = [
  { path: "/book", element: <BookScreen /> },
  { path: "/appt", element: <ApptScreen /> },
  { path: "/t/:token", element: <LiveTokenScreen /> },
  { path: "/token/:token", element: <LiveTokenScreen /> },
  { path: "/live/:token", element: <LiveTokenScreen /> },
  { path: "/intake/:token", element: <IntakeScreen /> },
  { path: "/verify/:id", element: <VerifyScreen /> },
];
