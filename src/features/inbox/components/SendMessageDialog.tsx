import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { MESSAGE_TEMPLATES } from "@/features/inbox/components/messageTemplates";

export type MessageDraft = {
  /** The wording the message uses. */
  template: string;
  /** The message itself, with the placeholders filled in. */
  body: string;
  /** Whether the patient gets it by SMS, on WhatsApp, or both. */
  channel: string;
};

export type SendMessageDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the message as it stands. */
  onSend: (draft: MessageDraft) => void;
  /** The patient the message is for. */
  patientName?: string;
  /** The patient's mobile, masked. */
  patientMobile?: string;
};

/** The wordings the clinic registers. */
export { MESSAGE_TEMPLATES } from "@/features/inbox/components/messageTemplates";

/**
 * Send a message to a patient.
 *
 * The wording is registered with the DLT, so the message starts from one of
 * the templates and the doctor edits it — it is never typed from scratch.
 */
export function SendMessageDialog({
  open,
  onClose,
  onSend,
  patientName,
  patientMobile,
}: SendMessageDialogProps) {
  const [template, setTemplate] = useState(MESSAGE_TEMPLATES[0]);
  const [body, setBody] = useState(MESSAGE_TEMPLATES[0].body);
  const [channel, setChannel] = useState("sms");

  const pick = (id: string) => {
    const found = MESSAGE_TEMPLATES.find((entry) => entry.id === id);
    if (!found) return;
    setTemplate(found);
    setBody(found.body);
  };

  const ready = body.trim().length > 5;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Send a message"
      description={
        patientName
          ? `To ${patientName}${patientMobile ? ` · ${patientMobile}` : ""}.`
          : "The wording is registered, so it starts from a template."
      }
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="send"
            disabled={!ready}
            onClick={() => {
              onSend({ template: template.id, body, channel });
              onClose();
            }}
          >
            Send it
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Which wording?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {MESSAGE_TEMPLATES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn("chip", template.id === option.id && "on")}
              onClick={() => pick(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="message-body">The message</label>
        <TextArea id="message-body" value={body} onChange={(event) => setBody(event.target.value)} />
        <p className="t-cap" style={{ marginTop: 4 }}>
          The placeholders — {"{date}"}, {"{token}"}, {"{amount}"} — are filled in when it is sent.
        </p>
      </div>

      <div className="field">
        <label>How is it sent?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {[
            { value: "sms", label: "SMS" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "both", label: "Both" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("chip", channel === option.value && "on")}
              onClick={() => setChannel(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="note gold" style={{ marginTop: 14 }}>
        <Icon name="alert" size={18} />
        <span>
          This is test mode. No SMS is actually sent and the patient&apos;s mobile is never dialled.
        </span>
      </div>
    </Dialog>
  );
}
