import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type CloseTheDayDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with what was counted. */
  onCloseDay: (count: { cash: number; expected: number }) => void;
  /** What the till says the cash should be. */
  expected: number;
  /** What was taken today, by mode. */
  taken: Array<{ label: string; amount: number; bills: number }>;
};

/** The notes the counter is counted in. */
const NOTES = [500, 200, 100, 50, 20, 10];

/**
 * Close the day.
 *
 * The desk counts the cash and the till says what it should be. If the two
 * differ, the difference is written down before the day is closed — that is
 * the only thing that makes a shortfall explainable.
 */
export function CloseTheDayDialog({
  open,
  onClose,
  onCloseDay,
  expected,
  taken,
}: CloseTheDayDialogProps) {
  const [cash, setCash] = useState("");
  const counted = Number(cash) || 0;
  const difference = counted - expected;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Close the day"
      description="Count the cash, and the day is closed against it."
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not yet
          </Button>
          <Button
            icon="check"
            onClick={() => {
              onCloseDay({ cash: counted, expected });
              onClose();
            }}
          >
            Close the day
          </Button>
        </>
      }
    >
      <div className="t-eyebrow" style={{ marginBottom: 8 }}>
        Taken today
      </div>
      <ul className="bill-lines">
        {taken.map((entry) => (
          <li key={entry.label}>
            <span>
              {entry.label} · {entry.bills} bill{entry.bills === 1 ? "" : "s"}
            </span>
            <b>₹{entry.amount}</b>
          </li>
        ))}
      </ul>

      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="close-cash">Counted in the drawer</label>
        <Input
          id="close-cash"
          value={cash}
          inputMode="numeric"
          placeholder="0"
          onChange={(event) => setCash(event.target.value.replace(/\D/g, ""))}
        />
      </div>

      <div className="chips" style={{ marginTop: 8 }}>
        {NOTES.map((note) => (
          <button key={note} type="button" className="chip" onClick={() => setCash(String(note))}>
            + {note}
          </button>
        ))}
      </div>

      <div className="bill-total">
        <div>
          <span>The till says</span>
          <b>₹{expected}</b>
        </div>
        <div>
          <span>Counted</span>
          <b>₹{counted}</b>
        </div>
        <div className="grand">
          <span>{difference === 0 ? "They match" : difference > 0 ? "Over" : "Short by"}</span>
          <b>₹{Math.abs(difference)}</b>
        </div>
      </div>

      {difference !== 0 && counted > 0 ? (
        <div className={cn("note", difference > 0 ? "gold" : "red")} style={{ marginTop: 12 }}>
          <Icon name="alert" size={18} />
          <span>
            {difference > 0
              ? "There is more cash than the till expects. The difference is written down."
              : "There is less cash than the till expects. Write down why before closing."}
          </span>
        </div>
      ) : null}
    </Dialog>
  );
}
