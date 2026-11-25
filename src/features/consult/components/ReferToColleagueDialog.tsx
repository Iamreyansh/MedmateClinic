import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  COLLEAGUES,
  REFERRAL_REASONS,
  URGENCIES,
  type Colleague,
  type Urgency,
} from "@/features/consult/referral";

export type ReferToColleagueDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with what the doctor chose. */
  onRefer: (referral: { colleague: Colleague; urgency: Urgency; reason: string; note: string }) => void;
  /** The patient the referral is about. */
  patientName?: string;
};

/**
 * Refer a patient to a colleague.
 *
 * The doctor picks who, how soon and why, and leaves a note. The patient is
 * told at the desk, so the note is what the front desk reads out.
 */
export function ReferToColleagueDialog({
  open,
  onClose,
  onRefer,
  patientName,
}: ReferToColleagueDialogProps) {
  const [colleague, setColleague] = useState<Colleague | null>(null);
  const [urgency, setUrgency] = useState<Urgency>("routine");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const ready = Boolean(colleague) && reason.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Refer to a colleague"
      description={
        patientName ? `The referral for ${patientName}. The front desk reads it out.` : "The front desk reads it out."
      }
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="send"
            disabled={!ready}
            onClick={() => {
              if (!colleague) return;
              onRefer({ colleague, urgency, reason, note });
              onClose();
            }}
          >
            Refer the patient
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Who is it for?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {COLLEAGUES.map((person) => (
            <button
              key={person.id}
              type="button"
              className={cn("chip", colleague?.id === person.id && "on")}
              onClick={() => setColleague(person)}
            >
              {person.name.split(" ").slice(0, 2).join(" ")}
            </button>
          ))}
        </div>
        {colleague ? (
          <p className="t-cap" style={{ marginTop: 6 }}>
            {colleague.speciality} · {colleague.hospital} · {colleague.phone}
          </p>
        ) : null}
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>How soon?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {URGENCIES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("chip", urgency === option.value && "on")}
              onClick={() => setUrgency(option.value)}
            >
              {option.label} — {option.detail}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="refer-reason">Why are they being referred?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {REFERRAL_REASONS.map((option) => (
            <button
              key={option}
              type="button"
              className={cn("chip", reason === option && "on")}
              onClick={() => setReason(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="refer-note">Note for the colleague</label>
        <TextArea
          id="refer-note"
          value={note}
          placeholder="What you found, what you think, and what you have ruled out."
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {urgency === "urgent" ? (
        <div className="note red" style={{ marginTop: 12 }}>
          <Icon name="alert" size={18} />
          <span>
            An urgent referral is called through, not sent. The front desk makes the call before the
            patient leaves.
          </span>
        </div>
      ) : null}
    </Dialog>
  );
}
