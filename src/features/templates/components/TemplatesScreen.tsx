"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TemplatesView } from "@/features/templates/components/TemplatesView";

export function TemplatesScreen() {
  return (
    <AppShell activeHref="/templates">
      <TemplatesView />
    </AppShell>
  );
}
