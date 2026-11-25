import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchKiosk, openKiosk } from "@/features/kiosk/api/kiosk";
import { CloseKioskDialog } from "@/features/kiosk/components/CloseKioskDialog";
import { KioskTablet } from "@/features/kiosk/components/KioskTablet";
import type { KioskSession } from "@/features/kiosk/types";

/**
 * The kiosk.
 *
 * Two surfaces in one route: the front desk's own page, which opens the kiosk
 * on this device and closes it again, and the tablet flow the patient sees
 * once it is open.
 */
export function KioskScreen() {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);

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
      setSession(await openKiosk());
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
    <AppShell activeHref="/kiosk">
      <div className="center-card">
        <div className="card">
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

          <Button className="block" style={{ marginTop: 14 }} icon="kiosk" disabled={busy} onClick={() => void open()}>
            {busy ? "Opening…" : "Open kiosk on this device"}
          </Button>

          <div className="kiosk-acts" style={{ marginTop: 8 }}>
            <Button variant="secondary" icon="lock" onClick={() => setClosing(true)}>
              Close the kiosk
            </Button>
            <Link className="btn ghost" to="/dashboard">
              Back to the dashboard
            </Link>
          </div>
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
    </AppShell>
  );
}
