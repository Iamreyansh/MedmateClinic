import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { searchMedicines, type CatalogueMedicine } from "@/lib/medicines";

export type MedicineSearchProps = {
  /** The medicines already on the prescription. */
  chosen: CatalogueMedicine[];
  /** Called when the doctor picks one. */
  onPick: (medicine: CatalogueMedicine) => void;
  /** A medicine that clashes with what is already there — shown as blocked. */
  blockedFor?: (medicine: CatalogueMedicine) => string | null;
};

/**
 * The medicine search.
 *
 * The doctor types a brand or a salt — "Dolo, azithro 500" — and the results
 * come back with the generic, the form, the pack and what it is used for. A
 * medicine that clashes with what is already on the prescription is shown
 * blocked rather than hidden: the doctor should see it and decide.
 *
 * The stylesheet already draws this list — `.sug-list`, `.sug-row`, `.sug-h`.
 */
export function MedicineSearch({ chosen, onPick, blockedFor }: MedicineSearchProps) {
  const [query, setQuery] = useState("");
  const results = searchMedicines(query);
  const already = new Set(chosen.map((medicine) => medicine.generic));

  return (
    <div className="drug-search">
      <SearchInput
        value={query}
        placeholder="Search brand or generic, e.g. 'cetirizine'"
        aria-label="Search medicines"
        onChange={(event) => setQuery(event.target.value)}
      />

      {query.trim().length === 0 ? null : (
        <div className="sug-list">
          <div className="sug-h">
            {results.length === 0
              ? "Nothing in the catalogue matches that"
              : `${results.length} match${results.length === 1 ? "" : "es"}`}
          </div>

          {results.map((medicine) => {
            const blocked = blockedFor?.(medicine) ?? null;
            const onList = already.has(medicine.generic);

            return (
              <div className={cn("sug-row", blocked && "blocked")} key={`${medicine.brand}-${medicine.generic}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>
                    {medicine.brand} <span>{medicine.generic}</span>
                  </b>
                  <small className={cn(blocked && "warn")}>
                    {blocked
                      ? blocked
                      : onList
                        ? `${medicine.dose} · ${medicine.form} · already on this prescription`
                        : `${medicine.dose} · ${medicine.form} · ${medicine.usedFor}`}
                  </small>
                </div>

                {blocked ? null : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={onList}
                    onClick={() => onPick(medicine)}
                  >
                    {onList ? "Added" : "Add"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {query.trim().length === 0 ? (
        <p className="t-cap" style={{ marginTop: 8 }}>
          <Icon name="shield" size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Doses are checked as you type. A clash with an allergy or another medicine stops the line.
        </p>
      ) : null}
    </div>
  );
}
