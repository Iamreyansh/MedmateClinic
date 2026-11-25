"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cancelBooking, fetchLiveToken } from "@/features/patient-web/api/patientWeb";
import type { LiveToken } from "@/features/patient-web/types";

/**
 * Manage a booking.
 *
 * The patient opens this from the link they were sent, and it shows them the
 * booking they have and lets them call it off. A booking that has been called
 * off is gone — the clinic's diary is the truth.
 */
export function ApptScreen() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [booking, setBooking] = useState<LiveToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Loading while the booking is on its way — and only then. */
  const loading = Boolean(token) && !booking && !error;
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchLiveToken(token)
      .then((data) => {
        if (!alive) return;
        setBooking(data);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the booking");
      });
    return () => {
      alive = false;
    };
  }, [token, attempt]);

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelBooking(token);
      setCancelled(true);
      setError(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not call the booking off");
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
        {!token ? (
          <div className="card">
            <b style={{ fontSize: 15 }}>No booking to show</b>
            <p className="t-cap" style={{ marginTop: 6 }}>
              Open the link the clinic sent you, and your booking is here.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="note red" role="alert">
            <Icon name="alert" size={18} />
            <div style={{ flex: 1 }}>{error}</div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {loading && !booking ? (
          <div className="card">
            <b style={{ fontSize: 15 }}>Loading your booking…</b>
          </div>
        ) : null}

        {booking && !cancelled ? (
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
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <a className="btn sec" href={`/intake/${token}`}>
                Fill in your symptoms
              </a>
              <Button variant="danger" disabled={busy} onClick={() => void cancel()}>
                {busy ? "Cancelling…" : "Call this booking off"}
              </Button>
            </div>
          </div>
        ) : null}

        {cancelled ? (
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
