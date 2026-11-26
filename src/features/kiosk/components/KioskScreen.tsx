"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchKiosk, openKiosk } from "@/features/kiosk/api/kiosk";
import { CloseKioskDialog } from "@/features/kiosk/components/CloseKioskDialog";
import { KioskTablet } from "@/features/kiosk/components/KioskTablet";
import type { KioskSession } from "@/features/kiosk/types";

/**
 * The kiosk.
 *
 * The kiosk is a device at the front of the clinic, not a screen inside the
 * staff app: a patient walks up to it and nobody is signed in. So it has its
 * own chrome and it stands outside the staff shell and the session guard.
 *
 * Two states on one route: the tablet the patient sees when the kiosk is
 * open, and the small card the staff sees when it is closed — which is the
 * same surface, with the staff's own way back into the dashboard.
 */
export function KioskScreen() {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  /** The staff's PIN — the kiosk is opened with it, and closed with it. */
  const [pin, setPin] = useState("");

  useEffect(() => {
    let alive = true;
    fetchKiosk()
      .then((data) => {
        if (alive) setSession(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not read the kiosk");
      });
    return () => {
      alive = false;
    };
  }, []);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      setSession(await openKiosk(pin));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not open the kiosk");
    } finally {
      setBusy(false);
    }
  };

  // Once the kiosk is open, the tablet is what this route shows.
  if (session?.open) {
    return <KioskTablet session={session} onChange={setSession} />;
  }

  return (
    <div
      style={{
        background: "var(--surface-2)",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div className="card" style={{ maxWidth: 520, width: "100%", padding: 28 }}>
        <div className="lockup">
          <div className="wordmark" style={{ fontSize: 24 }}>
            Med<span className="m">Mate</span>
          </div>
        </div>
        <div className="t-h2" style={{ marginTop: 16 }}>
          Patient <em>kiosk</em>
        </div>
        <p className="t-cap" style={{ marginTop: 6, fontSize: 13 }}>
          Turn this device into a self check-in screen at the front desk. Patients confirm their
          mobile with a code, check in for today&rsquo;s booking or join the walk-in queue, and get a
          token. Your PIN closes it.
        </p>

        {error ? (
          <div className="note red" style={{ marginTop: 14 }}>
            <Icon name="alert" size={18} />
            <div>{error}</div>
          </div>
        ) : null}

        {/* the staff's PIN — the kiosk is opened with it, and closed with it */}
        <div className="field" style={{ marginTop: 14, maxWidth: 220 }}>
          <label htmlFor="kiosk-pin">Your 4-digit PIN</label>
          <input
            id="kiosk-pin"
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>

        <Button
          className="block"
          style={{ marginTop: 14 }}
          icon="kiosk"
          disabled={busy || pin.length !== 4}
          onClick={() => void open()}
        >
          {busy ? "Opening…" : "Open kiosk on this device"}
        </Button>

        <p className="t-cap" style={{ marginTop: 12, fontSize: 12.5 }}>
          Set your 4-digit PIN in Settings first. Staff need it to close the kiosk.
        </p>

        <div className="kiosk-acts" style={{ marginTop: 8 }}>
          <Button variant="secondary" icon="lock" onClick={() => setClosing(true)}>
            Close the kiosk
          </Button>
          <Link className="btn ghost" to="/dashboard">
            Back to the dashboard
          </Link>
        </div>
      </div>

      <CloseKioskDialog
        open={closing}
        onClose={() => setClosing(false)}
        onClosed={() => {
          setClosing(false);
          setSession({ ...(session as KioskSession), open: false });
        }}
        onError={setError}
      />
    </div>
  );
}
