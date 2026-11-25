import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";

export type CallPatientDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the note the front desk leaves about the call. */
  onCall: (note: { outcome: string; note: string }) => void;
  /** The patient being called. */
  patientName?: string;
  /** The patient's mobile, masked. */
  patientMobile?: string;
  /** The number to dial, in full. */
  patientPhone?: string;
};

/** How the call went. */
const OUTCOMES = [
  { value: "reached", label: "Spoke to them" },
  { value: "no-answer", label: "No answer" },
  { value: "left-message", label: "Left a message" },
  { value: "wrong-number", label: "Wrong number" },
];

/**
 * Call the patient.
 *
 * The call happens on the desk's own phone — the app does not place calls — so
 * this is the note that is left afterwards, and the number to dial.
 */
export function CallPatientDialog({
  open,
  onClose,
  onCall,
  patientName,
  patientMobile,
  patientPhone,
}: CallPatientDialogProps) {
  const [outcome, setOutcome] = useState("reached");
  const [note, setNote] = useState("");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Call the patient"
      description={patientName ? `Call ${patientName}.` : "The call happens on the desk phone."}
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="phone"
            onClick={() => {
              onCall({ outcome, note });
              onClose();
            }}
          >
            Save the note
          </Button>
        </>
      }
    >
      {patientPhone ? (
        <div className="note mint" style={{ marginBottom: 14 }}>
          <Icon name="phone" size={18} />
          <span>
            Dial <b>{patientPhone}</b>
            {patientMobile ? ` · the list shows it as ${patientMobile}` : ""}.
          </span>
        </div>
      ) : null}

      <div className="field" style={{ marginBottom: 14 }}>
        <label>How did it go?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {OUTCOMES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`chip${outcome === option.value ? " on" : ""}`}
              onClick={() => setOutcome(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="call-note">What was said</label>
        <Input
          id="call-note"
          value={note}
          placeholder="Asked to come tomorrow morning instead"
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Dialog>
  );
}
