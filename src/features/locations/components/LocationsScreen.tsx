"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { ConfirmDialog, MyAccountDialog } from "@/components/dialogs";
import { fetchBranches, removeBranch, type Branch } from "@/features/locations/api/locations";
import { AddBranchDialog } from "@/features/locations/components/AddBranchDialog";
import { EditBranchDialog } from "@/features/locations/components/EditBranchDialog";

/**
 * The clinic's branches.
 *
 * <p>Where the clinic works from, and what each branch has — the rooms it can
 * put a doctor in, and the registration that goes on its letterhead.
 */
export function LocationsScreen() {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [removing, setRemoving] = useState<Branch | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [account, setAccount] = useState(false);

  const load = useCallback(() => {
    fetchBranches()
      .then((payload) => {
        setBranches(payload.items);
        setError(null);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not load the branches");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, attempt]);

  const refresh = () => {
    setLoading(true);
    setAttempt((value) => value + 1);
  };

  const remove = async (branch: Branch) => {
    setRefusal(null);
    try {
      await removeBranch(branch.id);
      refresh();
    } catch (reason: unknown) {
      setRefusal(reason instanceof Error ? reason.message : "That branch could not be removed.");
    }
  };

  return (
    <AppShell activeHref="/locations" onAccount={() => setAccount(true)}>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">Locations</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {branches
              ? `${branches.length} ${branches.length === 1 ? "branch" : "branches"} · ${
                  branches.reduce((sum, branch) => sum + branch.doctors, 0)
                } ${branches.reduce((sum, branch) => sum + branch.doctors, 0) === 1 ? "doctor" : "doctors"}`
              : "Where the clinic works from."}
          </p>
        </div>
        <div className="nq-btns">
          <Button icon="plus" onClick={() => setAdding(true)}>
            Add a branch
          </Button>
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

      {loading && !branches ? <LoadingState title="Loading the branches…" /> : null}

      {!loading && !error && branches && branches.length === 0 ? (
        <EmptyState
          title="One branch, so far"
          copy="Add the places the clinic works from, and each of them gets its own letterhead."
          icon="pin"
        />
      ) : null}

      <div className="lc-grid" style={{ marginTop: 14 }}>
        {(branches ?? []).map((branch) => (
          <section className={`card lc-card${branch.primary ? " here" : ""}`} key={branch.id}>
            <div className="lc-head">
              <span className="lc-pin">
                <Icon name="pin" size={18} />
              </span>
              <div className="lc-who">
                <div className="t-h3">
                  {branch.name}
                  {branch.primary ? <span className="badge mint">Main branch</span> : null}
                </div>
                <p className="lc-addr">
                  {branch.address}
                  {branch.city ? `, ${branch.city}` : ""}
                  {branch.state ? `, ${branch.state}` : ""}
                </p>
              </div>
            </div>

            <div className="lc-facts">
              <span>
                <Icon name="phone" size={13} /> {branch.phone || "—"}
              </span>
              <span className={branch.hfrId ? "ok" : "muted"}>
                <Icon name="shield" size={13} /> {branch.hfrId ? `HFR ${branch.hfrId}` : "No HFR id"}
              </span>
            </div>

            <div className="lc-today">
              <div>
                <b>{branch.doctors}</b>
                <span>doctors here</span>
              </div>
              <div>
                <b>{branch.rooms}</b>
                <span>rooms</span>
              </div>
            </div>

            <div className="lc-docs">
              <Button variant="secondary" size="sm" icon="pen" onClick={() => setEditing(branch)}>
                Edit
              </Button>
              {branch.primary ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="x"
                  onClick={() => setRemoving(branch)}
                  disabled={branch.doctors > 0}
                  title={
                    branch.doctors > 0
                      ? "Doctors still work at this branch. Move them first."
                      : "Remove this branch"
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          </section>
        ))}
      </div>

      {refusal ? (
        <p role="alert" className="t-cap" style={{ color: "var(--red)", marginTop: 12 }}>
          {refusal}
        </p>
      ) : null}

      <AddBranchDialog open={adding} onClose={() => setAdding(false)} onSaved={refresh} />
      <EditBranchDialog
        open={Boolean(editing)}
        branch={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove this branch?"
        subject={removing?.name ?? ""}
        detail="The branch and its letterhead stop being used. Nobody's bookings are changed."
        confirmLabel="Remove the branch"
        onConfirm={() => (removing ? remove(removing) : undefined)}
        onError={(message) => setRefusal(message)}
      />
      <MyAccountDialog open={account} onClose={() => setAccount(false)} />
    </AppShell>
  );
}
