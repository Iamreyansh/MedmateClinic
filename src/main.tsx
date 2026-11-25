import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@/app/providers/AppProviders";
import { AppRoutes } from "@/app/routes/AppRoutes";
import { assertMockIsSafeToBuild } from "@/config/env";
import "@/styles/medmate.css";
import "@/styles/app.css";

// the mock must never ship — see config/env.ts
assertMockIsSafeToBuild();

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </StrictMode>,
);
