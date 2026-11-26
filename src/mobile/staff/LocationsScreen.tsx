"use client";

import { useCallback } from "react";
import { fetchLocations } from "@/features/locations/api/locations";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileKeyValue,
  MobileLoading,
  MobileTitle,
} from "@/mobile/components";

/**
 * The clinic's branches on a phone.
 *
 * Where each branch is, how many rooms it has, and the number the
 * regulator knows it by.
 */
export function MobileLocationsScreen() {
  const load = useCallback(() => fetchLocations(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const items = data?.items ?? [];

  return (
    <StaffShell activeHref="/m/locations">
      <MobileTitle title="Locations" line={data?.meta ?? "The branches"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <MobileEmpty title="No branches yet" copy="Add a branch to see patients there." />
      ) : null}

      {items.map((branch) => (
        <MobileCard key={`${branch.name}-${branch.hfrId}`} title={branch.name}>
          <MobileKeyValue label="Address" value={branch.address} />
          <MobileKeyValue label="City" value={`${branch.city}, ${branch.state}`} />
          <MobileKeyValue label="Phone" value={branch.phone} />
          <MobileKeyValue label="Rooms" value={branch.rooms} />
          <MobileKeyValue label="HFR ID" value={branch.hfrId || "Not set"} />
        </MobileCard>
      ))}
    </StaffShell>
  );
}
