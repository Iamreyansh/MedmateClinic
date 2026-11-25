import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  blockingFindings,
  safetyFindings,
  type SafetyFinding,
  type SafetyLevel,
} from "@/features/consult/safety";
import type { DiagnosisLine, MedicineLine, VisitPatient } from "@/types/visit";

export type SafetyPanelProps = {
  patient: VisitPatient | null;
  medicines: MedicineLine[];
  diagnoses?: DiagnosisLine[];
  examination?: Array<Record<string, string>>;
  /** The findings the doctor has acknowledged, by id. */
  acknowledged?: string[];
  /** Called when a finding is ticked or unticked. */
  onAcknowledge?: (id: string, acknowledged: boolean) => void;
};

/** The class the stylesheet knows each level by. */
const LEVEL_CLASS: Record<SafetyLevel, string> = {
  block: "stop",
  warn: "warn",
  info: "ok",
};

/** The colour of the little badge beside each finding. */
const TAG_CLASS: Record<SafetyLevel, string> = {
  block: "red",
  warn: "gold",
  info: "blue",
};

/**
 * The safety checks, as the doctor reads them.
 *
 * The stylesheet draws this already — `.sf` is the panel, `.sf-list` the rows,
 * `.sf-tag` the little coloured label — so this component only decides what
 * goes in it and which findings the doctor has already ticked.
 */
export function SafetyPanel({
  patient,
  medicines,
  diagnoses = [],
  examination = [],
  acknowledged = [],
  onAcknowledge,
}: SafetyPanelProps) {
  const findings = safetyFindings(patient, medicines, diagnoses, examination);
  const blocking = blockingFindings(findings).length;
  const acked = new Set(acknowledged);

  if (findings.length === 0) {
    return (
      <div className="sf ok">
        <Icon name="shield" size={18} />
        <span>Nothing to check before signing.</span>
      </div>
    );
  }

  return (
    <div className={cn("sf", blocking > 0 ? "stop" : "warn")}>
      <div className="sf-h">
        <Icon name="shield" size={18} />
        <span>
          {findings.length} thing{findings.length === 1 ? "" : "s"} to check before signing
        </span>
      </div>

      <ul className="sf-list">
        {findings.map((finding) => (
          <FindingRow
            key={finding.id}
            finding={finding}
            acknowledged={acked.has(finding.id)}
            onAcknowledge={onAcknowledge}
          />
        ))}
      </ul>
    </div>
  );
}

function FindingRow({
  finding,
  acknowledged,
  onAcknowledge,
}: {
  finding: SafetyFinding;
  acknowledged: boolean;
  onAcknowledge?: (id: string, acknowledged: boolean) => void;
}) {
  // A block cannot be ticked away — it has to be fixed in the prescription.
  const tickable = finding.level !== "block" && Boolean(onAcknowledge);

  return (
    <li>
      <span className={cn("sf-tag", TAG_CLASS[finding.level])}>{finding.label}</span>
      <div>
        <b>{finding.message}</b>
        {tickable ? (
          <label className="sf-ack-row">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => onAcknowledge?.(finding.id, event.target.checked)}
            />
            <span>I have checked this</span>
          </label>
        ) : null}
      </div>
    </li>
  );
}

export { LEVEL_CLASS };
