"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeleconsultView } from "@/features/teleconsult/components/TeleconsultView";

export function TeleconsultScreen() {
  return (
    <AppShell activeHref="/teleconsult">
      <TeleconsultView />
    </AppShell>
  );
}
