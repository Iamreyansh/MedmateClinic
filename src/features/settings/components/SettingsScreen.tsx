"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { ConfirmDialog, MyAccountDialog } from "@/components/dialogs";
import { TextField } from "@/components/dialogs/FormField";
import { ConnectPaymentsDialog } from "@/features/settings/components/ConnectPaymentsDialog";
import {
  acceptAgreement,
  connectPayments,
  fetchAgreements,
  fetchDevice,
  fetchPharmacies,
  fetchReadiness,
  fetchSettings,
  removePharmacy,
  saveSettings,
  type Agreement,
  type ClinicSettings,
  type DeviceState,
  type Pharmacy,
  type Readiness,
  type SettingsDraft,
} from "@/features/settings/api/settings";
import { AddPharmacyDialog } from "@/features/settings/components/AddPharmacyDialog";

/** The tabs the settings screen has — the ones the design names. */
const TABS = [
  { value: "account", label: "My account" },
  { value: "device", label: "This device" },
  { value: "clinic", label: "Clinic & letterhead" },
  { value: "pharmacies", label: "Pharmacies" },
  { value: "agreements", label: "Agreements" },
  { value: "live", label: "Ready to go live" },
];

/**
 * The clinic's settings.
 *
 * <p>Your account and this device, the clinic and what it has agreed to, and
 * what is still to do before the clinic sees a patient. Everything is read
 * from the clinic's own record, so what it shows is what the clinic has.
 */
export function SettingsScreen() {
  const [tab, setTab] = useState(TABS[0].value);
  const [connecting, setConnecting] = useState(false);
  const [account, setAccount] = useState(false);

  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [draft, setDraft] = useState<SettingsDraft>({
    displayName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    gstin: "",
    pan: "",
    registration: "",
    letterheadNote: "",
  });
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Pharmacy | null>(null);

  const load = useCallback(() => {
    fetchSettings()
      .then((payload) => {
        const record = payload.items[0] ?? null;
        setSettings(record);
        setDraft({
          displayName: record?.displayName ?? record?.name ?? "",
          email: record?.email ?? "",
          address: record?.address ?? "",
          city: record?.city ?? "",
          state: record?.state ?? "",
          phone: record?.phone ?? "",
          gstin: record?.gstin ?? "",
          pan: record?.pan ?? "",
          registration: record?.registration ?? "",
          letterheadNote: record?.letterheadNote ?? "",
        });
      })
      .catch((reason: unknown) => {
        setFailure(reason instanceof Error ? reason.message : "Could not open the settings.");
      });
    fetchDevice()
      .then((payload) => setDevice(payload.items[0] ?? null))
      .catch(() => setDevice(null));
    fetchPharmacies()
      .then((payload) => setPharmacies(payload.items))
      .catch(() => setPharmacies([]));
    fetchAgreements()
      .then((payload) => setAgreements(payload.items))
      .catch(() => setAgreements([]));
    fetchReadiness()
      .then((payload) => setReadiness(payload.items[0] ?? null))
      .catch(() => setReadiness(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const payload = await saveSettings(draft);
      const record = payload.items[0] ?? null;
      setSettings(record);
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not save the settings.");
    } finally {
      setSaving(false);
    }
  };

  const accept = async (agreement: Agreement) => {
    try {
      const payload = await acceptAgreement(agreement.kind, agreement.version);
      setAgreements(payload.items);
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not accept the agreement.");
    }
  };

  const remove = async (pharmacy: Pharmacy) => {
    setFailure(null);
    try {
      await removePharmacy(pharmacy.id);
      fetchPharmacies().then((payload) => setPharmacies(payload.items));
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "That pharmacy could not be removed.");
    }
  };

  return (
    <AppShell activeHref="/settings" onAccount={() => setAccount(true)}>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">Clinic settings</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Your account and this device, the clinic and what is left before going live.
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
              aria-current={tab === entry.value ? "page" : undefined}
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
                <span className="tk">AR</span>
                <div>
                  <b style={{ fontSize: 16 }}>{settings?.displayName || settings?.name || "—"}</b>
                  <p className="t-cap">
                    {settings?.registration || "No registration yet"} ·{" "}
                    {settings?.phone || "No phone yet"}
                  </p>
                </div>
              </div>
              <p className="t-cap" style={{ marginTop: 12 }}>
                Your name, your registration and the mobile the clinic reaches you on. A one-time
                code signs you in.
              </p>
              <div style={{ marginTop: 10 }}>
                <Button variant="secondary" size="sm" onClick={() => setAccount(true)}>
                  Open my account
                </Button>
              </div>
            </section>
          ) : null}

          {tab === "device" ? (
            <section className="card se-card">
              <div className="t-eyebrow">This device</div>
              <div className="se-me">
                <span className="tk">
                  <Icon name="lock" size={15} />
                </span>
                <div>
                  <b>{device?.pinSet ? "Your PIN is set" : "The PIN is not set"}</b>
                  <p className="t-cap">
                    {device?.pinSet
                      ? "Four digits unlock this screen, so you do not need a new code each time."
                      : "Four digits unlock this screen, so you do not need a new code each time. Set it in My account."}
                  </p>
                </div>
              </div>
              <div className="se-pins" style={{ marginTop: 10 }}>
                {(device?.devices ?? []).map((entry) => (
                  <div className="se-pin" key={entry.id}>
                    <b>{entry.name}</b>
                    <small className="t-cap">{entry.platform || "This device"}</small>
                  </div>
                ))}
                {(device?.devices ?? []).length === 0 ? (
                  <p className="t-cap">No other device is signed in.</p>
                ) : null}
              </div>
              <div style={{ marginTop: 10 }}>
                <Button variant="secondary" size="sm" onClick={() => setAccount(true)}>
                  Change my PIN
                </Button>
              </div>
            </section>
          ) : null}

          {tab === "clinic" ? (
            <>
              <section className="card se-card">
                <div className="t-eyebrow">The clinic</div>
                <div className="se-me">
                  <span className="tk">MC</span>
                  <div>
                    <b style={{ fontSize: 16 }}>{settings?.name || "—"}</b>
                    <p className="t-cap">
                      {draft.address}
                      {draft.city ? `, ${draft.city}` : ""}
                      {draft.state ? `, ${draft.state}` : ""}
                    </p>
                  </div>
                </div>
                <div className="se-paper" style={{ marginTop: 12 }}>
                  <div className="lh-clinic">{draft.displayName || settings?.name || "—"}</div>
                  <div className="lh-sub">{draft.letterheadNote || "No subtitle yet"}</div>
                  <div className="lh-addr">
                    {draft.address}
                    {draft.city ? `, ${draft.city}` : ""}
                    {draft.state ? `, ${draft.state}` : ""}
                    {draft.phone ? ` · ${draft.phone}` : ""}
                  </div>
                  <div className="lh-doc">
                    <b>{draft.gstin || "No GSTIN yet"}</b>
                    <span>{draft.registration || "No registration yet"}</span>
                  </div>
                </div>
              </section>

              <section className="card se-card">
                <div className="t-eyebrow">Clinic &amp; letterhead</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <TextField
                    id="settings-display-name"
                    label="Name on the letterhead"
                    value={draft.displayName ?? ""}
                    onChange={(value) => setDraft((current) => ({ ...current, displayName: value }))}
                    autoComplete="off"
                  />
                  <TextField
                    id="settings-email"
                    label="Email"
                    value={draft.email ?? ""}
                    onChange={(value) => setDraft((current) => ({ ...current, email: value }))}
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                  />
                </div>
                <TextField
                  id="settings-address"
                  label="Address"
                  value={draft.address ?? ""}
                  onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
                  autoComplete="off"
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <TextField
                    id="settings-city"
                    label="City"
                    value={draft.city ?? ""}
                    onChange={(value) => setDraft((current) => ({ ...current, city: value }))}
                    autoComplete="off"
                  />
                  <TextField
                    id="settings-state"
                    label="State"
                    value={draft.state ?? ""}
                    onChange={(value) => setDraft((current) => ({ ...current, state: value }))}
                    autoComplete="off"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <TextField
                    id="settings-phone"
                    label="Phone"
                    value={draft.phone ?? ""}
                    onChange={(value) => setDraft((current) => ({ ...current, phone: value }))}
                    inputMode="tel"
                    autoComplete="off"
                  />
                  <TextField
                    id="settings-gstin"
                    label="GSTIN"
                    value={draft.gstin ?? ""}
                    onChange={(value) => setDraft((current) => ({ ...current, gstin: value }))}
                    autoComplete="off"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <TextField
                    id="settings-pan"
                    label="PAN"
                    value={draft.pan ?? ""}
                    onChange={(value) => setDraft((current) => ({ ...current, pan: value }))}
                    autoComplete="off"
                  />
                  <TextField
                    id="settings-registration"
                    label="Registration"
                    value={draft.registration ?? ""}
                    onChange={(value) => setDraft((current) => ({ ...current, registration: value }))}
                    autoComplete="off"
                  />
                </div>
                <TextField
                  id="settings-letterhead-note"
                  label="A line under the clinic's name"
                  value={draft.letterheadNote ?? ""}
                  onChange={(value) => setDraft((current) => ({ ...current, letterheadNote: value }))}
                  hint="The timings, or the emergency number. It goes on every prescription."
                  autoComplete="off"
                />
                <div style={{ marginTop: 10 }}>
                  <Button onClick={() => void save()} disabled={saving}>
                    {saving ? "Saving…" : "Save the letterhead"}
                  </Button>
                </div>
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
          ) : null}

          {tab === "pharmacies" ? (
            <>
              <section className="card se-card">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div className="t-eyebrow">Pharmacies for e-prescriptions</div>
                    <p className="t-cap" style={{ marginTop: 6 }}>
                      When signing, the doctor can send the prescription to the pharmacy the patient
                      picks. Pharmacies with software connected get it on their dashboard at once;
                      others get it by SMS with a link to verify and view it.
                    </p>
                  </div>
                  <Button icon="plus" onClick={() => setAdding(true)}>
                    Add pharmacy
                  </Button>
                </div>

                {pharmacies.length === 0 ? (
                  <p className="t-cap" style={{ marginTop: 12 }}>
                    No pharmacies yet. Add the clinic's own pharmacy first, then any partners nearby.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    {pharmacies.map((pharmacy) => (
                      <div className="live-row" key={pharmacy.id}>
                        <div>
                          <b>{pharmacy.name}</b>
                          <p className="t-cap">
                            {pharmacy.address}
                            {pharmacy.city ? `, ${pharmacy.city}` : ""}
                            {pharmacy.phone ? ` · ${pharmacy.phone}` : ""}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {pharmacy.active ? null : <span className="badge plain">Not used</span>}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoving(pharmacy)}
                            disabled={pharmacy.prescriptions > 0}
                            title={
                              pharmacy.prescriptions > 0
                                ? "Prescriptions have been sent to this pharmacy."
                                : "Remove this pharmacy"
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="note">
                <Icon name="shield" size={16} />
                <div>
                  The patient chooses the pharmacy and the doctor records who chose. Controlled
                  medicines (Schedule X, NDPS) are never sent electronically; the patient takes the
                  paper copy. Doctors and clinics may not take commission from pharmacies for
                  prescriptions (IMC Regulations 2002, 6.4).
                </div>
              </div>
            </>
          ) : null}

          {tab === "agreements" ? (
            <section className="card se-card">
              <div className="t-eyebrow">What the clinic has agreed to</div>
              <p className="t-cap" style={{ marginTop: 6 }}>
                The version that was accepted and the day it was accepted. A new version of the terms
                is a new row, not an edit of the old one.
              </p>
              <div style={{ marginTop: 10 }}>
                {agreements.map((agreement) => (
                  <div className="se-check" key={agreement.kind}>
                    <span className={`se-dot ${agreement.accepted ? "ok" : "warn"}`}>
                      <Icon name={agreement.accepted ? "check" : "alert"} size={14} />
                    </span>
                    <div>
                      <b>{agreement.title}</b>
                      <p>
                        {agreement.accepted
                          ? `Accepted, version ${agreement.version}.`
                          : `Not accepted yet. The current version is ${agreement.version}.`}
                      </p>
                    </div>
                    {agreement.accepted ? null : (
                      <Button variant="secondary" size="sm" onClick={() => void accept(agreement)}>
                        Accept
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {tab === "live" && readiness ? (
            <>
              <section className="card se-card">
                <div className="se-live-top">
                  <span
                    className="se-ring"
                    style={{ ["--p" as string]: `${Math.round((readiness.done / Math.max(1, readiness.total)) * 100)}%` }}
                  >
                    <b>
                      {readiness.done}/{readiness.total}
                    </b>
                  </span>
                  <div>
                    <b style={{ fontSize: 16 }}>
                      {readiness.total - readiness.done}{" "}
                      {readiness.total - readiness.done === 1 ? "thing" : "things"} to finish
                    </b>
                    <p className="t-cap">
                      Checked live from your setup. The four outside services need accounts that only
                      the clinic can open; the rest you can fix here in a few minutes.
                    </p>
                  </div>
                </div>
              </section>

              {readiness.groups.map((group) => (
                <section className="card se-card" key={group.title}>
                  <div className="t-eyebrow">{group.title}</div>
                  <div style={{ marginTop: 6 }}>
                    {group.checks.map((check) => (
                      <div className={`se-check ${check.done ? "ok" : "warn"}`} key={check.label}>
                        <span className="se-dot">
                          <Icon name={check.done ? "check" : "alert"} size={14} />
                        </span>
                        <div>
                          <b>{check.label}</b>
                          <p>{check.detail}</p>
                        </div>
                        {check.action ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (check.action === "Edit letterhead") setTab("clinic");
                              if (check.action === "See messages") setTab("account");
                            }}
                          >
                            {check.action}
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          ) : null}

          {failure ? (
            <p role="alert" className="t-cap" style={{ color: "var(--red)" }}>
              {failure}
            </p>
          ) : null}
        </div>
      </div>

      <ConnectPaymentsDialog
        open={connecting}
        onClose={() => setConnecting(false)}
        onConnect={(keys) => {
          void connectPayments(keys);
        }}
      />
      <AddPharmacyDialog open={adding} onClose={() => setAdding(false)} onSaved={load} />
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove this pharmacy?"
        subject={removing?.name ?? ""}
        detail="The clinic stops sending prescriptions there. Prescriptions already sent there are kept."
        confirmLabel="Remove the pharmacy"
        onConfirm={() => (removing ? remove(removing) : undefined)}
        onError={(message) => setFailure(message)}
      />
      <MyAccountDialog open={account} onClose={() => setAccount(false)} />
    </AppShell>
  );
}
