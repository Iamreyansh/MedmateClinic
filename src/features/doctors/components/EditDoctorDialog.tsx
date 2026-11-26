"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/dialogs/FormField";
import { emailAddress, requiredName } from "@/components/dialogs/validation";
import { updateDoctor, type ClinicDoctor, type DoctorDraft } from "@/features/doctors/api/doctors";

/**
 * Change what is known about a doctor.
 *
 * <p>The mobile number is how they sign in, so it is kept: changing it means
 * they sign in with the new one.
 */
export type EditDoctorDialogProps = {
  open: boolean;
  doctor: ClinicDoctor | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function EditDoctorDialog({ open, doctor, onClose, onSaved }: EditDoctorDialogProps) {
  const [draft, setDraft] = useState<DoctorDraft>(() => draftOf(doctor));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    if (!doctor) return;
    const found: Record<string, string> = {};
    const nameError = requiredName(draft.name);
    if (nameError) found.name = nameError;
    const emailError = emailAddress(draft.email);
    if (emailError) found.email = emailError;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      await updateDoctor(doctor.id, {
        ...draft,
        mobile: draft.mobile || "0000000000",
        consultationFee: Number(draft.consultationFee) || 0,
        videoFee: Number(draft.videoFee) || 0,
      });
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not change the doctor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit doctor"
      description={doctor ? doctor.name : undefined}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <TextField
        id="edit-doctor-name"
        label="Full name"
        value={draft.name}
        onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
        error={errors.name}
        autoComplete="off"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="edit-doctor-speciality"
          label="What they do"
          value={draft.speciality}
          onChange={(value) => setDraft((current) => ({ ...current, speciality: value }))}
          autoComplete="off"
        />
        <TextField
          id="edit-doctor-registration"
          label="Registration"
          value={draft.registration}
          onChange={(value) => setDraft((current) => ({ ...current, registration: value }))}
          autoComplete="off"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="edit-doctor-room"
          label="Room"
          value={draft.room}
          onChange={(value) => setDraft((current) => ({ ...current, room: value }))}
          hint="The room they are found in."
          autoComplete="off"
        />
        <TextField
          id="edit-doctor-hpr"
          label="HPR id"
          value={draft.hprId}
          onChange={(value) => setDraft((current) => ({ ...current, hprId: value }))}
          autoComplete="off"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="edit-doctor-fee"
          label="Consultation fee"
          value={String(draft.consultationFee)}
          onChange={(value) =>
            setDraft((current) => ({ ...current, consultationFee: Number(value) || 0 }))
          }
          type="number"
          inputMode="numeric"
        />
        <TextField
          id="edit-doctor-video-fee"
          label="Video consultation fee"
          value={String(draft.videoFee)}
          onChange={(value) => setDraft((current) => ({ ...current, videoFee: Number(value) || 0 }))}
          type="number"
          inputMode="numeric"
        />
      </div>
      <TextField
        id="edit-doctor-email"
        label="Email"
        value={draft.email}
        onChange={(value) => setDraft((current) => ({ ...current, email: value }))}
        error={errors.email}
        type="email"
        inputMode="email"
        autoComplete="off"
      />

      {failure ? (
        <p role="alert" className="t-cap" style={{ color: "var(--red)", marginTop: 10 }}>
          {failure}
        </p>
      ) : null}
    </Dialog>
  );
}

/** The doctor's details, as the edit form starts them. */
function draftOf(doctor: ClinicDoctor | null): DoctorDraft {
  return {
    name: doctor?.name ?? "",
    mobile: "",
    email: "",
    speciality: doctor?.speciality ?? "",
    registration: doctor?.registration ?? "",
    hprId: "",
    room: doctor?.room ?? "",
    consultationFee: Number(doctor?.fee ?? 0),
    videoFee: Number(doctor?.videoFee ?? 0),
  };
}
