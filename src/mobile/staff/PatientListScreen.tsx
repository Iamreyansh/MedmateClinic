"use client";

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPatientList } from "@/features/patients/api/patients";
import {
  PATIENT_FILTERS,
  matchesFilter,
  matchesSearch,
  type PatientFilter,
} from "@/features/patients/types";
import { maskPhone } from "@/lib/format";
import { Chip } from "@/components/ui/Chip";
import { SearchInput } from "@/components/ui/Input";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileTitle,
} from "@/mobile/components";

/**
 * The patient list on a phone.
 *
 * The list comes back in one payload and the screen narrows it, the way
 * the desktop list does: the search box and the filter chips work on what
 * the server sent.
 */
export function MobilePatientListScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("everyone");
  const load = useCallback(() => fetchPatientList(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return all.filter((item) => matchesFilter(item, filter) && matchesSearch(item, query));
  }, [data, filter, query]);

  return (
    <StaffShell activeHref="/m/patients">
      <MobileTitle title="Patients" line={data?.meta ?? "Everybody the clinic has"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <>
          <SearchInput
            value={query}
            placeholder="Name, mobile or ABHA"
            aria-label="Search the patients"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="chips">
            {PATIENT_FILTERS.map((entry) => (
              <Chip
                key={entry.value}
                active={filter === entry.value}
                icon={entry.icon}
                onClick={() => setFilter(entry.value)}
              >
                {entry.label}
              </Chip>
            ))}
          </div>
        </>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <MobileEmpty
          title="Nobody here"
          copy={
            query
              ? "No patient matches that search."
              : "No patient matches that filter yet."
          }
        />
      ) : null}

      {items.length > 0 ? (
        <MobileCard>
          <div className="mob-section">
            {items.map((item) => (
              <Link key={item.id} to={`/m/patients/${item.id}`} className="mob-row">
                <span className="ico">
                  <span style={{ fontWeight: 800, fontSize: 12 }}>{item.initials}</span>
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>
                    {item.name} · {item.age} {item.sex}
                  </b>
                  <small style={{ whiteSpace: "normal" }}>
                    {maskPhone(item.phone)}
                    {item.lastSeen ? ` · last seen ${item.lastSeen}` : ""}
                  </small>
                  {item.dues > 0 ? (
                    <small style={{ whiteSpace: "normal" }}>Owes money</small>
                  ) : null}
                </span>
                <span className="end">
                  {item.token ? <span className="badge mint">{item.token}</span> : null}
                  {item.hereToday ? <span className="badge doc">Here today</span> : null}
                </span>
              </Link>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
