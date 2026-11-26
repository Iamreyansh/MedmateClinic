"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/dialogs/FormField";
import { pinDigits } from "@/components/dialogs/validation";
import { fetchAccount, saveAccount, type Account } from "@/features/staff-admin/api/account";
import { savePin } from "@/features/settings/api/settings";

/**
 * The account of the person signed in.
 *
 * <p>The PIN unlocks this screen after it goes quiet, so nobody has to wait
 * for a one-time code each time they come back to it.
 */
export type MyAccountDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called when the person asks to sign out. */
  onSignOut?: () => void;
};

export function MyAccountDialog({ open, onClose, onSignOut }: MyAccountDialogProps) {
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [registration, setRegistration] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinAgain, setNewPinAgain] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchAccount()
      .then((payload) => {
        if (!alive) return;
        const record = payload.items[0] ?? null;
        setAccount(record);
        setName(record?.name ?? "");
        setEmail(record?.email ?? "");
        setSpeciality(record?.speciality ?? "");
        setRegistration(record?.registration ?? "");
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setFailure(reason instanceof Error ? reason.message : "Could not open your account.");
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const saveDetails = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const payload = await saveAccount({ name, email, speciality, registration });
      setAccount(payload.items[0] ?? null);
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not save your details.");
    } finally {
      setSaving(false);
    }
  };

  const saveThePin = async () => {
    setPinError(null);
    const check = pinDigits(newPin);
    if (check) {
      setPinError(check);
      return;
    }
    if (newPin !== newPinAgain) {
      setPinError("The two new PINs are not the same.");
      return;
    }
    setSavingPin(true);
    try {
      await savePin({ currentPin, newPin, newPinAgain });
      setCurrentPin("");
      setNewPin("");
      setNewPinAgain("");
    } catch (reason: unknown) {
      setPinError(reason instanceof Error ? reason.message : "Could not save the PIN.");
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="My account"
      description={account ? `${account.name} · ${account.role}` : undefined}
      size="wide"
      footer={
        <>
          {onSignOut ? (
            <Button variant="ghost" icon="out" onClick={onSignOut} disabled={savingPin}>
              Sign out
            </Button>
          ) : null}
          <Button onClick={onClose} disabled={savingPin}>
            Done
          </Button>
        </>
      }
    >
      <div className="t-eyebrow">Your details</div>
      <TextField
        id="account-name"
        label="Full name"
        value={name}
        onChange={setName}
        autoComplete="off"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          id="account-email"
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          inputMode="email"
          autoComplete="off"
        />
        <TextField
          id="account-speciality"
          label="What you do"
          value={speciality}
          onChange={setSpeciality}
          autoComplete="off"
        />
      </div>
      <TextField
        id="account-registration"
        label="Your registration"
        value={registration}
        onChange={setRegistration}
        autoComplete="off"
      />
      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" size="sm" onClick={() => void saveDetails()} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </Button>
      </div>

      <div className="t-eyebrow" style={{ marginTop: 20 }}>
        Change your PIN
      </div>
      <p className="t-cap" style={{ marginTop: 4 }}>
        The screen locks after 15 minutes without use. Your PIN unlocks it, so you do not need a new
        code each time.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
        <TextField
          id="account-current-pin"
          label="Current PIN"
          value={currentPin}
          onChange={setCurrentPin}
          inputMode="numeric"
          autoComplete="off"
        />
        <TextField
          id="account-new-pin"
          label="New PIN"
          value={newPin}
          onChange={setNewPin}
          inputMode="numeric"
          autoComplete="off"
        />
      </div>
      <TextField
        id="account-new-pin-again"
        label="New PIN again"
        value={newPinAgain}
        onChange={setNewPinAgain}
        error={pinError}
        inputMode="numeric"
        autoComplete="off"
      />
      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" size="sm" onClick={() => void saveThePin()} disabled={savingPin}>
          {savingPin ? "Saving…" : "Save PIN"}
        </Button>
      </div>

      {failure ? (
        <p role="alert" className="t-cap" style={{ color: "var(--red)", marginTop: 10 }}>
          {failure}
        </p>
      ) : null}
    </Dialog>
  );
}
