import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type LabResultEntry = {
  /** The test the result belongs to. */
  test: string;
  /** What was measured. */
  finding: string;
  /** The value, as the lab reports it. */
  value: string;
  /** The range it is read against. */
  range: string;
  /** Whether the value is inside the range. */
  normal: boolean;
  note: string;
};

export type AddLabResultDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the result as the technician entered it. */
  onSave: (result: LabResultEntry) => void;
  /** The orders waiting for a result. */
  orders: Array<{ id: string; test: string; patient: string }>;
};

/**
 * Enter a result against an order.
 *
 * The lab technician fills this in. The value is read against the range, so a
 * result that is out of range is marked before it is saved, and the doctor sees
 * it flagged when it comes back to them.
 */
export function AddLabResultDialog({ open, onClose, onSave, orders }: AddLabResultDialogProps) {
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");
  const [finding, setFinding] = useState("");
  const [value, setValue] = useState("");
  const [range, setRange] = useState("");
  const [note, setNote] = useState("");

  const order = orders.find((entry) => entry.id === orderId);
  const ready = finding.trim().length > 0 && value.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a lab result"
      description="The result goes back to the doctor who ordered the test."
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
              onSave({
                test: order?.test ?? "",
                finding,
                value,
                range,
                normal: true,
                note,
              });
              onClose();
            }}
          >
            Save the result
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="lab-order">Which order?</label>
        <select
          id="lab-order"
          className="input"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
        >
          {orders.length === 0 ? <option value="">No orders waiting</option> : null}
          {orders.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.test} · {entry.patient}
            </option>
          ))}
        </select>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="lab-finding">What was measured</label>
        <Input
          id="lab-finding"
          value={finding}
          placeholder="Haemoglobin"
          onChange={(event) => setFinding(event.target.value)}
        />
      </div>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="lab-value">Result</label>
          <Input
            id="lab-value"
            value={value}
            placeholder="11.2"
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="lab-range">Normal range</label>
          <Input
            id="lab-range"
            value={range}
            placeholder="12.0 – 15.0 g/dL"
            onChange={(event) => setRange(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="lab-note">Note for the doctor</label>
        <TextArea
          id="lab-note"
          value={note}
          placeholder="Anything the doctor should know about this sample."
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {order ? (
        <div className={cn("note", "mint")} style={{ marginTop: 12 }}>
          <Icon name="lab" size={18} />
          <span>
            The result is reported against <b>{order.test}</b> for {order.patient}.
          </span>
        </div>
      ) : null}
    </Dialog>
  );
}
