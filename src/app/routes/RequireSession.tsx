import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "@/services/api/client";

/**
 * The guard on the staff screens.
 *
 * A screen behind the session must not render without a token: the API would
 * answer 401 and the person would see a broken screen instead of the sign-in.
 * The public screens — the landing page, the sign-in, the sign-up — do not use
 * this.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!auth.get()) {
    // the path is kept, so the person lands where they meant to go
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
