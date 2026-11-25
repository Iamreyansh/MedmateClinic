import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { PHARMACIES, type Pharmacy } from "@/features/consult/referral";

export type SendToPharmacyDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the pharmacy the patient chose. */
  onChoose: (pharmacy: Pharmacy | null) => void;
  /** The pharmacy already chosen, if any. */
  chosen?: Pharmacy | null;
};

/**
 * Send the prescription to a pharmacy.
 *
 * The patient chooses the pharmacy, so this is a list the doctor reads out and
 * the patient picks from — not a search the doctor does. A controlled medicine
 * is never sent electronically, so the note says so here too.
 */
export function SendToPharmacyDialog({
  open,
  onClose,
  onChoose,
  chosen,
}: SendToPharmacyDialogProps) {
  const [query, setQuery] = useState("");

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = PHARMACIES.filter((pharmacy) => {
    if (words.length === 0) return true;
    const haystack = `${pharmacy.name} ${pharmacy.area}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Send to a pharmacy"
      description="The patient chooses. The paper copy is always printed."
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="check"
            disabled={!chosen}
            onClick={() => {
              if (chosen) onChoose(chosen);
              onClose();
            }}
          >
            Send it here
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="pharmacy-search">Find a pharmacy</label>
        <Input
          id="pharmacy-search"
          value={query}
          placeholder="Name or area"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="med-list">
        {results.length === 0 ? (
          <p className="rp-note-empty">No pharmacy matches that.</p>
        ) : (
          results.map((pharmacy) => (
            <button
              key={pharmacy.id}
              type="button"
              className={cn("med-row-c", chosen?.id === pharmacy.id && "locked")}
              onClick={() => onChoose(pharmacy)}
              aria-pressed={chosen?.id === pharmacy.id}
            >
              <span className="med-num">
                <Icon name="pill" size={13} />
              </span>
              <span className="med-sum">
                <b>{pharmacy.name}</b>
                <span className="gen">
                  {pharmacy.area} · {pharmacy.phone}
                </span>
                <span className="tags">
                  {pharmacy.delivers ? (
                    <span className="badge">Sends e-prescriptions</span>
                  ) : (
                    <span className="badge plain">Paper copy only</span>
                  )}
                </span>
              </span>
              {chosen?.id === pharmacy.id ? <Icon name="check" size={18} /> : null}
            </button>
          ))
        )}
      </div>

      <div className="note gold" style={{ marginTop: 14 }}>
        <Icon name="alert" size={18} />
        <span>
          Controlled medicines are printed only. The patient never receives them on their phone.
        </span>
      </div>
    </Dialog>
  );
}
