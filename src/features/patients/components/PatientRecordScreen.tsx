"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PatientRecordView } from "@/features/patients/components/PatientRecordView";

export function PatientRecordScreen() {
  return (
    <AppShell activeHref="/patients">
      <PatientRecordView />
    </AppShell>
  );
}
