import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { reportLabResult } from "@/features/lab/api/lab";
import type { LabOrder } from "@/features/lab/types";

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
  orders: LabOrder[];
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
  const [value, setValue] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [abnormal, setAbnormal] = useState(false);
  const [critical, setCritical] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const order = orders.find((entry) => entry.id === orderId) ?? orders[0];
  const ready = value.trim().length > 0 && order !== undefined;

  const save = async () => {
    if (!order) return;
    setSaving(true);
    setError(null);
    try {
      await reportLabResult({ orderId: order.id, value, reference, abnormal, critical, note });
      onSave({
        test: order.test,
        finding: order.test,
        value,
        range: reference,
        normal: !abnormal,
        note,
      });
      setValue("");
      setReference("");
      setNote("");
      setAbnormal(false);
      setCritical(false);
      onClose();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not save the result");
    } finally {
      setSaving(false);
    }
  };

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
          <Button icon="check" disabled={!ready || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save the result"}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="note red" style={{ marginBottom: 14 }}>
          <Icon name="alert" size={18} />
          <div>{error}</div>
        </div>
      ) : null}

      {orders.length > 1 ? (
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="lab-order">Which order?</label>
          <select
            id="lab-order"
            className="input"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          >
            {orders.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.test} · {entry.patient.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

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
            value={reference}
            placeholder="12.0 – 15.0 g/dL"
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="lab-note">Note for the doctor</label>
        <TextArea
          id="lab-note"
          value={note}
          placeholder="Anything the doctor should know about this sample."
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="seg prio" role="group" aria-label="How the result reads" style={{ marginBottom: 14 }}>
        <button
          type="button"
          aria-pressed={!abnormal}
          className={cn(!abnormal && "on")}
          onClick={() => {
            setAbnormal(false);
            setCritical(false);
          }}
        >
          Normal
        </button>
        <button
          type="button"
          aria-pressed={abnormal && !critical}
          className={cn(abnormal && !critical && "on", "prio-sel", "urgent")}
          onClick={() => {
            setAbnormal(true);
            setCritical(false);
          }}
        >
          Abnormal
        </button>
        <button
          type="button"
          aria-pressed={critical}
          className={cn(critical && "on", "prio-sel", "emergency")}
          onClick={() => {
            setAbnormal(true);
            setCritical(true);
          }}
        >
          Critical
        </button>
      </div>

      {order ? (
        <div className={cn("note", critical ? "red" : abnormal ? "gold" : "mint")}>
          <Icon name="lab" size={18} />
          <span>
            The result is reported against <b>{order.test}</b> for {order.patient.name}.
            {abnormal ? " The doctor sees it flagged." : ""}
          </span>
        </div>
      ) : null}
    </Dialog>
  );
}
