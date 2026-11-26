import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { cancelBooking, fetchLiveToken } from "@/features/patient-web/api/patientWeb";
import { InvalidLinkCard } from "@/features/patient-web/components/InvalidLinkCard";
import { RebookPanel } from "@/features/patient-web/components/RebookPanel";
import { readBooking, readClinic } from "@/features/patient-web/lib/bookingStore";
import { formatServiceDay } from "@/features/patient-web/lib/clinicTime";
import { patientFailure, type PatientFailure } from "@/features/patient-web/lib/errors";
import type { LiveToken } from "@/features/patient-web/types";

/**
 * Manage a booking.
 *
 * The patient opens this from the link they were sent, and it shows them the
 * booking they have and lets them call it off or move it to another time. A
 * booking that has been called off is gone — the clinic's diary is the truth.
 *
 * The number on the page is the queue slip. The link key stays in the URL.
 */
export function ApptScreen() {
  const [params] = useSearchParams();
  const linkKey = params.get("token") ?? "";
  // The clinic travels with the link the patient was sent; it is never
  // guessed.
  const clinicSlug = params.get("clinic") ?? readClinic();

  const [booking, setBooking] = useState<LiveToken | null>(null);
  const [failure, setFailure] = useState<PatientFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  /** The panel is open, or the booking was called off. */
  const [view, setView] = useState<"booking" | "rebook" | "cancelled">("booking");
  /** What the booking was moved to. */
  const [moved, setMoved] = useState<{ queueToken: string; label: string; day: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!linkKey) return;
    let alive = true;
    fetchLiveToken(linkKey)
      .then((data) => {
        if (!alive) return;
        setBooking(data);
        setFailure(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        const failed = patientFailure(reason, "Could not load the booking");
        setFailure(failed);
        // The error and the record never show together: a link the clinic
        // has to replace leaves nothing behind.
        setBooking(null);
      });
    return () => {
      alive = false;
    };
  }, [linkKey, attempt]);

  /** The booking is on its way, and there is nothing to show yet. */
  const loading = Boolean(linkKey) && !booking && !failure && !cancelled;

  const cancel = async () => {
    // A second tap is the same answer as the first one, not a second failure.
    if (cancelled || busy || !linkKey) return;
    setBusy(true);
    setFailure(null);
    // The booking's own key. A new key is never minted for a call-off: the
    // service looks the booking's key up on the link.
    const key = readBooking(linkKey)?.idempotencyKey;
    try {
      await cancelBooking(linkKey, key);
      setCancelled(true);
      setView("cancelled");
      setBooking(null);
    } catch (reason: unknown) {
      setFailure(patientFailure(reason, "Could not call the booking off"));
      setBooking(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "var(--surface-2)", minHeight: "100vh" }}>
      <div className="mob-head pub">
        <div className="lockup">
          <div className="wordmark" style={{ fontSize: 26 }}>
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Your booking</h1>
        <p>Check the visit you have, or call it off.</p>
      </div>

      <div style={{ maxWidth: 640, margin: "-40px auto 0", padding: "0 16px 40px" }}>
        {!linkKey ? (
          <div className="card">
            <b style={{ fontSize: 15 }}>No booking to show</b>
            <p className="t-cap" style={{ marginTop: 6 }}>
              Open the link the clinic sent you, and your booking is here.
            </p>
          </div>
        ) : null}

        {failure?.invalidLink ? (
          <InvalidLinkCard clinicSlug={clinicSlug} onRetry={() => setAttempt((count) => count + 1)} />
        ) : null}

        {!failure?.invalidLink && failure ? (
          <ErrorState
            message={failure.message}
            title={failure.unreachable ? "The clinic is not answering" : "Something went wrong"}
            onRetry={() => setAttempt((count) => count + 1)}
          />
        ) : null}

        {loading && !booking && !failure ? <LoadingState title="Loading your booking…" /> : null}

        {view === "rebook" && linkKey ? (
          <RebookPanel
            linkKey={linkKey}
            clinicSlug={clinicSlug}
            doctorName={booking?.doctor ?? ""}
            onClose={() => setView("booking")}
            onDone={(result, label, day) => {
              setMoved({ queueToken: result.queueToken, label, day });
              setView("booking");
            }}
          />
        ) : null}

        {view === "booking" && booking ? (
          <div className="card" style={{ padding: 20 }}>
            <b style={{ fontSize: 17 }}>{booking.doctor}</b>
            <p className="t-cap" style={{ marginTop: 4 }}>
              {booking.room ? `${booking.room} · ` : ""}
              {booking.called ? "You have been called in" : "You are in the queue"}
            </p>
            <div className="plan-meta" style={{ marginTop: 12 }}>
              <div>
                <b>Your number</b>
                {booking.token}
              </div>
              <div>
                <b>Position</b>
                {booking.position}
              </div>
              <div>
                <b>To pay</b>
                ₹{booking.due}
              </div>
            </div>

            {moved ? (
              <div className="note mint" style={{ marginTop: 14 }}>
                <Icon name="check" size={18} />
                <div>
                  Your new time is booked — {moved.label}, {formatServiceDay(moved.day)}.
                  {moved.queueToken ? ` Your queue number is still ${moved.queueToken}.` : ""}
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <a
                className="btn sec"
                href={`/intake/${encodeURIComponent(linkKey)}${
                  clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : ""
                }`}
              >
                Fill in your symptoms
              </a>
              <Button variant="secondary" onClick={() => setView("rebook")}>
                Change the time
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => void cancel()}>
                {busy ? "Cancelling…" : "Call this booking off"}
              </Button>
            </div>
          </div>
        ) : null}

        {view === "cancelled" ? (
          <div className="card center" style={{ padding: 20, textAlign: "center" }}>
            <span className="kiosk-ic ok">
              <Icon name="check" size={26} />
            </span>
            <b style={{ fontSize: 16, display: "block", marginTop: 10 }}>
              The booking is called off
            </b>
            <p className="t-cap" style={{ marginTop: 6 }}>
              You can book another visit whenever you like.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
