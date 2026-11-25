import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type ConnectPaymentsDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the keys as they stand. */
  onConnect: (keys: { provider: string; keyId: string; secret: string }) => void;
};

/** The payment providers the clinic can use. */
const PROVIDERS = [
  { value: "razorpay", label: "Razorpay" },
  { value: "upi", label: "UPI (Razorpay)" },
  { value: "stripe", label: "Stripe" },
];

/**
 * Connect payments.
 *
 * The clinic's own keys, so the money goes straight to the clinic. The keys are
 * shown once and never again — so the dialog says so before they are pasted.
 */
export function ConnectPaymentsDialog({ open, onClose, onConnect }: ConnectPaymentsDialogProps) {
  const [provider, setProvider] = useState(PROVIDERS[0].value);
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");

  const ready = keyId.trim().length > 4 && secret.trim().length > 8;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Connect payments"
      description="The clinic's own keys, so the money goes straight to the clinic."
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
              onConnect({ provider, keyId, secret });
              onClose();
            }}
          >
            Connect
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Which provider?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {PROVIDERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("chip", provider === option.value && "on")}
              onClick={() => setProvider(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="pay-key">Key ID</label>
        <Input
          id="pay-key"
          value={keyId}
          placeholder="rzp_live_xxxxxxxx"
          onChange={(event) => setKeyId(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="pay-secret">Key secret</label>
        <Input
          id="pay-secret"
          type="password"
          value={secret}
          placeholder="The key secret"
          onChange={(event) => setSecret(event.target.value)}
        />
      </div>

      <div className="note red" style={{ marginTop: 14 }}>
        <Icon name="alert" size={18} />
        <span>
          The secret is shown once and never again. It is stored encrypted and cannot be read back
          from here.
        </span>
      </div>
    </Dialog>
  );
}
