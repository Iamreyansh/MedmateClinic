import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { cn } from "@/lib/cn";
import { fetchPublicBooking, rebookVisit } from "@/features/patient-web/api/patientWeb";
import { clinicTimeLine, formatServiceDay } from "@/features/patient-web/lib/clinicTime";
import { patientFailure, type PatientFailure } from "@/features/patient-web/lib/errors";
import type { PublicBookingPage, PublicSlot, RebookResult } from "@/features/patient-web/types";

/**
 * A key for one rebook attempt.
 *
 * The rebook's key is its own: it is never the booking's, because that one
 * belongs to the booking. The same key with the same time gives the same
 * answer; the same key with another time is refused.
 */
function newAttemptKey(): string {
  return `rebook-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Move the booking to another time.
 *
 * The times are the service's own — the panel asks for the doctor the
 * patient picked and shows the slots that doctor is free for. It never works
 * out a time of its own.
 */
export function RebookPanel({
  linkKey,
  clinicSlug,
  doctorName,
  onDone,
  onClose,
}: {
  /** The link key — the secret in the URL. It is never shown. */
  linkKey: string;
  /** The clinic's slug, so the service knows which clinic's times to send. */
  clinicSlug: string;
  /** The doctor the patient is seeing now, so the same one is offered first. */
  doctorName: string;
  /** The service's answer, once the booking has moved. */
  onDone: (result: RebookResult, label: string, day: string) => void;
  /** The patient changed their mind. */
  onClose: () => void;
}) {
  const [page, setPage] = useState<PublicBookingPage | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<PatientFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  // The key belongs to the attempt: a new time is a new attempt.
  const attemptKey = useRef(newAttemptKey());
  // A double tap must not move the booking twice.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!clinicSlug) return;
    let alive = true;
    fetchPublicBooking(clinicSlug, doctorId || undefined)
      .then((data) => {
        if (!alive) return;
        setPage(data);
        setFailure(null);
        setRefreshing(false);
        if (!doctorId) {
          // The doctor the patient is seeing now is the one offered first.
          const match = data.doctors.find((entry) => entry.name === doctorName) ?? data.doctors[0];
          const first = data.doctors[0];
          if (match && first && match.id !== first.id) setDoctorId(match.id);
        }
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setFailure(patientFailure(reason, "Could not load the clinic's times", "booking"));
        setRefreshing(false);
      });
    return () => {
      alive = false;
    };
  }, [clinicSlug, doctorId, doctorName, refresh]);

  /** The times are on their way, and there is nothing to show yet. */
  const loading = Boolean(clinicSlug) && !page && !failure;

  const doctor = page?.doctors.find((entry) => entry.id === doctorId) ?? page?.doctors[0] ?? null;
  const slots = page?.slots ?? [];
  const freeSlots = slots.filter((entry) => entry.free);
  const zone = clinicTimeLine(page?.clinic, slots);

  const chooseDoctor = (id: string) => {
    if (id === doctorId) return;
    setDoctorId(id);
    setSlot(null);
    setRefreshing(true);
  };

  const confirm = async () => {
    if (!slot || !page) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await rebookVisit(
        linkKey,
        { doctorId: doctor?.id, date: page.day, slot: slot.label },
        attemptKey.current,
      );
      onDone(result, slot.label, page.day);
    } catch (reason: unknown) {
      const failed = patientFailure(reason, "Could not move the booking");
      setFailure(failed);
      if (failed.conflict) {
        // The time was taken in the meantime. The doctor the patient picked
        // stays picked, and the times come back without that one.
        attemptKey.current = newAttemptKey();
        setSlot(null);
        setRefreshing(true);
        setRefresh((count) => count + 1);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (!clinicSlug) {
    return (
      <div className="card">
        <EmptyState
          title="We need your clinic's link"
          copy="Open the booking link the clinic sent you, and you can change your time there."
          icon="cal"
          action={
            <Button variant="secondary" size="sm" onClick={onClose}>
              Back
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-h">
        <div className="t-h3">Change your time</div>
        {doctor ? <span className="t-cap">{doctor.name}</span> : null}
      </div>

      {failure && !failure.conflict ? (
        <ErrorState
          message={failure.message}
          title={failure.unreachable ? "The clinic is not answering" : "Something went wrong"}
          onRetry={() => setRefresh((count) => count + 1)}
        />
      ) : null}

      {failure?.conflict ? (
        <div className="note gold" role="alert">
          <Icon name="alert" size={18} />
          <div style={{ flex: 1 }}>
            <b>{failure.title ?? "That time was just taken"}</b>
            <p style={{ marginTop: 4 }}>{failure.message}</p>
          </div>
        </div>
      ) : null}

      {loading && !page ? <LoadingState title="Loading the clinic's times…" /> : null}

      {page ? (
        <>
          {page.doctors.length > 0 ? (
            <div className="field">
              <label htmlFor="rebook-doctor">Who would you like to see?</label>
              <div className="chips">
                {page.doctors.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={cn("chip", entry.id === doctor?.id && "on")}
                    aria-pressed={entry.id === doctor?.id}
                    onClick={() => chooseDoctor(entry.id)}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card-h" style={{ marginTop: 14 }}>
            <div className="t-h3">Pick a time</div>
            {page.nextFree ? <span className="t-cap">Next free: {page.nextFree}</span> : null}
          </div>
          {zone ? <p className="t-cap" style={{ marginBottom: 10 }}>Clinic time: {zone}</p> : null}
          <p className="t-cap" style={{ marginBottom: 10 }}>{formatServiceDay(page.day)}</p>

          {refreshing ? <LoadingState title="Loading the times…" /> : null}

          {!refreshing && freeSlots.length === 0 ? (
            <EmptyState
              title="No free times on this day"
              copy="Ask the clinic for another day, or call them."
              icon="cal"
            />
          ) : null}

          {!refreshing && freeSlots.length > 0 ? (
            <div className="slots">
              {slots.map((entry) => (
                <button
                  key={entry.startsAt}
                  type="button"
                  disabled={!entry.free}
                  className={cn(entry.startsAt === slot?.startsAt && "on")}
                  aria-pressed={entry.startsAt === slot?.startsAt}
                  onClick={() => setSlot(entry)}
                >
                  <b>{entry.label}</b>
                  <span>{entry.free ? "Free" : "Taken"}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="kiosk-acts">
            <Button variant="secondary" onClick={onClose}>
              Back
            </Button>
            <Button disabled={busy || !slot} onClick={() => void confirm()}>
              {busy ? "Moving it…" : "Confirm this time"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
