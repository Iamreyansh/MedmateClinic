"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/dialogs/FormField";
import { requiredName } from "@/components/dialogs/validation";
import { updateBranch, type Branch, type BranchDraft } from "@/features/locations/api/locations";

/**
 * Change a branch.
 *
 * <p>The name and the address are the branch's letterhead, so they are
 * written on every prescription that goes out with it.
 */
export type EditBranchDialogProps = {
  open: boolean;
  branch: Branch | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function EditBranchDialog({ open, branch, onClose, onSaved }: EditBranchDialogProps) {
  const [draft, setDraft] = useState<BranchDraft>(() => draftOf(branch));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    if (!branch) return;
    const found: Record<string, string> = {};
    const nameError = requiredName(draft.name);
    if (nameError) found.name = nameError;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      await updateBranch(branch.id, { ...draft, rooms: Number(draft.rooms) || 0 });
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not change the branch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit branch"
      description={branch ? branch.name : undefined}
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
        id="edit-branch-name"
        label="Name"
        value={draft.name}
        onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
        error={errors.name}
        autoComplete="off"
      />
      <TextField
        id="edit-branch-address"
        label="Address"
        value={draft.address}
        onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
        autoComplete="off"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="edit-branch-city"
          label="City"
          value={draft.city}
          onChange={(value) => setDraft((current) => ({ ...current, city: value }))}
          autoComplete="off"
        />
        <TextField
          id="edit-branch-state"
          label="State"
          value={draft.state}
          onChange={(value) => setDraft((current) => ({ ...current, state: value }))}
          autoComplete="off"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="edit-branch-phone"
          label="Phone"
          value={draft.phone}
          onChange={(value) => setDraft((current) => ({ ...current, phone: value }))}
          inputMode="tel"
          autoComplete="off"
        />
        <TextField
          id="edit-branch-rooms"
          label="Consulting rooms"
          value={String(draft.rooms)}
          onChange={(value) => setDraft((current) => ({ ...current, rooms: Number(value) || 0 }))}
          type="number"
          inputMode="numeric"
        />
      </div>
      <TextField
        id="edit-branch-hfr"
        label="HFR facility id"
        value={draft.hfrId}
        onChange={(value) => setDraft((current) => ({ ...current, hfrId: value }))}
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

/** The branch's details, as the edit form starts them. */
function draftOf(branch: Branch | null): BranchDraft {
  return {
    name: branch?.name ?? "",
    address: branch?.address ?? "",
    city: branch?.city ?? "",
    state: branch?.state ?? "",
    phone: branch?.phone ?? "",
    rooms: branch?.rooms ?? 1,
    hfrId: branch?.hfrId ?? "",
  };
}
