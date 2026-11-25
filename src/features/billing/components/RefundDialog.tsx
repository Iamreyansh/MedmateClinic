import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";

export type RefundDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the reason for the refund. */
  onRefund: (reason: string) => void;
  /** The bill being refunded. */
  billNumber?: string;
  /** The amount that comes back. */
  amount?: number;
};

/** Why the money is going back. */
const REASONS = [
  "The visit was cancelled",
  "The patient was not seen",
  "Charged twice",
  "A charge was added by mistake",
];

/**
 * Refund a payment.
 *
 * The reason is not optional — a refund without a reason cannot be explained
 * later, so the button stays off until one is chosen.
 */
export function RefundDialog({ open, onClose, onRefund, billNumber, amount }: RefundDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Refund"
      description={billNumber ? `Bill ${billNumber}. The money goes back the way it came.` : undefined}
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon="rupee"
            disabled={!reason}
            onClick={() => {
              onRefund(reason);
              onClose();
            }}
          >
            Refund {amount ? `₹${amount}` : "the money"}
          </Button>
        </>
      }
    >
      <div className="field">
        <label>Why is it going back?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {REASONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip${reason === option ? " on" : ""}`}
              onClick={() => setReason(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="refund-note">Anything to add</label>
        <Input id="refund-note" placeholder="The patient was seen at 11:30, not 10:00." />
      </div>

      <div className="note red" style={{ marginTop: 14 }}>
        <Icon name="alert" size={18} />
        <span>
          A refund is a new entry in the day's accounts, not a deletion. The bill stays on the record.
        </span>
      </div>
    </Dialog>
  );
}
