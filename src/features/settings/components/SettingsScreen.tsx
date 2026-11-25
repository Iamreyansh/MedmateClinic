import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { ConnectPaymentsDialog } from "@/features/settings/components/ConnectPaymentsDialog";
import { connectPayments } from "@/features/settings/api/settings";

/** The tabs the settings screen has — the ones the design names. */
const TABS = [
  { value: "account", label: "My account" },
  { value: "device", label: "This device" },
  { value: "clinic", label: "Clinic & letterhead" },
  { value: "pharmacies", label: "Pharmacies" },
  { value: "live", label: "Ready to go live" },
];

/**
 * The clinic's settings.
 *
 * The tabs are the ones the design names. Only the clinic's own profile and
 * its payments are wired here; the rest say plainly that they are not built
 * yet, rather than pretending.
 */
export function SettingsScreen() {
  const [tab, setTab] = useState(TABS[0].value);
  const [connecting, setConnecting] = useState(false);

  return (
    <AppShell activeHref="/settings">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Clinic <em>settings</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            The clinic's own details, and what it has agreed to.
          </p>
        </div>
      </div>

      <div className="se-wrap">
        <nav className="se-nav" aria-label="Settings">
          {TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className={cn(tab === entry.value && "on")}
              onClick={() => setTab(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="se-body">
          {tab === "account" ? (
            <section className="card se-card">
              <div className="t-eyebrow">My account</div>
              <div className="se-me">
                <span className="tk" style={{ width: 52, height: 52 }}>
                  AR
                </span>
                <div>
                  <b style={{ fontSize: 16 }}>Dr. Naveen Kulkarni</b>
                  <p className="t-cap">Owner · Psychiatry · signs in with ···· 43210</p>
                </div>
              </div>
              <p className="t-cap" style={{ marginTop: 12 }}>
                Your name, your registration and the mobile the clinic reaches you on. A one-time
                code signs you in.
              </p>
            </section>
          ) : tab === "device" ? (
            <section className="card se-card">
              <div className="t-eyebrow">This device</div>
              <div className="se-check">
                <span className="se-dot">
                  <Icon name="check" size={15} />
                </span>
                <div>
                  <b>The PIN is not set</b>
                  <p>
                    Four digits unlock this screen, so you do not need a new code each time. Set it
                    in My account.
                  </p>
                </div>
              </div>
            </section>
          ) : tab === "clinic" ? (
            <>
              <section className="card se-card">
                <div className="t-eyebrow">The clinic</div>
                <div className="se-me">
                  <span className="tk" style={{ width: 52, height: 52 }}>
                    MC
                  </span>
                  <div>
                    <b style={{ fontSize: 16 }}>MedMate Clinic</b>
                    <p className="t-cap">12, 100 Feet Road, Indiranagar, Bengaluru 560038</p>
                  </div>
                </div>
                <dl className="plan-meta" style={{ marginTop: 12 }}>
                  <div>
                    <b>GSTIN</b>
                    29AAJCM4821K1Z7
                  </div>
                  <div>
                    <b>Registration</b>
                    KPME/BLR/2024/01873
                  </div>
                  <div>
                    <b>Phone</b>
                    080 4123 4567
                  </div>
                </dl>
              </section>

              <section className="card se-card">
                <div className="t-eyebrow">Payments</div>
                <p className="t-cap">
                  The clinic's own keys, so the money goes straight to the clinic rather than through
                  us.
                </p>
                <div style={{ marginTop: 10 }}>
                  <Button variant="secondary" icon="rupee" onClick={() => setConnecting(true)}>
                    Connect payments
                  </Button>
                </div>
              </section>
            </>
          ) : (
            <section className="card" style={{ padding: 18 }}>
              <div className="se-check warn">
                <span className="se-dot">
                  <Icon name="alert" size={15} />
                </span>
                <div>
                  <b>{TABS.find((entry) => entry.value === tab)?.label}</b>
                  <p>
                    This tab is not built yet. It is named here so the shape of the screen is honest
                    about what is missing.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <ConnectPaymentsDialog
        open={connecting}
        onClose={() => setConnecting(false)}
        onConnect={(keys) => {
          void connectPayments(keys);
        }}
      />
    </AppShell>
  );
}
