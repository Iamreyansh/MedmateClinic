import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { apiGet } from "@/services/api";

/** One thing in the doctor's inbox. */
export type InboxItem = {
  id: string;
  kind: "Result" | "Referral" | "Handover";
  patient: {
    id: string;
    name: string;
    age: number;
    sex: string;
    initials?: string;
  };
  title: string;
  body: string;
  time: string;
  critical?: boolean;
};

type InboxPayload = {
  items: InboxItem[];
  counts: Record<string, number>;
  meta: string;
};

const KIND_TONE: Record<InboxItem["kind"], string> = {
  Result: "badge red",
  Referral: "badge blue",
  Handover: "badge gold",
};

type Filter = "All" | "Result" | "Referral" | "Handover";

export function InboxView() {
  const [payload, setPayload] = useState<InboxPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiGet<InboxPayload>("/clinic/inbox")
      .then((data) => {
        if (alive) setPayload(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the inbox");
      });
    return () => {
      alive = false;
    };
  }, []);

  const items = payload?.items ?? [];
  const filtered = filter === "All" ? items : items.filter((item) => item.kind === filter);
  const selected = items.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const filters: Array<{ label: Filter; count: number }> = [
    { label: "All", count: payload?.counts.all ?? items.length },
    { label: "Result", count: payload?.counts.Result ?? 0 },
    { label: "Referral", count: payload?.counts.Referral ?? 0 },
    { label: "Handover", count: payload?.counts.Handover ?? 0 },
  ];

  return (
    <>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            In<em>box</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {payload?.meta ?? "Loading the inbox…"} {items.length} to act on.
          </p>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {filters.map((entry) => (
          <Chip
            key={entry.label}
            active={filter === entry.label}
            onClick={() => setFilter(entry.label)}
          >
            {entry.label} · {entry.count}
          </Chip>
        ))}
      </div>

      {error ? <div className="note red">{error}</div> : null}

      <div className="rx-grid">
        <div className="ibx-list">
          {filtered.length === 0 ? (
            <div className="card" style={{ padding: 18 }}>
              <b style={{ fontSize: 15 }}>Nothing here</b>
              <p className="t-cap" style={{ marginTop: 4 }}>
                There is nothing in this bucket. Everything has been seen.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <button
                type="button"
                className={cn("card ibx", item.id === selected?.id && "current")}
                key={item.id}
                style={{ padding: 14, textAlign: "left", width: "100%" }}
                onClick={() => setSelectedId(item.id)}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <Avatar initials={item.patient.initials ?? "—"} tone="nurse" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ibx-kind">
                      <span className={KIND_TONE[item.kind]}>{item.kind}</span>
                    </div>
                    <b style={{ fontSize: 15 }}>
                      {item.patient.name} · {item.patient.age} {item.patient.sex}
                    </b>
                    <p className="ibx-text">{item.title}</p>
                  </div>
                  <div className="ibx-badges">
                    <span className="t-cap">{item.time}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {selected ? (
          <aside className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <b style={{ fontSize: 17 }}>{selected.title}</b>
              {selected.critical ? <span className="badge red solid">Critical</span> : null}
            </div>
            <p className="t-cap" style={{ marginTop: 4 }}>
              {selected.patient.name} · {selected.patient.age} {selected.patient.sex} ·{" "}
              {selected.time}
            </p>

            <p style={{ color: "var(--ink-2)", marginTop: 12, fontSize: 13.5 }}>{selected.body}</p>

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Button variant="secondary" icon="send">
                Call the patient
              </Button>
              <Button variant="secondary" icon="cal">
                Book a visit today
              </Button>
              <div style={{ flex: 1 }} />
              <Button icon="check">Mark reviewed</Button>
            </div>
          </aside>
        ) : null}
      </div>
    </>
  );
}
