import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { StatTile, StatTiles } from "@/components/ui/Card";
import { fetchNurseStation } from "@/features/nurse/api/nurse";
import { NurseCard } from "@/features/nurse/components/NurseCard";
import { TakeVitalsDialog } from "@/features/nurse/components/TakeVitalsDialog";
import type { NurseItem, NursePayload } from "@/features/nurse/types";

/** The three views of the station. */
const TABS = [
  { value: "need", label: "Need vitals" },
  { value: "ready", label: "Ready" },
  { value: "all", label: "All" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/**
 * The nurse station.
 *
 * Emergencies and urgent patients come first. The tally tells the nurse where
 * the pressure is; the tabs are the three things the nurse can do — take the
 * vitals, hand the patient on, or look at the whole list.
 */
export function NurseScreen() {
  const [payload, setPayload] = useState<NursePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("need");
  const [find, setFind] = useState("");
  // the patient the nurse is taking the vitals of
  const [taking, setTaking] = useState<NurseItem | null>(null);

  useEffect(() => {
    let alive = true;
    fetchNurseStation()
      .then((data) => {
        if (alive) setPayload(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the nurse station");
      });
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(() => payload?.items ?? [], [payload]);
  const counts = payload?.counts;

  const visible = useMemo(() => {
    const term = find.trim().toLowerCase();

    return items.filter((item) => {
      if (tab === "need" && item.ready) return false;
      if (tab === "ready" && !item.ready) return false;
      if (!term) return true;
      return (
        item.token.toLowerCase().includes(term) ||
        item.patient.name.toLowerCase().includes(term)
      );
    });
  }, [items, tab, find]);

  /** The label on each tab carries its count, as the product shows it. */
  const countFor = (value: Tab) => {
    if (value === "need") return items.filter((item) => !item.ready).length;
    if (value === "ready") return items.filter((item) => item.ready).length;
    return items.length;
  };

  return (
    <AppShell activeHref="/nurse">
      <div className="hello">
        <div>
          <h1 className="t-h1">
            Nurse <em>station</em>
          </h1>
          <p>Emergencies and urgent patients come first. Updates every 10 seconds.</p>
        </div>
      </div>

      {error ? <div className="note red">{error}</div> : null}

      <StatTiles count={4}>
        <StatTile value={counts?.needVitals ?? 0} label="Need vitals" />
        <StatTile value={counts?.urgent ?? 0} label="Urgent or emergency" hot={(counts?.urgent ?? 0) > 0} />
        <StatTile value={counts?.ready ?? 0} label="Ready for the doctor" />
        <StatTile
          value={counts?.longestWait === null || counts?.longestWait === undefined ? "—" : `${counts.longestWait} min`}
          label="Longest wait for vitals"
        />
      </StatTiles>

      <div className="card">
        <div className="nq-bar">
          <div className="seg nq-tabs" role="tablist">
            {TABS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                role="tab"
                aria-selected={tab === entry.value}
                className={tab === entry.value ? "on" : ""}
                onClick={() => setTab(entry.value)}
              >
                {entry.label} ({countFor(entry.value)})
              </button>
            ))}
          </div>
          <Input
            className="nq-find"
            type="search"
            placeholder="Find a token or name"
            aria-label="Find a patient"
            value={find}
            onChange={(event) => setFind(event.target.value)}
          />
        </div>

        {visible.length === 0 ? (
          <div className="nq-empty">
            <Icon name="nurse" size={28} />
            <p>
              {find
                ? "No patient matches that."
                : tab === "need"
                  ? "No one is waiting for vitals."
                  : tab === "ready"
                    ? "Nobody is ready for the doctor yet."
                    : "The station is empty."}
            </p>
          </div>
        ) : (
          <div className="nq-list">
            {visible.map((item) => (
              <NurseCard key={item.id} item={item} onTakeVitals={() => setTaking(item)} />
            ))}
          </div>
        )}
      </div>

      <TakeVitalsDialog
        open={taking !== null}
        onClose={() => setTaking(null)}
        item={taking}
        doctors={payload?.doctors ?? []}
        onSaved={() => {
          setTaking(null);
          void fetchNurseStation()
            .then(setPayload)
            .catch(() => {
              // The list keeps the state it has; the next poll fixes it.
            });
        }}
      />
    </AppShell>
  );
}
