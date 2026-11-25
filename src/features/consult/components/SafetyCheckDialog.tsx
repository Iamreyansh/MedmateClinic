import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SafetyPanel } from "@/features/consult/components/SafetyPanel";
import { blockingFindings, safetyFindings } from "@/features/consult/safety";
import type { DiagnosisLine, MedicineLine, VisitPatient } from "@/types/visit";

export type SafetyCheckDialogProps = {
  open: boolean;
  onClose: () => void;
  patient: VisitPatient | null;
  medicines: MedicineLine[];
  diagnoses?: DiagnosisLine[];
  examination?: Array<Record<string, string>>;
  /** Called when the doctor has read everything and wants to sign. */
  onSign: () => void;
  /** True while the prescription is being signed. */
  signing?: boolean;
};

/**
 * The safety check before signing.
 *
 * The last thing between the doctor and a signed prescription: every finding
 * the checker has, laid out, with a tick beside each one. A clash that blocks
 * the prescription stops the sign button; a warning does not, but it has to be
 * acknowledged first.
 */
export function SafetyCheckDialog({
  open,
  onClose,
  patient,
  medicines,
  diagnoses = [],
  examination = [],
  onSign,
  signing,
}: SafetyCheckDialogProps) {
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const findings = safetyFindings(patient, medicines, diagnoses, examination);
  const blocking = blockingFindings(findings);
  const needsAck = findings.filter((finding) => finding.level === "warn");
  const outstanding = needsAck.filter((finding) => !acknowledged.includes(finding.id));

  const canSign = blocking.length === 0 && outstanding.length === 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Safety check before signing"
      description={
        findings.length === 0
          ? "Nothing on this prescription needs a second look."
          : "Read each one before the prescription is signed."
      }
      closeLabel="Go back to the prescription"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Go back
          </Button>
          <Button
            icon="check"
            disabled={!canSign || signing}
            onClick={onSign}
          >
            {blocking.length > 0
              ? "Fix the clash first"
              : outstanding.length > 0
                ? `${outstanding.length} to check`
                : "Sign the prescription"}
          </Button>
        </>
      }
    >
      {blocking.length > 0 ? (
        <div className="note red" style={{ marginBottom: 14 }}>
          <Icon name="alert" size={18} />
          <span>
            {blocking.length === 1
              ? "One medicine clashes with what is on record. It has to come off the prescription before this can be signed."
              : `${blocking.length} medicines clash with what is on record. They have to come off the prescription before this can be signed.`}
          </span>
        </div>
      ) : null}

      <SafetyPanel
        patient={patient}
        medicines={medicines}
        diagnoses={diagnoses}
        examination={examination}
        acknowledged={acknowledged}
        onAcknowledge={(id, isAcknowledged) =>
          setAcknowledged((current) =>
            isAcknowledged ? [...current, id] : current.filter((entry) => entry !== id),
          )
        }
      />

      {findings.length > 0 ? (
        <ul className="pr-tl" style={{ marginTop: 16 }}>
          {medicines.map((medicine, index) => (
            <li key={`${medicine.name}-${index}`}>
              <div className="pr-tl-d">
                <span>Line {index + 1}</span>
                <b>{medicine.name}</b>
              </div>
              <div>
                <div className="pr-tl-h">
                  <b>{medicine.generic ?? medicine.name}</b>
                  {medicine.dose ? <span className="badge">{medicine.dose}</span> : null}
                  {medicine.when ? <span className="badge">{medicine.when}</span> : null}
                  {medicine.forDays ? <span className="badge">{medicine.forDays}</span> : null}
                </div>
                {medicine.notes ? <p className="pr-tl-p">{medicine.notes}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Dialog>
  );
}
