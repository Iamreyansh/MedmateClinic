import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export type CertificateDetails = {
  /** What the certificate is for. */
  purpose: string;
  /** How the patient is identified on the certificate. */
  identification: string;
  /** The dates the certificate covers. */
  from: string;
  to: string;
  /** Anything else the doctor wants on it. */
  extra: string;
};

export type WriteCertificateDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with what the doctor wrote. */
  onWrite: (details: CertificateDetails) => void;
  /** The patient the certificate is about. */
  patientName?: string;
};

/** What a certificate is usually for. */
const PURPOSES = [
  "Leave from work",
  "Fitness to travel",
  "Fitness to return to school",
  "Medical leave for a sports event",
];

/**
 * Write a medical certificate.
 *
 * The fields here are the fields the certificate prints, so the doctor writes
 * the certificate rather than describing one they want written later.
 */
export function WriteCertificateDialog({
  open,
  onClose,
  onWrite,
  patientName,
}: WriteCertificateDialogProps) {
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [identification, setIdentification] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [extra, setExtra] = useState("");

  const ready = purpose.trim().length > 0 && identification.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Write a certificate"
      description={
        patientName ? `The certificate for ${patientName}. It prints on the clinic letterhead.` : "It prints on the clinic letterhead."
      }
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="cert"
            disabled={!ready}
            onClick={() => {
              onWrite({ purpose, identification, from, to, extra });
              onClose();
            }}
          >
            Write the certificate
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label>What is it for?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {PURPOSES.map((option) => (
            <button
              key={option}
              type="button"
              className={cn("chip", purpose === option && "on")}
              onClick={() => setPurpose(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="cert-identification">How is the patient identified?</label>
        <Input
          id="cert-identification"
          value={identification}
          placeholder="Mole on right cheek"
          onChange={(event) => setIdentification(event.target.value)}
        />
        <p className="t-cap" style={{ marginTop: 4 }}>
          A photograph is not on the certificate, so the patient has to be identifiable from it.
        </p>
      </div>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="cert-from">Rest advised from</label>
          <Input id="cert-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cert-to">Fit to resume from</label>
          <Input id="cert-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="cert-extra">Anything else on it</label>
        <TextArea
          id="cert-extra"
          value={extra}
          placeholder="Anything the employer or the school should know."
          onChange={(event) => setExtra(event.target.value)}
        />
      </div>
    </Dialog>
  );
}
