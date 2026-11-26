"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/Input";
import { CheckInPatientDialog } from "@/components/ui/CheckInPatientDialog";
import { fetchDoctors, fetchPatientList } from "@/features/patients/api/patients";
import {
  PATIENT_FILTERS,
  matchesFilter,
  matchesSearch,
  type PatientFilter,
  type PatientListItem,
  type PatientListPayload,
} from "@/features/patients/types";
import { maskPhone, money } from "@/lib/format";

/** How many rows the list shows at a time. */
const PAGE_SIZE = 6;

/** One row of the list. */
function PatientRow({ item }: { item: PatientListItem }) {
  return (
    <Link to={`/patients/${item.id}`} className="qitem peek">
      <Avatar initials={item.initials || "—"} tone="doctor" />
      <div className="nq-main">
        <div className="nq-top">
          <b>
            {item.name} <span className="t-cap">{item.age}</span>
            <span className="t-cap">{item.sex === "F" ? "F" : "M"}</span>
          </b>
          {item.hereToday ? (
            <span className="badge mint">
              Here{item.token ? ` · ${item.token}` : ""}
            </span>
          ) : null}
        </div>
        <div className="nq-tags">
          {item.dues > 0 ? (
            <span className="badge gold">
              <Icon name="rupee" size={11} /> Owes {money(item.dues)}
            </span>
          ) : null}
          {item.followUpOn ? (
            <span className="badge plain">Follow-up due {item.followUpOn}</span>
          ) : null}
          {item.allergies[0] ? <span className="badge red">{item.allergies[0]}</span> : null}
        </div>
      </div>
      <div className="nq-acts" style={{ textAlign: "right" }}>
        <div className="t-cap">{maskPhone(item.phone)}</div>
        <div className="t-cap">
          Last seen {item.lastSeen.toLowerCase()}
          {item.doctor ? ` · ${item.doctor}` : ""}
        </div>
        <div className="t-cap">
          {item.visits} {item.visits === 1 ? "visit" : "visits"}
        </div>
        <Icon name="chev" size={16} style={{ color: "var(--muted)" }} />
      </div>
    </Link>
  );
}

/**
 * The patient list.
 *
 * The record is one patient; this is everybody the clinic has. The search box
 * and the filter chips narrow the list, and the row carries the handful of
 * facts a person at the desk needs to pick the right one out of a queue.
 */
export function PatientListScreen() {
  const [payload, setPayload] = useState<PatientListPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("everyone");
  const [page, setPage] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; speciality: string }>>([]);

  // A retry asks for the list again — the counter is what changes.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    fetchPatientList({ q: query, filter, signal: controller.signal })
      .then((data) => {
        if (!alive) return;
        setPayload(data);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Could not load the patients");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [query, filter, attempt]);

  useEffect(() => {
    let alive = true;
    fetchDoctors()
      .then((list) => {
        if (alive) setDoctors(list);
      })
      .catch(() => {
        // The list still works without the doctors — one is picked later.
      });
    return () => {
      alive = false;
    };
  }, []);

  const all = useMemo(() => payload?.items ?? [], [payload]);

  const counts = useMemo(() => {
    const tally: Record<PatientFilter, number> = {
      everyone: all.length,
      here: 0,
      followup: 0,
      owes: 0,
      new: 0,
      mine: 0,
    };
    for (const item of all) {
      for (const entry of PATIENT_FILTERS) {
        if (entry.value !== "everyone" && matchesFilter(item, entry.value)) tally[entry.value] += 1;
      }
    }
    return tally;
  }, [all]);

  const visible = useMemo(
    () => all.filter((item) => matchesFilter(item, filter) && matchesSearch(item, query)),
    [all, filter, query],
  );

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const shown = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const from = visible.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(visible.length, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <AppShell activeHref="/patients">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Patient <em>records</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {payload?.meta ?? "Everybody the clinic has, and who still owes money."}
          </p>
        </div>
        <div className="nq-btns">
          <Button icon="plus" onClick={() => setCheckingIn(true)}>
            New patient
          </Button>
        </div>
      </div>

      <div className="rp-search" style={{ marginBottom: 12 }}>
        <SearchInput
          value={query}
          placeholder="Search name, mobile, ABHA or today's token (W-03)"
          aria-label="Search the patients"
          onChange={(event) => {
            setLoading(true);
            setPage(0);
            setQuery(event.target.value);
          }}
        />
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {PATIENT_FILTERS.map((entry) => (
          <Chip
            key={entry.value}
            icon={entry.icon}
            active={filter === entry.value}
            onClick={() => {
              setLoading(true);
              setPage(0);
              setFilter(entry.value);
            }}
          >
            {entry.label} <span className="count">{counts[entry.value]}</span>
          </Chip>
        ))}
      </div>

      {error ? (
        <div className="note red">
          <Icon name="alert" size={18} />
          <div style={{ flex: 1 }}>
            <b>{error}</b>
            <p style={{ marginTop: 4 }}>
              The patient list could not be loaded. It may be a connection problem.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {loading && !payload ? (
        <section className="card" style={{ padding: 18 }}>
          <b style={{ fontSize: 15 }}>Loading the patients…</b>
        </section>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <section className="card" style={{ padding: 18 }}>
          <div className="empty-card">
            <Icon name="folder" size={22} />
            <div>
              <b style={{ fontSize: 15 }}>
                {all.length === 0 ? "No patients yet" : "Nobody matches that"}
              </b>
              <p>
                {all.length === 0
                  ? "Patients appear here as they check in at the kiosk or the reception desk."
                  : "Try another search, or clear the filter to see everybody."}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="qitem-list">
        {shown.map((item) => (
          <PatientRow key={item.id} item={item} />
        ))}
      </div>

      {visible.length > PAGE_SIZE ? (
        <div className="live-row" style={{ marginTop: 14 }}>
          <span className="t-cap">
            Showing {from}–{to} of {visible.length}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages - 1}
              onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <CheckInPatientDialog
        open={checkingIn}
        onClose={() => setCheckingIn(false)}
        doctors={doctors}
        onCheckIn={() => {
          setCheckingIn(false);
          setAttempt((value) => value + 1);
        }}
      />
    </AppShell>
  );
}
