"use client";

import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PatientRecordView } from "@/features/patients/components/PatientRecordView";

export function PatientRecordScreen() {
  const { id = "pt_kavya" } = useParams();

  return (
    <AppShell activeHref="/patients">
      <PatientRecordView patientId={id} />
    </AppShell>
  );
}
