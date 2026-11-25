import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { readVital, type NurseItem } from "@/features/nurse/types";

/**
 * The class a reading carries on the card.
 *
 * The stylesheet styles `.lv.high` and `.lv.low` inside `.nq-vitals`, and
 * `.lv.danger` everywhere — so a reading out of range is marked by the same
 * vocabulary the vitals dialog uses.
 */
function vitalClass(field: string, value: number | null): string | undefined {
  const state = readVital(field, value);
  if (state === "danger") return "lv danger";
  if (state === "high" || state === "low") return "lv high";
  return undefined;
}

export type NurseCardProps = {
  item: NurseItem;
  /** The nurse has opened the vitals dialog for this patient. */
  onTakeVitals: () => void;
};

/**
 * One patient on the nurse station.
 *
 * The card answers the three questions the nurse has: who is this, how long
 * have they been waiting, and how urgent is it. Emergencies are marked on the
 * card's own edge, so they are seen without reading the text.
 */
export function NurseCard({ item, onTakeVitals }: NurseCardProps) {
  const { patient, vitals } = item;

  return (
    <div className={cn("nq", item.priority !== "normal" && item.priority)}>
      <span className="tk">{item.token}</span>

      <div className="nq-main">
        <div className="nq-top">
          <b>
            {patient.name} · {patient.age} {patient.sex}
          </b>
          {item.priority === "emergency" ? (
            <span className="badge red solid">Emergency</span>
          ) : item.priority === "urgent" ? (
            <span className="badge gold">Urgent</span>
          ) : null}
          <span className={cn("nq-wait", item.waitedMinutes >= 30 && "late")}>
            {item.waitedMinutes} min
          </span>
        </div>

        {item.reason ? (
          <p style={{ color: "var(--muted)", fontSize: 12.5 }}>{item.reason}</p>
        ) : null}

        {vitals ? (
          <div className="nq-vitals">
            {vitals.tempF !== null ? (
              <span className={cn(vitalClass("tempF", vitals.tempF))}>
                Temp {vitals.tempF} °F
              </span>
            ) : null}
            {vitals.pulse !== null ? (
              <span className={cn(vitalClass("pulse", vitals.pulse))}>Pulse {vitals.pulse}</span>
            ) : null}
            {vitals.spo2 !== null ? (
              <span className={cn(vitalClass("spo2", vitals.spo2))}>SpO₂ {vitals.spo2}%</span>
            ) : null}
            {vitals.bp ? <span>BP {vitals.bp}</span> : null}
            {vitals.breathRate !== null ? (
              <span className={cn(vitalClass("breathRate", vitals.breathRate))}>
                RR {vitals.breathRate}
              </span>
            ) : null}
          </div>
        ) : null}

        {item.nextDoctor ? (
          <div className="ready-row" style={{ marginTop: 4 }}>
            <span>
              <Icon name="stetho" size={13} />
              Next: {item.nextDoctor.name}
            </span>
            {vitals ? <span className="ok">Ready for the doctor</span> : null}
          </div>
        ) : null}
      </div>

      <div className="nq-acts">
        <Button variant="secondary" icon="phone" size="sm">
          Call
        </Button>
        {vitals ? (
          <Button variant="secondary" icon="check" size="sm">
            Ready
          </Button>
        ) : (
          <Button icon="nurse" size="sm" onClick={onTakeVitals}>
            Take vitals
          </Button>
        )}
      </div>
    </div>
  );
}
