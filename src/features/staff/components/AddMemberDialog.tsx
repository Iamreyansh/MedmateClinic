"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/dialogs/FormField";
import { emailAddress, mobileNumber, requiredName } from "@/components/dialogs/validation";
import {
  addMember,
  fetchRoles,
  type ClinicRole,
  type MemberDraft,
} from "@/features/staff/api/staff";

/**
 * Add someone to the team.
 *
 * <p>The role is picked first, because it is what decides what they will be
 * able to open. The screen says what that role can and cannot do, so nobody
 * signs a person in and finds out afterwards.
 */
export type AddMemberDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called after the person is on the team. */
  onAdded?: () => void;
};

/** What each role is for, in the clinic's own words. */
const ROLE_NOTES: Record<string, string> = {
  front_desk: "Checks patients in, books, takes payment and hands over prescriptions.",
  nurse: "Takes vitals and sends each patient to the right doctor.",
  lab: "Collects samples and enters results.",
  accounts: "Bills, refunds and money reports.",
  admin: "Runs the clinic: team, doctors, locations and settings.",
  doctor: "Sees patients and signs prescriptions.",
};

export function AddMemberDialog({ open, onClose, onAdded }: AddMemberDialogProps) {
  const [roles, setRoles] = useState<ClinicRole[]>([]);
  const [role, setRole] = useState("");
  const [draft, setDraft] = useState<MemberDraft>({
    name: "",
    mobile: "",
    email: "",
    role: "",
    speciality: "",
    registration: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchRoles()
      .then((payload) => {
        if (!alive) return;
        const usable = payload.items.filter((entry) => !entry.owner);
        setRoles(usable);
        setRole((current) => current || (usable[0]?.name ?? ""));
      })
      .catch(() => {
        if (alive) setRoles([]);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const chosen = useMemo(() => roles.find((entry) => entry.name === role) ?? null, [roles, role]);
  const screens = chosen ? Object.entries(chosen.capabilities).filter(([, level]) => level !== "none") : [];
  const withheld = chosen
    ? Object.keys(chosen.capabilities).filter((resource) => chosen.capabilities[resource] === "none")
    : [];

  const submit = async () => {
    const found: Record<string, string> = {};
    const nameError = requiredName(draft.name);
    if (nameError) found.name = nameError;
    const mobileError = mobileNumber(draft.mobile);
    if (mobileError) found.mobile = mobileError;
    const emailError = emailAddress(draft.email);
    if (emailError) found.email = emailError;
    if (!role) found.role = "Choose what they will do.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      await addMember({ ...draft, role });
      setDraft({ name: "", mobile: "", email: "", role, speciality: "", registration: "" });
      setErrors({});
      onAdded?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not add them to the team.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add to the team"
      description="What will they do?"
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !role}>
            {saving ? "Adding…" : `Add as ${chosen?.label.toLowerCase() ?? "them"}`}
          </Button>
        </>
      }
    >
      <div className="st-roles" role="group" aria-label="What will they do?">
        {roles.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`st-role${entry.name === role ? " on" : ""}`}
            aria-pressed={entry.name === role}
            onClick={() => {
              setRole(entry.name);
              setDraft((current) => ({ ...current, role: entry.name }));
            }}
          >
            <b>{entry.label}</b>
            <span>{ROLE_NOTES[entry.name] ?? "Works in the clinic."}</span>
          </button>
        ))}
      </div>

      {chosen ? (
        <div className="st-can">
          <Icon name="shield" size={16} />
          <span>
            <b>Can open:</b>{" "}
            {screens.length > 0
              ? screens.map(([resource]) => resource).join(", ")
              : "nothing yet"}{" "}
            {withheld.length > 0 ? (
              <>
                <b>Cannot</b> {withheld.join(", ")}.
              </>
            ) : null}{" "}
            Diagnoses, notes and prescriptions are for the treating doctor.
          </span>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <TextField
          id="member-name"
          label="Full name"
          value={draft.name}
          onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
          error={errors.name}
          autoComplete="off"
        />
        <TextField
          id="member-mobile"
          label="Mobile (their login)"
          value={draft.mobile}
          onChange={(value) => setDraft((current) => ({ ...current, mobile: value }))}
          error={errors.mobile}
          placeholder="10 digits"
          inputMode="numeric"
          autoComplete="off"
        />
      </div>

      <TextField
        id="member-email"
        label="Email"
        value={draft.email}
        onChange={(value) => setDraft((current) => ({ ...current, email: value }))}
        error={errors.email}
        type="email"
        inputMode="email"
        autoComplete="off"
      />

      <p className="t-cap" style={{ marginTop: 8 }}>
        Adding a doctor? Use the Doctors page. It fetches their registration from HPR.
      </p>

      {failure ? (
        <p role="alert" className="t-cap" style={{ color: "var(--red)", marginTop: 10 }}>
          {failure}
        </p>
      ) : null}
    </Dialog>
  );
}
