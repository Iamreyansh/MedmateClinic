"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The step before something is thrown away.
 *
 * A destructive change is two steps: the screen that offers it, and a
 * dialog that names the thing and says what is lost. Nothing is removed
 * until that second step is answered.
 */
export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The heading: what is about to happen. */
  title: string;
  /** The thing itself, named. */
  subject: string;
  /** What is lost. */
  detail: string;
  /** The button that does it. */
  confirmLabel?: string;
  /** Called when the person confirms. */
  onConfirm: () => void | Promise<void>;
  /** Called when the service refuses. */
  onError?: (message: string) => void;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  subject,
  detail,
  confirmLabel = "Remove",
  onConfirm,
  onError,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (reason: unknown) {
      onError?.(reason instanceof Error ? reason.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="default"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void confirm()} disabled={busy}>
            {busy ? "Removing…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ fontWeight: 700 }}>{subject}</p>
      <p className="t-cap" style={{ marginTop: 6 }}>
        {detail}
      </p>
    </Dialog>
  );
}
