import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { DeskItem } from "@/features/desk/types";

/** One patient at the desk, with what is still missing for them. */
export function DeskRow({
  item,
  busy,
  onHandOver,
}: {
  item: DeskItem;
  busy: boolean;
  onHandOver: () => void;
}) {
  const missing = missingFor(item);

  return (
    <div className={cn("card qitem desk-item")}>
      <span className="tk" style={item.kind === "A" ? { background: "var(--forest)", color: "var(--gold)" } : undefined}>
        {item.token}
      </span>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ fontSize: 15 }}>
            {item.patient.name} · {item.patient.age} {item.patient.sex}
          </b>
          {item.checkedOut ? (
            <span className="badge mint">Handed over</span>
          ) : missing.length > 0 ? (
            <span className="badge gold">{missing.length} to do</span>
          ) : (
            <span className="badge">Ready</span>
          )}
        </div>

        <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2 }}>{item.reason}</p>

        <div className="pr-chips" style={{ marginTop: 8 }}>
          <span className={cn("badge", item.prescription.status === "signed" ? "mint" : "plain")}>
            {item.prescription.status === "signed" ? "Prescription ready" : "No prescription"}
          </span>
          {item.payment.status !== "none" ? (
            <span className={cn("badge", item.payment.status === "paid" ? "mint" : "gold")}>
              {item.payment.status === "paid" ? "Paid" : `₹${item.payment.amount} to collect`}
            </span>
          ) : null}
          {item.followUp ? <span className="badge blue">Follow-up {item.followUp.label}</span> : null}
          {item.lab ? <span className="badge blue">{item.lab.label}</span> : null}
        </div>

        {missing.length > 0 ? (
          <div className="desk-note">
            Waiting on: {missing.join(", ")}
          </div>
        ) : null}

        <div className="acts" style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <Button size="sm" variant="secondary" icon="print" disabled={item.prescription.status !== "signed"}>
            Print
          </Button>
          <Button size="sm" variant="secondary" icon="rupee" disabled={item.payment.status === "paid"}>
            Collect
          </Button>
          <Button size="sm" icon="check" disabled={busy || item.checkedOut} onClick={onHandOver}>
            {busy ? "Handing over…" : "Hand over"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** What the desk still has to do for this patient. */
function missingFor(item: DeskItem): string[] {
  const missing: string[] = [];
  if (item.prescription.status !== "signed") missing.push("the prescription");
  if (item.payment.status !== "none" && item.payment.status !== "paid") missing.push("the bill");
  if (item.followUp && item.followUp.status === "pending") missing.push("the follow-up");
  if (item.lab && item.lab.status === "ordered") missing.push("the lab sample");
  return missing;
}
