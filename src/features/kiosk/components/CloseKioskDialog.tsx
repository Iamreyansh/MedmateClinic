import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { closeKiosk } from "@/features/kiosk/api/kiosk";

export type CloseKioskDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called once the kiosk is closed. */
  onClosed: () => void;
  /** Called when the PIN is wrong. */
  onError: (message: string) => void;
};

/**
 * Close the kiosk.
 *
 * The front desk's PIN, the same one that locks the device, closes the kiosk.
 * Without it a patient could turn the screen back on.
 */
export function CloseKioskDialog({ open, onClose, onClosed, onError }: CloseKioskDialogProps) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const close = async () => {
    setBusy(true);
    try {
      await closeKiosk(pin);
      setPin("");
      onClosed();
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : "Could not close the kiosk");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Close the kiosk"
      description="The tablet goes back to the front desk's own screen."
      closeLabel="Cancel"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="lock" disabled={pin.length !== 4 || busy} onClick={() => void close()}>
            {busy ? "Closing…" : "Close the kiosk"}
          </Button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="kiosk-pin">Your 4-digit PIN</label>
        <input
          id="kiosk-pin"
          className="input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
        />
      </div>

      <div className="note gold" style={{ marginTop: 14 }}>
        <Icon name="alert" size={18} />
        <div>Anything the patient typed on the kiosk is cleared.</div>
      </div>
    </Dialog>
  );
}
