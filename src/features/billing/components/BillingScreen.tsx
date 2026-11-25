import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchTill, payBill, refundBill, createBill, closeTheDay } from "@/features/billing/api/billing";
import { InvoicePaper } from "@/features/billing/components/InvoicePaper";
import { NewBillDialog } from "@/features/billing/components/NewBillDialog";
import { RefundDialog } from "@/features/billing/components/RefundDialog";
import { CloseTheDayDialog } from "@/features/billing/components/CloseTheDayDialog";
import type { BillingBill, TillPayload } from "@/features/billing/types";

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function money(value: number) {
  return `₹${rupees.format(Math.round(value))}`;
}

/** How the patient can pay. */
const PAY_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

/** What the clinic can add to a bill. */
const CHARGES = [
  { name: "Consultation in-clinic", amount: 500 },
  { name: "Follow-up consultation", amount: 300 },
  { name: "Nebulisation", amount: 250 },
  { name: "Wound dressing", amount: 200 },
  { name: "ECG", amount: 350 },
];

/**
 * Billing and the point of sale.
 *
 * The left is what has been collected today and what is still to collect; the
 * right is the bill of supply, which prints for the patient.
 */
export function BillingScreen() {
  const [payload, setPayload] = useState<TillPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState<BillingBill | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // the three things the till does with money
  const [newBill, setNewBill] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTill()
      .then((data) => {
        if (!alive) return;
        setPayload(data);
        setBill(data.bill);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the till");
      });
    return () => {
      alive = false;
    };
  }, []);

  const summary = payload?.summary;
  const pending = payload?.pending ?? [];

  const takePayment = async (invoiceId: string, payMode: string) => {
    setBusy(invoiceId);
    try {
      await payBill(invoiceId, payMode);
      const fresh = await fetchTill();
      setPayload(fresh);
      setBill(fresh.bill);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not take the payment");
    } finally {
      setBusy(null);
    }
  };

  const refreshTill = async () => {
    const fresh = await fetchTill();
    setPayload(fresh);
    setBill(fresh.bill);
  };

  return (
    <AppShell activeHref="/billing">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Billing &amp; <em>POS</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {payload
              ? `Collected today ${money(summary?.collected ?? 0)} · ${summary?.pendingCount ?? 0} pending · ${summary?.refundCount ?? 0} refund`
              : "Loading the till…"}
          </p>
        </div>
        <div className="nq-btns">
          <Button variant="secondary" icon="plus" onClick={() => setNewBill(true)}>
            New bill
          </Button>
          <Button icon="check" onClick={() => setClosing(true)}>
            Close the day
          </Button>
        </div>
      </div>

      {error ? <div className="note red">{error}</div> : null}

      <div className="rx-grid">
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            To collect
          </div>
          {pending.length === 0 ? (
            <section className="card" style={{ padding: 16 }}>
              <p className="t-cap">Nothing is waiting to be paid.</p>
            </section>
          ) : (
            <div className="qitem-list">
              {pending.map((item) => (
                <div className="card qitem desk-item" key={item.invoiceId}>
                  <span className="tk">{item.number}</span>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 15 }}>
                      {item.patient.name} · {item.patient.age} {item.patient.sex}
                    </b>
                    <p className="t-cap" style={{ marginTop: 2 }}>
                      {item.description}
                    </p>
                    <div className="cash-quick" style={{ marginTop: 8 }}>
                      {PAY_MODES.map((mode) => (
                        <Button
                          key={mode.value}
                          size="sm"
                          variant={mode.value === "cash" ? "secondary" : "ghost"}
                          disabled={busy === item.invoiceId}
                          onClick={() => void takePayment(item.invoiceId, mode.value)}
                        >
                          {mode.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <b style={{ fontSize: 17, color: "var(--forest)" }}>{money(item.amount)}</b>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="t-eyebrow" style={{ margin: "18px 0 8px" }}>
            By payment mode
          </div>
          <section className="card" style={{ padding: 16 }}>
            {(payload?.byMode ?? []).length === 0 ? (
              <p className="t-cap">Nothing has been paid yet.</p>
            ) : (
              (payload?.byMode ?? []).map((mode) => (
                <div className="hbar" key={mode.mode}>
                  <div className="hbar-l">
                    <span>{mode.label}</span>
                    <span>
                      {money(mode.amount)} · {mode.bills} bill{mode.bills === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="hbar-track">
                    <div
                      style={{
                        width: `${Math.max(
                          2,
                          (mode.amount / Math.max(1, summary?.collected ?? 1)) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        <aside>
          {bill ? (
            <InvoicePaper bill={bill} onRefund={() => setRefunding(true)} />
          ) : (
            <section className="card" style={{ padding: 16 }}>
              <b style={{ fontSize: 16 }}>No bill selected</b>
              <p className="t-cap" style={{ marginTop: 4 }}>
                Pick a bill from the list to see it and take the payment.
              </p>
              <div className="note gold" style={{ marginTop: 12 }}>
                <Icon name="alert" size={18} />
                <span>Healthcare is exempt from GST, so no tax is charged on a consultation.</span>
              </div>
            </section>
          )}
        </aside>
      </div>

      <NewBillDialog
        open={newBill}
        onClose={() => setNewBill(false)}
        charges={CHARGES}
        onCreate={(draft) => {
          void createBill(draft).then(() => void refreshTill());
        }}
      />

      <RefundDialog
        open={refunding}
        onClose={() => setRefunding(false)}
        billNumber={bill?.number}
        amount={bill?.total}
        onRefund={() => {
          if (!bill) return;
          void refundBill(bill.id).then(() => void refreshTill());
        }}
      />

      <CloseTheDayDialog
        open={closing}
        onClose={() => setClosing(false)}
        expected={summary?.collected ?? 0}
        taken={(payload?.byMode ?? []).map((mode) => ({
          label: mode.label,
          amount: mode.amount,
          bills: mode.bills,
        }))}
        onCloseDay={(count) => {
          void closeTheDay(count).then(() => void refreshTill());
        }}
      />
    </AppShell>
  );
}
