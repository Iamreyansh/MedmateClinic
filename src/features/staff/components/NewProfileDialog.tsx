"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/dialogs/FormField";
import { clockTime, requiredName } from "@/components/dialogs/validation";
import { addProfile, type ClinicRole, type ProfileDraft } from "@/features/staff/api/staff";

/**
 * A new profile.
 *
 * <p>A profile is what a new person usually is: the role they hold, what
 * they do, what they charge and the hours they keep. The clinic keeps the
 * profiles it has, so the next doctor it hires is seven fields, not seven
 * fields and a memory.
 */
export type NewProfileDialogProps = {
  open: boolean;
  roles: ClinicRole[];
  onClose: () => void;
  onSaved?: () => void;
};

export function NewProfileDialog({ open, roles, onClose, onSaved }: NewProfileDialogProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    name: "",
    role: roles[0]?.name ?? "",
    speciality: "",
    registration: "",
    hprId: "",
    consultationFee: 0,
    videoFee: 0,
    sessionStart: "",
    sessionEnd: "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    const found: Record<string, string> = {};
    const nameError = requiredName(draft.name);
    if (nameError) found.name = nameError;
    if (!draft.role) found.role = "Choose the role this profile is for.";
    if (draft.sessionStart) {
      const timeError = clockTime(draft.sessionStart);
      if (timeError) found.sessionStart = timeError;
    }
    if (draft.sessionEnd) {
      const timeError = clockTime(draft.sessionEnd);
      if (timeError) found.sessionEnd = timeError;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      await addProfile({
        ...draft,
        consultationFee: Number(draft.consultationFee) || 0,
        videoFee: Number(draft.videoFee) || 0,
      });
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not save the profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New profile"
      description="What a new person usually is, so the next one takes a moment to add."
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </>
      }
    >
      <TextField
        id="profile-name"
        label="Profile name"
        value={draft.name}
        onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
        error={errors.name}
        hint="The clinic's own name for it — Senior night doctor, say."
        autoComplete="off"
      />

      <SelectField
        id="profile-role"
        label="The role it is for"
        value={draft.role}
        options={roles.map((entry) => ({ value: entry.name, label: entry.label }))}
        onChange={(value) => setDraft((current) => ({ ...current, role: value }))}
        error={errors.role}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="profile-speciality"
          label="What they do"
          value={draft.speciality}
          onChange={(value) => setDraft((current) => ({ ...current, speciality: value }))}
          autoComplete="off"
        />
        <TextField
          id="profile-registration"
          label="Registration"
          value={draft.registration}
          onChange={(value) => setDraft((current) => ({ ...current, registration: value }))}
          autoComplete="off"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="profile-fee"
          label="Consultation fee"
          value={String(draft.consultationFee)}
          onChange={(value) =>
            setDraft((current) => ({ ...current, consultationFee: Number(value) || 0 }))
          }
          type="number"
          inputMode="numeric"
        />
        <TextField
          id="profile-video-fee"
          label="Video consultation fee"
          value={String(draft.videoFee)}
          onChange={(value) => setDraft((current) => ({ ...current, videoFee: Number(value) || 0 }))}
          type="number"
          inputMode="numeric"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="profile-start"
          label="The day starts at"
          value={draft.sessionStart}
          onChange={(value) => setDraft((current) => ({ ...current, sessionStart: value }))}
          error={errors.sessionStart}
          placeholder="09:30"
          inputMode="numeric"
          autoComplete="off"
        />
        <TextField
          id="profile-end"
          label="The day ends at"
          value={draft.sessionEnd}
          onChange={(value) => setDraft((current) => ({ ...current, sessionEnd: value }))}
          error={errors.sessionEnd}
          placeholder="13:00"
          inputMode="numeric"
          autoComplete="off"
        />
      </div>

      {failure ? (
        <p role="alert" className="t-cap" style={{ color: "var(--red)", marginTop: 10 }}>
          {failure}
        </p>
      ) : null}
    </Dialog>
  );
}
