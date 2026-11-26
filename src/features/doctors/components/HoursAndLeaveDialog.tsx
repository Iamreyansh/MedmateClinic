"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { calendarDate, clockTime } from "@/components/dialogs/validation";
import {
  fetchSchedule,
  saveSchedule,
  type DoctorLeave,
  type DoctorSchedule,
  type DoctorSession,
} from "@/features/doctors/api/doctors";

/**
 * The hours a doctor keeps, and the days they are away.
 *
 * <p>Both are written at once: the week the doctor works and the days they
 * are not. A half-written week is worse than none, so the two go down in one
 * go or not at all.
 */
export type HoursAndLeaveDialogProps = {
  open: boolean;
  doctorId: string | null;
  doctorName: string;
  onClose: () => void;
  onSaved?: () => void;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type SessionDraft = { weekday: number; start: string; end: string; slotMinutes: number };
type LeaveDraft = { from: string; to: string; reason: string };

export function HoursAndLeaveDialog({
  open,
  doctorId,
  doctorName,
  onClose,
  onSaved,
}: HoursAndLeaveDialogProps) {
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [leave, setLeave] = useState<LeaveDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doctorId) return;
    let alive = true;
    fetchSchedule(doctorId)
      .then((payload) => {
        if (!alive) return;
        const schedule: DoctorSchedule | undefined = payload.items[0];
        setSessions(
          (schedule?.sessions ?? []).map((session: DoctorSession) => ({
            weekday: session.weekday,
            start: session.start,
            end: session.end,
            slotMinutes: session.slotMinutes,
          })),
        );
        setLeave(
          (schedule?.leave ?? []).map((row: DoctorLeave) => ({
            from: row.from,
            to: row.to,
            reason: row.reason,
          })),
        );
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setFailure(reason instanceof Error ? reason.message : "Could not open their hours.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, doctorId]);

  const addSession = (weekday: number) => {
    setSessions((current) => [
      ...current,
      { weekday, start: "09:00", end: "13:00", slotMinutes: 15 },
    ]);
  };

  const updateSession = (index: number, patch: Partial<SessionDraft>) => {
    setSessions((current) =>
      current.map((session, position) => (position === index ? { ...session, ...patch } : session)),
    );
  };

  const removeSession = (index: number) => {
    setSessions((current) => current.filter((_, position) => position !== index));
  };

  const addLeave = () => {
    setLeave((current) => [...current, { from: "", to: "", reason: "" }]);
  };

  const updateLeave = (index: number, patch: Partial<LeaveDraft>) => {
    setLeave((current) =>
      current.map((row, position) => (position === index ? { ...row, ...patch } : row)),
    );
  };

  const removeLeave = (index: number) => {
    setLeave((current) => current.filter((_, position) => position !== index));
  };

  const submit = async () => {
    if (!doctorId) return;
    const found: Record<string, string> = {};
    sessions.forEach((session, index) => {
      const startError = clockTime(session.start);
      if (startError) found[`session-${index}-start`] = startError;
      const endError = clockTime(session.end);
      if (endError) found[`session-${index}-end`] = endError;
      if (session.start && session.end && session.end <= session.start) {
        found[`session-${index}-end`] = "The day must end after it starts.";
      }
    });
    leave.forEach((row, index) => {
      const fromError = calendarDate(row.from);
      if (fromError) found[`leave-${index}-from`] = fromError;
      const toError = calendarDate(row.to);
      if (toError) found[`leave-${index}-to`] = toError;
      if (row.from && row.to && row.to < row.from) {
        found[`leave-${index}-to`] = "The last day cannot be before the first.";
      }
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      await saveSchedule(doctorId, { sessions, leave });
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not save their hours.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Hours & leave"
      description={doctorName}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || loading}>
            {saving ? "Saving…" : "Save hours"}
          </Button>
        </>
      }
    >
      {loading ? <p className="t-cap">Opening their week…</p> : null}

      <div className="t-eyebrow" style={{ marginTop: 4 }}>
        The week they work
      </div>
      <p className="t-cap" style={{ marginTop: 4 }}>
        A doctor who runs two sessions a day has two rows on that day.
      </p>

      <div className="le-grid" style={{ marginTop: 10 }}>
        <div className="le-h">
          <div>Day</div>
          <div>From</div>
          <div>To</div>
          <div>Slot</div>
        </div>
        {sessions.length === 0 ? (
          <div className="le-r">
            <div className="le-name">No sessions yet.</div>
            <div className="le-last">
              <small>Pick a day below to add one.</small>
            </div>
          </div>
        ) : null}
        {sessions.map((session, index) => (
          <div className="le-r" key={`${session.weekday}-${index}`}>
            <div className="le-name">{WEEKDAYS[session.weekday]}</div>
            <div className="le-val">
              <input
                className="input"
                aria-label={`${WEEKDAYS[session.weekday]} start time`}
                value={session.start}
                onChange={(event) => updateSession(index, { start: event.target.value })}
              />
              {errors[`session-${index}-start`] ? (
                <small style={{ color: "var(--red)" }}>{errors[`session-${index}-start`]}</small>
              ) : null}
            </div>
            <div className="le-val">
              <input
                className="input"
                aria-label={`${WEEKDAYS[session.weekday]} end time`}
                value={session.end}
                onChange={(event) => updateSession(index, { end: event.target.value })}
              />
              {errors[`session-${index}-end`] ? (
                <small style={{ color: "var(--red)" }}>{errors[`session-${index}-end`]}</small>
              ) : null}
            </div>
            <div className="le-last">
              <div className="le-opts">
                {[10, 15, 20, 30].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={session.slotMinutes === minutes ? "on" : ""}
                    aria-pressed={session.slotMinutes === minutes}
                    onClick={() => updateSession(index, { slotMinutes: minutes })}
                  >
                    {minutes}m
                  </button>
                ))}
                <button type="button" onClick={() => removeSession(index)} aria-label="Remove this session">
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="le-tools" style={{ marginTop: 10 }}>
        <span className="t-cap">Add a session on</span>
        {WEEKDAYS.map((day, index) => (
          <button key={day} type="button" className="le-test" onClick={() => addSession(index)}>
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="t-eyebrow" style={{ marginTop: 18 }}>
        The days they are away
      </div>
      <div className="le-grid" style={{ marginTop: 10 }}>
        <div className="le-h">
          <div>From</div>
          <div>To</div>
          <div>Why</div>
          <div />
        </div>
        {leave.map((row, index) => (
          <div className="le-r" key={`leave-${index}`}>
            <div className="le-val">
              <input
                className="input"
                aria-label={`Leave from, day ${index + 1}`}
                placeholder="2026-01-31"
                value={row.from}
                onChange={(event) => updateLeave(index, { from: event.target.value })}
              />
              {errors[`leave-${index}-from`] ? (
                <small style={{ color: "var(--red)" }}>{errors[`leave-${index}-from`]}</small>
              ) : null}
            </div>
            <div className="le-val">
              <input
                className="input"
                aria-label={`Leave to, day ${index + 1}`}
                placeholder="2026-02-02"
                value={row.to}
                onChange={(event) => updateLeave(index, { to: event.target.value })}
              />
              {errors[`leave-${index}-to`] ? (
                <small style={{ color: "var(--red)" }}>{errors[`leave-${index}-to`]}</small>
              ) : null}
            </div>
            <div className="le-val">
              <input
                className="input"
                aria-label={`Why the doctor is away, day ${index + 1}`}
                placeholder="Annual leave"
                value={row.reason}
                onChange={(event) => updateLeave(index, { reason: event.target.value })}
              />
            </div>
            <div className="le-last">
              <button type="button" onClick={() => removeLeave(index)} aria-label="Remove these days">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="le-tools" style={{ marginTop: 10 }}>
        <Button variant="secondary" size="sm" icon="plus" onClick={addLeave}>
          Add days away
        </Button>
      </div>

      {failure ? (
        <p role="alert" className="t-cap" style={{ color: "var(--red)", marginTop: 10 }}>
          {failure}
        </p>
      ) : null}
    </Dialog>
  );
}
