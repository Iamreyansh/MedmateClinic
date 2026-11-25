import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { BillingBill } from "@/features/billing/types";

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function money(value: number) {
  return `₹${rupees.format(Math.round(value))}`;
}

/**
 * The bill of supply.
 *
 * It prints for the patient, so it carries what the law asks for: the
 * clinic's registration and GSTIN, the doctor's registration, the place of
 * supply, and the amount in words. Healthcare is exempt from GST, so the tax
 * line says so rather than showing a zero.
 */
export function InvoicePaper({
  bill,
  onRefund,
}: {
  bill: BillingBill;
  onRefund?: () => void;
}) {
  return (
    <section className="card inv-paper">
      <div className="inv-h">
        <div>
          <b style={{ fontSize: 18, color: "var(--forest)" }}>{bill.clinic.name}</b>
          <p className="t-cap" style={{ marginTop: 2, lineHeight: 1.5 }}>
            {bill.clinic.address}
            <br />
            {bill.clinic.phone} · GSTIN {bill.clinic.gstin}
            <br />
            {bill.clinic.registration} · HFR {bill.clinic.hfr}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="inv-title">Bill of supply</div>
          <b>{bill.number}</b>
          <p className="t-cap" style={{ marginTop: 2 }}>
            {bill.createdAt}
            {bill.token ? ` · ${bill.token}` : ""}
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
          <span>Place of supply</span>
          <b>{bill.placeOfSupply}</b>
        </div>
        <div>
          <span>Status</span>
          <b>{bill.status === "paid" ? "Paid" : bill.status === "refunded" ? "Refunded" : "To pay"}</b>
        </div>
      </div>

      <ul className="bill-lines">
        {bill.lines.map((line, index) => (
          <li key={`${line.name}-${index}`}>
            <span>
              <b>{line.name}</b>
              <span className="t-cap" style={{ display: "block" }}>
                {line.description} · SAC {line.sac} · GST {line.gstRate}
              </span>
            </span>
            <b>{money(line.amount)}</b>
          </li>
        ))}
      </ul>

      <div className="bill-total">
        <div>
          <span>Subtotal</span>
          <b>{money(bill.subtotal)}</b>
        </div>
        <div>
          <span>Discount</span>
          <b>{money(bill.discount)}</b>
        </div>
        <div>
          <span>GST</span>
          <b>{bill.exemptNote}</b>
        </div>
        <div className="grand">
          <span>Total</span>
          <b>{money(bill.total)}</b>
        </div>
      </div>

      <p className="t-cap" style={{ marginTop: 8 }}>
        {bill.totalInWords}
      </p>

      {bill.timeline.length > 0 ? (
        <ul className="rp-notes" style={{ marginTop: 10 }}>
          {bill.timeline.map((entry) => (
            <li className="info" key={`${entry.label}-${entry.at}`}>
              <Icon name="check" size={18} />
              <span>
                <b>{entry.label}</b> · {entry.at}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="inv-pay">
        {bill.status === "paid" ? (
          <>
            <Icon name="check" size={16} />
            Paid by {bill.payMode ?? "cash"} · {bill.paidAt}
          </>
        ) : (
          <>
            <Icon name="alert" size={16} />
            To pay at the front desk: {money(bill.total)}
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Button variant="secondary" icon="print">
          Print the bill
        </Button>
        {bill.status !== "paid" ? (
          <Button icon="rupee">Take the payment</Button>
        ) : onRefund ? (
          <Button variant="danger" icon="back" onClick={onRefund}>
            Refund
          </Button>
        ) : null}
      </div>

      <p className="t-cap" style={{ marginTop: 10 }}>
        <Link to={`/billing/receipt/${bill.id}`}>The patient's receipt is a separate page</Link>
      </p>
    </section>
  );
}
