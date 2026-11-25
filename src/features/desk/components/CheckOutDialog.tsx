import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { DeskItem } from "@/features/desk/types";

export type CheckOutDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called when the patient is handed over. */
  onCheckOut: (item: DeskItem) => void;
  /** The patient being handed over. */
  item: DeskItem | null;
};

/**
 * Hand a patient over.
 *
 * Everything that is still outstanding is listed with a tick, so the desk
 * cannot hand over a patient before the prescription is signed or the bill is
 * paid — unless they say so, and the note says why.
 */
export function CheckOutDialog({ open, onClose, onCheckOut, item }: CheckOutDialogProps) {
  const [printed, setPrinted] = useState(false);
  const [collected, setCollected] = useState(false);
  const [booked, setBooked] = useState(false);

  if (!item) return null;

  const needsPrescription = item.prescription.status !== "signed";
  const needsPayment = item.payment.status !== "none" && item.payment.status !== "paid";
  const needsFollowUp = Boolean(item.followUp && item.followUp.status === "pending");

  const ready = printed && (!needsPayment || collected) && (!needsFollowUp || booked);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Hand the patient over"
      description={`${item.patient.name} · ${item.token}`}
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not yet
          </Button>
          <Button
            icon="check"
            disabled={!ready}
            onClick={() => {
              onCheckOut(item);
              onClose();
            }}
          >
            Hand over
          </Button>
        </>
      }
    >
      <div className="se-check ok">
        <span className="se-dot">
          <Icon name="check" size={15} />
        </span>
        <div>
          <b>The prescription</b>
          <p>
            {needsPrescription
              ? "The doctor has not signed one yet. Ask for it before the patient leaves."
              : "Signed. Print the paper copy and hand it over."}
          </p>
        </div>
        {needsPrescription ? null : (
          <Button size="sm" variant={printed ? "primary" : "secondary"} onClick={() => setPrinted(true)}>
            {printed ? "Printed" : "Print it"}
          </Button>
        )}
      </div>

      {needsPayment ? (
        <div className="se-check warn">
          <span className="se-dot">
            <Icon name="rupee" size={15} />
          </span>
          <div>
            <b>₹{item.payment.amount} to collect</b>
            <p>Consultation fee, payable at the desk.</p>
          </div>
          <Button size="sm" variant={collected ? "primary" : "secondary"} onClick={() => setCollected(true)}>
            {collected ? "Collected" : "Collect"}
          </Button>
        </div>
      ) : null}

      {needsFollowUp ? (
        <div className="se-check warn">
          <span className="se-dot">
            <Icon name="cal" size={15} />
          </span>
          <div>
            <b>The follow-up</b>
            <p>{item.followUp?.label}</p>
          </div>
          <Button size="sm" variant={booked ? "primary" : "secondary"} onClick={() => setBooked(true)}>
            {booked ? "Booked" : "Book it"}
          </Button>
        </div>
      ) : null}

      {item.lab ? (
        <div className="se-check">
          <span className="se-dot">
            <Icon name="lab" size={15} />
          </span>
          <div>
            <b>{item.lab.label}</b>
            <p>The sample goes to the lab with the barcode.</p>
          </div>
        </div>
      ) : null}

      {!ready ? (
        <div className={cn("note", "gold")} style={{ marginTop: 12 }}>
          <Icon name="alert" size={18} />
          <span>Everything has to be done before the patient is handed over.</span>
        </div>
      ) : null}
    </Dialog>
  );
}
