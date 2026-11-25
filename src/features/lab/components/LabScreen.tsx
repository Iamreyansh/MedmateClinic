import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { fetchLab, moveLabOrder } from "@/features/lab/api/lab";
import { LabOrderCard } from "@/features/lab/components/LabOrderCard";
import { AddLabResultDialog } from "@/features/lab/components/AddLabResultDialog";
import type { LabOrder, LabPayload } from "@/features/lab/types";

/** The three benches the technician works between. */
const TABS = [
  { value: "to_collect", label: "To collect" },
  { value: "processing", label: "Processing" },
  { value: "reported", label: "Reported today" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/**
 * The lab bench.
 *
 * Collect, process, report. The tally across the top is the technician's
 * morning read: what is waiting to be collected, what is on the bench, and
 * what has already gone back to the doctor.
 */
export function LabScreen() {
  const [payload, setPayload] = useState<LabPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("to_collect");
  const [find, setFind] = useState("");
  // the order the technician is reporting a result for
  const [reporting, setReporting] = useState<LabOrder | null>(null);

  const load = () => {
    fetchLab()
      .then(setPayload)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not load the lab"),
      );
  };

  useEffect(load, []);

  const counts = payload?.counts;

  /** The orders the bench is showing. */
  const bench = useMemo(() => {
    const open = payload?.open ?? [];
    const reported = payload?.reported ?? [];
    if (tab === "reported") return reported;
    if (tab === "to_collect") return open.filter((order) => order.status === "to_collect");
    return open.filter((order) => order.status !== "to_collect");
  }, [payload, tab]);

  const visible = useMemo(() => {
    const term = find.trim().toLowerCase();
    if (!term) return bench;
    return bench.filter(
      (order) =>
        order.patient.name.toLowerCase().includes(term) ||
        (order.sampleNo ?? "").toLowerCase().includes(term) ||
        order.test.toLowerCase().includes(term),
    );
  }, [bench, find]);

  /** The count on each tab. */
  const countFor = (value: Tab) => {
    const open = payload?.open ?? [];
    const reported = payload?.reported ?? [];
    if (value === "to_collect") return open.filter((order) => order.status === "to_collect").length;
    if (value === "processing") return open.filter((order) => order.status !== "to_collect").length;
    return reported.length;
  };

  return (
    <AppShell activeHref="/lab">
      <div className="hello">
        <div>
          <h1 className="t-h1">
            Lab &amp; <em>diagnostics</em>
          </h1>
          <p>Collect, process, report. Every report goes straight to the doctor who ordered it.</p>
        </div>
      </div>

      {error ? <div className="note red">{error}</div> : null}

      <div className="lab-kpis">
        <button
          type="button"
          className={cn("lab-kpi", tab === "to_collect" && "on")}
          onClick={() => setTab("to_collect")}
        >
          <b>{counts?.toCollect ?? 0}</b>
          <span>To collect</span>
        </button>
        <button
          type="button"
          className={cn("lab-kpi", tab === "processing" && "on")}
          onClick={() => setTab("processing")}
        >
          <b>{counts?.inLab ?? 0}</b>
          <span>In lab</span>
        </button>
        <button type="button" className="lab-kpi">
          <b>{counts?.sentOut ?? 0}</b>
          <span>Sent out</span>
        </button>
        <button
          type="button"
          className={cn("lab-kpi", tab === "reported" && "on")}
          onClick={() => setTab("reported")}
        >
          <b>{counts?.reportedToday ?? 0}</b>
          <span>Reported today</span>
        </button>
        <button type="button" className={cn("lab-kpi", (counts?.abnormalToday ?? 0) > 0 && "hot")}>
          <b>{counts?.abnormalToday ?? 0}</b>
          <span>Abnormal today</span>
        </button>
      </div>

      <div className="lab-bar">
        <div className="seg" role="tablist" aria-label="Lab work">
          {TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={tab === entry.value}
              className={tab === entry.value ? "on" : ""}
              onClick={() => setTab(entry.value)}
            >
              {entry.label} <span className="seg-n">{countFor(entry.value)}</span>
            </button>
          ))}
        </div>
        <SearchInput
          placeholder="Patient, token, sample no. or test"
          aria-label="Search lab work"
          value={find}
          onChange={(event) => setFind(event.target.value)}
        />
        <Button variant="secondary" className="lab-add" icon="plus">
          Outside report
        </Button>
      </div>

      <div className="lab-list">
        {visible.length === 0 ? (
          <div className="card empty-card">
            <Icon name="lab" size={26} />
            <p>
              {find
                ? "No sample matches that."
                : tab === "to_collect"
                  ? "No samples waiting. Orders appear here as soon as a doctor signs a prescription with tests."
                  : tab === "processing"
                    ? "Nothing is on the bench."
                    : "Nothing has been reported today."}
            </p>
          </div>
        ) : (
          visible.map((order) => (
            <LabOrderCard
              key={order.id}
              order={order}
              onReport={() => setReporting(order)}
              onMove={(status, partner) => {
                void moveLabOrder(order.id, status, partner).then(load);
              }}
            />
          ))
        )}
      </div>

      <AddLabResultDialog
        open={reporting !== null}
        onClose={() => setReporting(null)}
        orders={reporting ? [reporting] : []}
        onSave={() => {
          setReporting(null);
          load();
        }}
      />
    </AppShell>
  );
}
