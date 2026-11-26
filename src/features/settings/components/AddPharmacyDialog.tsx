"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/dialogs/FormField";
import { emailAddress, requiredName } from "@/components/dialogs/validation";
import { addPharmacy, type PharmacyDraft } from "@/features/settings/api/settings";

/**
 * Add a pharmacy.
 *
 * <p>The patient chooses the pharmacy and the doctor records who chose, so
 * the clinic keeps the places it can send to. The name is how the clinic
 * tells them apart.
 */
export type AddPharmacyDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export function AddPharmacyDialog({ open, onClose, onSaved }: AddPharmacyDialogProps) {
  const [draft, setDraft] = useState<PharmacyDraft>({
    name: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    contactPerson: "",
    inactive: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
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
      await addPharmacy(draft);
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not add the pharmacy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a pharmacy"
      description="A place a prescription can be collected from."
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Adding…" : "Add the pharmacy"}
          </Button>
        </>
      }
    >
      <TextField
        id="pharmacy-name"
        label="Name"
        value={draft.name}
        onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
        error={errors.name}
        autoComplete="off"
      />
      <TextField
        id="pharmacy-address"
        label="Address"
        value={draft.address}
        onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
        autoComplete="off"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="pharmacy-city"
          label="City"
          value={draft.city}
          onChange={(value) => setDraft((current) => ({ ...current, city: value }))}
          autoComplete="off"
        />
        <TextField
          id="pharmacy-state"
          label="State"
          value={draft.state}
          onChange={(value) => setDraft((current) => ({ ...current, state: value }))}
          autoComplete="off"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="pharmacy-phone"
          label="Phone"
          value={draft.phone}
          onChange={(value) => setDraft((current) => ({ ...current, phone: value }))}
          inputMode="tel"
          autoComplete="off"
        />
        <TextField
          id="pharmacy-contact"
          label="Who to ask for"
          value={draft.contactPerson}
          onChange={(value) => setDraft((current) => ({ ...current, contactPerson: value }))}
          autoComplete="off"
        />
      </div>
      <TextField
        id="pharmacy-email"
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
