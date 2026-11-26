"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/ui/ScreenStates";
import { TextField } from "@/components/dialogs/FormField";
import { emailAddress, requiredName } from "@/components/dialogs/validation";
import { fetchAccount, saveAccount, type Account } from "@/features/staff-admin/api/account";

/**
 * The account of the person signed in.
 *
 * <p>It is the same account the sidebar's My account dialog opens, on a page
 * of its own, so it can be linked to and printed.
 */
export function AccountScreen() {
  const [account, setAccount] = useState<Account | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "", speciality: "", registration: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAccount()
      .then((payload) => {
        if (!alive) return;
        const record = payload.items[0] ?? null;
        setAccount(record);
        setDraft({
          name: record?.name ?? "",
          email: record?.email ?? "",
          speciality: record?.speciality ?? "",
          registration: record?.registration ?? "",
        });
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setFailure(reason instanceof Error ? reason.message : "Could not open your account.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    const found: Record<string, string> = {};
    const nameError = requiredName(draft.name);
    if (nameError) found.name = nameError;
    const emailError = emailAddress(draft.email);
    if (emailError) found.email = emailError;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      const payload = await saveAccount(draft);
      setAccount(payload.items[0] ?? null);
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not save your details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell activeHref="/account">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">My account</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Your name, your registration and the mobile the clinic reaches you on.
          </p>
        </div>
      </div>

      {loading ? <LoadingState title="Opening your account…" /> : null}

      {account ? (
        <div className="se-body">
          <section className="card se-card">
            <div className="se-me">
              <span className="tk">{account.initials || "—"}</span>
              <div>
                <b style={{ fontSize: 16 }}>{account.name}</b>
                <p className="t-cap">
                  {account.role}
                  {account.mobile ? ` · ${account.mobile}` : ""}
                </p>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <TextField
                id="page-account-name"
                label="Full name"
                value={draft.name}
                onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
                error={errors.name}
                autoComplete="off"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <TextField
                  id="page-account-email"
                  label="Email"
                  value={draft.email}
                  onChange={(value) => setDraft((current) => ({ ...current, email: value }))}
                  error={errors.email}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                />
                <TextField
                  id="page-account-speciality"
                  label="What you do"
                  value={draft.speciality}
                  onChange={(value) => setDraft((current) => ({ ...current, speciality: value }))}
                  autoComplete="off"
                />
              </div>
              <TextField
                id="page-account-registration"
                label="Your registration"
                value={draft.registration}
                onChange={(value) => setDraft((current) => ({ ...current, registration: value }))}
                autoComplete="off"
              />
              <div style={{ marginTop: 10 }}>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </section>

          <section className="card se-card">
            <div className="se-me">
              <span className="tk">
                <Icon name="lock" size={15} />
              </span>
              <div>
                <b>{account.pinSet ? "Your PIN is set" : "The PIN is not set"}</b>
                <p className="t-cap">
                  The screen locks after 15 minutes without use. Open My account from the sidebar to
                  change it.
                </p>
              </div>
            </div>
          </section>

          {failure ? (
            <p role="alert" className="t-cap" style={{ color: "var(--red)" }}>
              {failure}
            </p>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
