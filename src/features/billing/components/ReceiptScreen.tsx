import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchBill } from "@/features/billing/api/billing";
import { ReceiptPaper } from "@/features/billing/components/ReceiptPaper";
import type { BillingBill } from "@/features/billing/types";

/**
 * The receipt for one bill.
 *
 * It is a page of its own rather than a sheet, because a receipt is handed
 * over: it is printed, or shown on the screen while the patient pays, and it
 * has to stand on its own.
 */
export function ReceiptScreen() {
  const { invoiceId } = useParams();
  const [bill, setBill] = useState<BillingBill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    let alive = true;
    fetchBill(invoiceId)
      .then((data) => {
        if (alive) setBill(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the receipt");
      });
    return () => {
      alive = false;
    };
  }, [invoiceId]);

  return (
    <AppShell activeHref="/billing">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Payment <em>receipt</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Proof the patient paid. The bill of supply is the other half of it.
          </p>
        </div>
        <div className="nq-btns">
          <Link to="/billing" className="btn sec">
            Back to the till
          </Link>
          <Button icon="print">Print the receipt</Button>
        </div>
      </div>

      {error ? (
        <div className="note red">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      {bill ? (
        <div style={{ maxWidth: 560 }}>
          <ReceiptPaper bill={bill} />
        </div>
      ) : error ? null : (
        <section className="card" style={{ padding: 18 }}>
          <p className="t-cap">Loading the receipt…</p>
        </section>
      )}
    </AppShell>
  );
}
