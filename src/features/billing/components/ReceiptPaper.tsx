import { Icon } from "@/components/ui/Icon";
import type { BillingBill } from "@/features/billing/types";

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function money(value: number) {
  return `₹${rupees.format(Math.round(value))}`;
}

/**
 * The receipt.
 *
 * A receipt is not the bill: the bill is what the clinic owes the tax
 * department, and the receipt is the proof the patient paid. So it is short —
 * what was paid, how, and when — and it says so plainly.
 */
export function ReceiptPaper({ bill }: { bill: BillingBill }) {
  const paid = bill.status === "paid";

  return (
    <section className="card inv-paper">
      <div className="inv-h">
        <div>
          <b style={{ fontSize: 18, color: "var(--forest)" }}>{bill.clinic.name}</b>
          <p className="t-cap" style={{ marginTop: 2, lineHeight: 1.5 }}>
            {bill.clinic.address}
            <br />
            {bill.clinic.phone} · GSTIN {bill.clinic.gstin}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="inv-title">Payment receipt</div>
          <b>for bill {bill.number}</b>
          <p className="t-cap" style={{ marginTop: 2 }}>
            {bill.paidAt ?? bill.createdAt}
          </p>
        </div>
      </div>

      <div className="inv-meta">
        <div>
          <span>Patient</span>
          <b>
            {bill.patient.name} · {bill.patient.age} {bill.patient.sex}
          </b>
        </div>
        <div>
          <span>Doctor</span>
          <b>{bill.doctor.name}</b>
        </div>
        <div>
          <span>Paid by</span>
          <b>{paid ? (bill.payMode ?? "cash") : "Not paid"}</b>
        </div>
        <div>
          <span>Token</span>
          <b>{bill.token ?? "—"}</b>
        </div>
      </div>

      <ul className="bill-lines">
        {bill.lines.map((line, index) => (
          <li key={`${line.name}-${index}`}>
            <span>
              <b>{line.name}</b>
            </span>
            <b>{money(line.amount)}</b>
          </li>
        ))}
      </ul>

      <div className="bill-total">
        {bill.discount > 0 ? (
          <div>
            <span>Discount</span>
            <b>−{money(bill.discount)}</b>
          </div>
        ) : null}
        <div className="grand">
          <span>{paid ? "Paid" : "To pay"}</span>
          <b>{money(bill.total)}</b>
        </div>
      </div>

      <p className="t-cap" style={{ marginTop: 8 }}>
        {bill.totalInWords}
      </p>

      <div className={paid ? "inv-pay" : "note gold"} style={{ marginTop: 12 }}>
        <Icon name={paid ? "check" : "alert"} size={16} />
        {paid
          ? `Received by ${bill.payMode ?? "cash"} on ${bill.paidAt}.`
          : "This bill has not been paid yet."}
      </div>
    </section>
  );
}
