import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type CheckoutDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the payment as it stands. */
  onPay: (payment: { plan: string; amount: number; method: string; name: string; email: string }) => void;
  /** The plan being bought. */
  plan: { id: string; name: string; price: number; summary: string };
  /** The plans the clinic can move to. */
  plans: Array<{ id: string; name: string; price: number; summary: string }>;
};

/** How the clinic pays. */
const METHODS = [
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "netbanking", label: "Net banking" },
];

/**
 * Checkout.
 *
 * The clinic buys a plan for the year. Nothing is charged in test mode — the
 * dialog says so, because a screen that takes a card number and charges
 * nothing is a screen people distrust.
 */
export function CheckoutDialog({ open, onClose, onPay, plan, plans }: CheckoutDialogProps) {
  const [chosen, setChosen] = useState(plan);
  const [method, setMethod] = useState("upi");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const ready = name.trim().length > 1 && email.includes("@");
  const current = plans.find((option) => option.id === chosen.id) ?? chosen;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Checkout"
      description="The plan is for the clinic, not for one person."
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
              onPay({ plan: current.id, amount: current.price, method, name, email });
              onClose();
            }}
          >
            Pay ₹{current.price}
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Which plan?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {plans.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn("chip", chosen.id === option.id && "on")}
              onClick={() => setChosen(option)}
            >
              {option.name} · ₹{option.price}
            </button>
          ))}
        </div>
        <p className="t-cap" style={{ marginTop: 6 }}>
          {current.summary}
        </p>
      </div>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="checkout-name">Clinic name</label>
          <Input
            id="checkout-name"
            value={name}
            placeholder="MedMate Clinic"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="checkout-email">Email for the invoice</label>
          <Input
            id="checkout-email"
            type="email"
            value={email}
            placeholder="accounts@clinic.in"
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>How would you like to pay?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {METHODS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("chip", method === option.value && "on")}
              onClick={() => setMethod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="note gold" style={{ marginTop: 14 }}>
        <Icon name="alert" size={18} />
        <span>
          This is test mode. Payment keys are not set on this site, so no money moves and no card is
          charged.
        </span>
      </div>
    </Dialog>
  );
}
