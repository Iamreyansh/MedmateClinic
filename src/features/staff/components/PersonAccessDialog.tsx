"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import {
  fetchMemberAccess,
  saveMemberAccess,
  type MemberAccess,
  type TeamMember,
} from "@/features/staff/api/staff";

/**
 * What one person may open.
 *
 * <p>The role is the base: it decides the screens, and it comes from the
 * grants. The exception is this person's own: the one screen they may open
 * beyond their role, or the one that is closed to them.
 */
export type PersonAccessDialogProps = {
  open: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function PersonAccessDialog({ open, member, onClose, onSaved }: PersonAccessDialogProps) {
  const [access, setAccess] = useState<MemberAccess | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member) return;
    let alive = true;
    fetchMemberAccess(member.id)
      .then((payload) => {
        if (!alive) return;
        const record = payload.items[0] ?? null;
        setAccess(record);
        setOverrides(record?.overrides ?? {});
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setFailure(reason instanceof Error ? reason.message : "Could not open their access.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, member]);

  const screens = useMemo(() => {
    if (!access) return [];
    return Object.entries(access.resources).map(([resource, roleLevel]) => {
      const exception = overrides[resource];
      const level = exception ?? access.roleCapabilities[resource] ?? roleLevel;
      return { resource, level };
    });
  }, [access, overrides]);

  const save = async () => {
    if (!member) return;
    setSaving(true);
    setFailure(null);
    try {
      await saveMemberAccess(member.id, {
        role: access?.role ? roleNameOf(access.role) : undefined,
        overrides,
      });
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not change their access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Person access"
      description={member ? `${member.name} · ${member.role}` : undefined}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving || !access}>
            {saving ? "Saving…" : "Save access"}
          </Button>
        </>
      }
    >
      {loading ? <p className="t-cap">Opening their access…</p> : null}

      {access ? (
        <>
          <div className="st-can" style={{ marginTop: 0 }}>
            <Icon name="shield" size={16} />
            <span>
              Their role is <b>{access.role}</b>. Change a screen below and it is an exception for
              this person only — it does not change the role, and it does not change anybody else.
            </span>
          </div>

          <div className="le-grid" style={{ marginTop: 14 }}>
            <div className="le-h">
              <div>Screen</div>
              <div>Level</div>
              <div>Their role</div>
              <div>Exception</div>
            </div>
            {screens.map((screen) => (
              <div className="le-r" key={screen.resource}>
                <div className="le-name">{screen.resource}</div>
                <div className="le-val">
                  <span className={`badge ${screen.level === "use" ? "mint" : "plain"}`}>
                    {screen.level === "use" ? "Can use" : screen.level === "view" ? "Can view" : "No access"}
                  </span>
                </div>
                <div className="le-opts">
                  {["none", "view", "use"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={screen.level === level ? "on" : ""}
                      aria-pressed={screen.level === level}
                      onClick={() =>
                        setOverrides((current) => ({ ...current, [screen.resource]: level }))
                      }
                    >
                      {level === "use" ? "Use" : level === "view" ? "View" : "None"}
                    </button>
                  ))}
                </div>
                <div className="le-last">
                  <small>
                    {overrides[screen.resource]
                      ? `Exception: ${overrides[screen.resource]}`
                      : "From their role"}
                  </small>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOverrides({})}
              disabled={Object.keys(overrides).length === 0}
            >
              Clear every exception
            </Button>
          </div>
        </>
      ) : null}

      {failure ? (
        <p role="alert" className="t-cap" style={{ color: "var(--red)", marginTop: 10 }}>
          {failure}
        </p>
      ) : null}
    </Dialog>
  );
}

/** The role's own name, as the service stores it. */
function roleNameOf(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "_");
}
