"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/dialogs/FormField";
import { emailAddress, mobileNumber, requiredName } from "@/components/dialogs/validation";
import {
  updateMember,
  type ClinicRole,
  type MemberDraft,
  type TeamMember,
} from "@/features/staff/api/staff";

/**
 * Change someone on the team.
 *
 * <p>The mobile number is how they sign in, so it is kept: changing it means
 * they sign in with the new one.
 */
export type EditMemberDialogProps = {
  open: boolean;
  member: TeamMember | null;
  roles: ClinicRole[];
  onClose: () => void;
  onSaved?: () => void;
};

export function EditMemberDialog({ open, member, roles, onClose, onSaved }: EditMemberDialogProps) {
  const [draft, setDraft] = useState<MemberDraft>(() => draftOf(member));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    if (!member) return;
    const found: Record<string, string> = {};
    const nameError = requiredName(draft.name);
    if (nameError) found.name = nameError;
    const mobileError = mobileNumber(draft.mobile);
    if (mobileError) found.mobile = mobileError;
    const emailError = emailAddress(draft.email);
    if (emailError) found.email = emailError;
    if (!draft.role) found.role = "Choose what they do.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      await updateMember(member.id, draft);
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not change them.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit member"
      description={member ? `${member.name} · ${member.role}` : undefined}
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="edit-member-name"
          label="Full name"
          value={draft.name}
          onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
          error={errors.name}
          autoComplete="off"
        />
        <TextField
          id="edit-member-mobile"
          label="Mobile (their login)"
          value={draft.mobile}
          onChange={(value) => setDraft((current) => ({ ...current, mobile: value }))}
          error={errors.mobile}
          inputMode="numeric"
          autoComplete="off"
        />
      </div>

      <TextField
        id="edit-member-email"
        label="Email"
        value={draft.email}
        onChange={(value) => setDraft((current) => ({ ...current, email: value }))}
        error={errors.email}
        type="email"
        inputMode="email"
        autoComplete="off"
      />

      <div className="field" style={{ marginTop: 10 }}>
        <label htmlFor="edit-member-role">What they do</label>
        <select
          id="edit-member-role"
          className="input"
          value={draft.role}
          onChange={(event) =>
            setDraft((current) => ({ ...current, role: event.target.value }))
          }
        >
          {roles
            .filter((entry) => !entry.owner || entry.name === member?.roleName)
            .map((entry) => (
              <option key={entry.id} value={entry.name}>
                {entry.label}
              </option>
            ))}
        </select>
      </div>

      <TextField
        id="edit-member-speciality"
        label="What they do here"
        value={draft.speciality}
        onChange={(value) => setDraft((current) => ({ ...current, speciality: value }))}
        hint="A line the team screen shows under their name."
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

/** The member's details, as the edit form starts them. */
function draftOf(member: TeamMember | null): MemberDraft {
  return {
    name: member?.name ?? "",
    mobile: member?.mobile ?? "",
    email: member?.email ?? "",
    role: member?.roleName ?? "",
    speciality: member?.detail ?? "",
    registration: "",
  };
}
