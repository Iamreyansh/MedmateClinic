import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import { routes } from "@/app/routes";

/** What a screen shows while its code is still arriving. */
function RouteFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ padding: 22 }}>
        <b style={{ fontSize: 15 }}>Opening…</b>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return <Suspense fallback={<RouteFallback />}>{useRoutes(routes)}</Suspense>;
}
