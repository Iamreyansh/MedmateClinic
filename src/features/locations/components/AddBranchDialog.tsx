"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/dialogs/FormField";
import { requiredName } from "@/components/dialogs/validation";
import { addBranch, type BranchDraft } from "@/features/locations/api/locations";

/**
 * Add a branch.
 *
 * <p>A branch is a place the clinic works from, with its own letterhead and
 * its own rooms. The name is how the clinic tells its branches apart.
 */
export type AddBranchDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export function AddBranchDialog({ open, onClose, onSaved }: AddBranchDialogProps) {
  const [draft, setDraft] = useState<BranchDraft>({
    name: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    rooms: 1,
    hfrId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    const found: Record<string, string> = {};
    const nameError = requiredName(draft.name);
    if (nameError) found.name = nameError;
    if (draft.rooms < 0) found.rooms = "A branch has at least one room.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      await addBranch({ ...draft, rooms: Number(draft.rooms) || 0 });
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not add the branch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a branch"
      description="A place the clinic works from, with its own letterhead."
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Adding…" : "Add the branch"}
          </Button>
        </>
      }
    >
      <TextField
        id="branch-name"
        label="Name"
        value={draft.name}
        onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
        error={errors.name}
        hint="Indiranagar, Koramangala — the name the clinic knows it by."
        autoComplete="off"
      />

      <TextField
        id="branch-address"
        label="Address"
        value={draft.address}
        onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
        autoComplete="off"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="branch-city"
          label="City"
          value={draft.city}
          onChange={(value) => setDraft((current) => ({ ...current, city: value }))}
          autoComplete="off"
        />
        <TextField
          id="branch-state"
          label="State"
          value={draft.state}
          onChange={(value) => setDraft((current) => ({ ...current, state: value }))}
          autoComplete="off"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="branch-phone"
          label="Phone"
          value={draft.phone}
          onChange={(value) => setDraft((current) => ({ ...current, phone: value }))}
          inputMode="tel"
          autoComplete="off"
        />
        <TextField
          id="branch-rooms"
          label="Consulting rooms"
          value={String(draft.rooms)}
          onChange={(value) => setDraft((current) => ({ ...current, rooms: Number(value) || 0 }))}
          error={errors.rooms}
          type="number"
          inputMode="numeric"
        />
      </div>

      <TextField
        id="branch-hfr"
        label="HFR facility id"
        value={draft.hfrId}
        onChange={(value) => setDraft((current) => ({ ...current, hfrId: value }))}
        hint="The health facility registration this branch answers under."
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
