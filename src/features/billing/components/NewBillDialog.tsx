import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type NewBillLine = {
  name: string;
  amount: number;
};

export type NewBillDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the bill as it stands. */
  onCreate: (bill: { patient: string; lines: NewBillLine[]; discount: number }) => void;
  /** The charges the clinic offers. */
  charges: Array<{ name: string; amount: number }>;
};

/**
 * Build a bill.
 *
 * A bill is made of the visit's charges plus anything the clinic adds — a
 * dressing, a nebulisation, a medicine. The discount is what the front desk
 * can give, and it is always shown on the bill.
 */
export function NewBillDialog({ open, onClose, onCreate, charges }: NewBillDialogProps) {
  const [patient, setPatient] = useState("");
  const [lines, setLines] = useState<NewBillLine[]>([]);
  const [discount, setDiscount] = useState("0");

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const off = Number(discount) || 0;
  const total = Math.max(0, subtotal - off);
  const ready = patient.trim().length > 1 && lines.length > 0;

  const add = (charge: { name: string; amount: number }) => {
    setLines([...lines, charge]);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New bill"
      description="The charges for this visit, and anything else the clinic adds."
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="check"
            disabled={!ready}
            onClick={() => {
              onCreate({ patient, lines, discount: off });
              onClose();
            }}
          >
            Create the bill
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="bill-patient">Who is this for?</label>
        <Input
          id="bill-patient"
          value={patient}
          placeholder="Kavya Nair"
          onChange={(event) => setPatient(event.target.value)}
        />
      </div>

      <div className="t-eyebrow" style={{ marginBottom: 8 }}>
        The charges
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {charges.map((charge) => (
          <button
            key={charge.name}
            type="button"
            className="chip"
            onClick={() => add(charge)}
          >
            + {charge.name} · ₹{charge.amount}
          </button>
        ))}
      </div>

      <ul className="bill-lines">
        {lines.map((line, index) => (
          <li key={`${line.name}-${index}`}>
            <span>{line.name}</span>
            <b>₹{line.amount}</b>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLines(lines.filter((_, position) => position !== index))}
            >
              Remove
            </Button>
          </li>
        ))}
        {lines.length === 0 ? <li className="t-cap">Nothing added yet.</li> : null}
      </ul>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="bill-discount">Discount</label>
        <Input
          id="bill-discount"
          value={discount}
          inputMode="numeric"
          placeholder="0"
          onChange={(event) => setDiscount(event.target.value.replace(/\D/g, ""))}
        />
      </div>

      <div className="bill-total">
        <div>
          <span>Subtotal</span>
          <b>₹{subtotal}</b>
        </div>
        <div>
          <span>Discount</span>
          <b>₹{off}</b>
        </div>
        <div className="grand">
          <span>Total</span>
          <b>₹{total}</b>
        </div>
      </div>

      <div className={cn("note", "mint")} style={{ marginTop: 12 }}>
        <Icon name="check" size={18} />
        <span>Healthcare is exempt from GST, so no tax is charged on a consultation.</span>
      </div>
    </Dialog>
  );
}
