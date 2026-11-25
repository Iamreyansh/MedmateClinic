"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { fetchLocations, type ClinicLocation } from "@/features/locations/api/locations";

/**
 * The clinic's branches.
 *
 * Where the clinic works from, and what each branch has — the rooms it can
 * put a doctor in, and the registration that goes on its letterhead.
 */
export function LocationsScreen() {
  const [locations, setLocations] = useState<ClinicLocation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchLocations()
      .then((data) => {
        if (!alive) return;
        setLocations(data.items);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the branches");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  return (
    <AppShell activeHref="/locations">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Clinic <em>locations</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Where the clinic works from, and what each branch has.
          </p>
        </div>
        <div className="nq-btns">
          <Button icon="plus">Add a branch</Button>
        </div>
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        />
      ) : null}

      {loading && !locations ? <LoadingState title="Loading the branches…" /> : null}

      {!loading && !error && locations && locations.length === 0 ? (
        <EmptyState
          title="One branch, so far"
          copy="Add the places the clinic works from, and each of them gets its own letterhead."
          icon="pin"
        />
      ) : null}

      {(locations ?? []).map((location) => (
        <section className="card" key={location.name} style={{ padding: 18, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Icon name="pin" size={18} style={{ color: "var(--green-700)" }} />
            <b style={{ fontSize: 16 }}>{location.name}</b>
            <span className="badge plain">{location.rooms} rooms</span>
          </div>
          <p className="t-cap" style={{ marginTop: 6 }}>
            {location.address}, {location.city}, {location.state}
          </p>
          <div className="plan-meta" style={{ marginTop: 12 }}>
            <div>
              <b>Phone</b>
              {location.phone}
            </div>
            <div>
              <b>HFR</b>
              {location.hfrId}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Button variant="secondary" icon="pen">
              Edit
            </Button>
          </div>
        </section>
      ))}
    </AppShell>
  );
}
