"use client";

import { AppShell } from "@/components/layout/AppShell";
import { InboxView } from "@/features/inbox/components/InboxView";

export function InboxScreen() {
  return (
    <AppShell activeHref="/inbox">
      <InboxView />
    </AppShell>
  );
}
