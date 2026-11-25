import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type ShareBookingLinkDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called when the link is copied or shared. */
  onShare: (channel: "sms" | "whatsapp" | "copy") => void;
  /** The clinic's public booking link. */
  link: string;
  /** The number the link goes to, when it is sent by SMS. */
  phone?: string;
};

/** How the link can reach the patient. */
const CHANNELS = [
  { value: "sms", label: "Send by SMS" },
  { value: "whatsapp", label: "Send on WhatsApp" },
  { value: "copy", label: "Copy the link" },
];

/**
 * Share the booking link.
 *
 * The link is the clinic's own address with the clinic's name on it, so the
 * patient can book without being told the link by hand. The copy is the
 * fallback — some patients will only read a message.
 */
export function ShareBookingLinkDialog({ open, onClose, onShare, link, phone }: ShareBookingLinkDialogProps) {
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "copy">("sms");
  const [sent, setSent] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share the booking link"
      description="The patient books a time without calling the desk."
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            icon="send"
            onClick={() => {
              onShare(channel);
              setSent(true);
            }}
          >
            {channel === "copy" ? "Copy the link" : "Send it"}
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="booking-link">The link</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input id="booking-link" className="input" readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
        </div>
      </div>

      <div className="field">
        <label>How should it go out?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {CHANNELS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("chip", channel === option.value && "on")}
              onClick={() => {
                setChannel(option.value as "sms" | "whatsapp" | "copy");
                setSent(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {phone && channel !== "copy" ? (
        <p className="t-cap" style={{ marginTop: 10 }}>
          It goes to {phone}. The patient still has to confirm the time themselves.
        </p>
      ) : null}

      {sent ? (
        <div className="note mint" style={{ marginTop: 14 }}>
          <Icon name="check" size={18} />
          <span>
            {channel === "copy" ? "The link is on the clipboard." : "The link has been sent."}
          </span>
        </div>
      ) : null}
    </Dialog>
  );
}
