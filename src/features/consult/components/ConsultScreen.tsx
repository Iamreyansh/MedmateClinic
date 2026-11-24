"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ConsultView } from "@/features/consult/components/ConsultView";

export function ConsultScreen() {
  return (
    <AppShell activeHref="/queue">
      <ConsultView />
    </AppShell>
  );
}
