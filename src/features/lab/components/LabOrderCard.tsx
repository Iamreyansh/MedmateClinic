import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { LabOrder } from "@/features/lab/types";

export type LabOrderCardProps = {
  order: LabOrder;
  /** The technician is reporting a result for this order. */
  onReport: () => void;
  /** The sample moves on — collected, sent out. */
  onMove: (status: string, partner?: string) => void;
};

/** Where the sample is, as the bench shows it. */
const STATE_LABEL: Record<string, string> = {
  to_collect: "To collect",
  in_lab: "In lab",
  sent_out: "Sent out",
  reported: "Reported",
};

/**
 * One sample on the bench.
 *
 * The card names the patient, the test and where the sample is. A result that
 * came back out of range is marked on the card, so the doctor sees it flagged
 * when it arrives.
 */
export function LabOrderCard({ order, onReport, onMove }: LabOrderCardProps) {
  const isUrgent = order.critical;
  const isAbnormal = order.abnormal && !order.critical;

  return (
    <div className={cn("lab-card", isUrgent && "emergency", isAbnormal && "urgent")}>
      <div className="lab-main">
        <div className="lab-who">
          <span className="kiosk-av">{order.patient.initials ?? order.patient.name.slice(0, 2)}</span>
          <div style={{ minWidth: 0 }}>
            <b>
              {order.patient.name} · {order.patient.age} {order.patient.sex}
            </b>
            <div className="lab-tests" style={{ marginTop: 4 }}>
              <span className="badge plain">{order.test}</span>
              {order.sampleNo ? <span className="lab-no">{order.sampleNo}</span> : null}
              {order.critical ? (
                <span className="badge red solid">Critical</span>
              ) : order.abnormal ? (
                <span className="badge gold">Abnormal</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="lab-state">
          <span className="t-cap" style={{ fontSize: 12 }}>
            {STATE_LABEL[order.status] ?? order.status}
          </span>
          {order.partner ? (
            <span className="t-cap" style={{ fontSize: 12 }}>
              · {order.partner}
            </span>
          ) : null}
          {order.orderedBy ? (
            <span className="t-cap" style={{ fontSize: 12 }}>
              · ordered by {order.orderedBy.name}
            </span>
          ) : null}
        </div>

        {order.value ? (
          <div className="lab-mini">
            <b>{order.value}</b>
            {order.reference ? <span className="t-cap"> · range {order.reference}</span> : null}
          </div>
        ) : null}

        {order.note ? (
          <p className="t-cap" style={{ fontSize: 12 }}>
            {order.note}
          </p>
        ) : null}
      </div>

      <div className="lab-acts">
        {order.status === "to_collect" ? (
          <Button size="sm" icon="check" onClick={() => onMove("in_lab")}>
            Collected
          </Button>
        ) : null}
        {order.status === "in_lab" ? (
          <Button size="sm" icon="send" onClick={() => onMove("sent_out", "Tenet Diagnostics")}>
            Send out
          </Button>
        ) : null}
        {order.status !== "reported" ? (
          <Button variant="secondary" size="sm" icon="pen" onClick={onReport}>
            Add result
          </Button>
        ) : (
          <span className="t-cap" style={{ fontSize: 12 }}>
            <Icon name="check" size={14} /> Reported to the doctor
          </span>
        )}
      </div>
    </div>
  );
}
