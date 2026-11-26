"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/dialogs/FormField";
import { mobileNumber, requiredName } from "@/components/dialogs/validation";
import { addDoctor, lookupHpr, type DoctorDraft } from "@/features/doctors/api/doctors";

/**
 * Add a doctor.
 *
 * <p>Two steps: who they are, and how they work here. The first step takes
 * the HPR id, because every doctor in India has one — but the HPR registry is
 * not connected to this service, so the step looks the person up on the
 * clinic's own list and tells the truth when it cannot find them.
 */
export type AddDoctorDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

type Step = "who" | "where";

export function AddDoctorDialog({ open, onClose, onSaved }: AddDoctorDialogProps) {
  const [step, setStep] = useState<Step>("who");
  const [hprId, setHprId] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookup, setLookup] = useState<string | null>(null);
  const [draft, setDraft] = useState<DoctorDraft>({
    name: "",
    mobile: "",
    email: "",
    speciality: "",
    registration: "",
    hprId: "",
    room: "",
    consultationFee: 500,
    videoFee: 400,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const find = async () => {
    setLooking(true);
    setLookup(null);
    try {
      const payload = await lookupHpr(hprId);
      const record = payload.items[0];
      setLookup(record.name);
      setDraft((current) => ({
        ...current,
        hprId,
        name: record.name,
        speciality: record.speciality,
        registration: record.registration,
        room: record.room,
      }));
      setStep("where");
    } catch (reason: unknown) {
      setLookup(
        reason instanceof Error
          ? reason.message
          : "This clinic has no doctor under that HPR id yet. Enter their details yourself.",
      );
    } finally {
      setLooking(false);
    }
  };

  const submit = async () => {
    const found: Record<string, string> = {};
    const nameError = requiredName(draft.name);
    if (nameError) found.name = nameError;
    const mobileError = mobileNumber(draft.mobile);
    if (mobileError) found.mobile = mobileError;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      await addDoctor({
        ...draft,
        hprId: draft.hprId || hprId,
        consultationFee: Number(draft.consultationFee) || 0,
        videoFee: Number(draft.videoFee) || 0,
      });
      onSaved?.();
      onClose();
    } catch (reason: unknown) {
      setFailure(reason instanceof Error ? reason.message : "Could not add the doctor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a doctor"
      size="wide"
      footer={
        step === "who" ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={looking}>
              Cancel
            </Button>
            <Button onClick={() => void find()} disabled={looking || hprId.trim().length < 10}>
              {looking ? "Looking…" : "Look them up"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep("who")} disabled={saving}>
              Back
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Adding…" : "Add the doctor"}
            </Button>
          </>
        )
      }
    >
      <div className="chips" style={{ marginBottom: 12 }}>
        <span className={`chip${step === "who" ? " on" : ""}`}>1 · Who they are</span>
        <span className={`chip${step === "where" ? " on" : ""}`}>2 · How they work here</span>
      </div>

      {step === "who" ? (
        <>
          <p className="t-cap">
            Every doctor in India has a Healthcare Professional Registry (HPR) id. The registry is
            not connected to this service, so this looks the doctor up on your own team — if they
            are already here, their details are filled in for you. If they are not, type them in
            on the next step.
          </p>
          <TextField
            id="doctor-hpr"
            label="HPR id"
            value={hprId}
            onChange={(value) => setHprId(value)}
            placeholder="71-0000-0000-0000"
            inputMode="numeric"
            autoComplete="off"
            hint="Fourteen digits, with or without the dashes."
          />
          {lookup ? (
            <p role="status" className="t-cap" style={{ marginTop: 6 }}>
              {lookup}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <TextField
            id="doctor-name"
            label="Full name"
            value={draft.name}
            onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
            error={errors.name}
            autoComplete="off"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TextField
              id="doctor-mobile"
              label="Mobile (their login)"
              value={draft.mobile}
              onChange={(value) => setDraft((current) => ({ ...current, mobile: value }))}
              error={errors.mobile}
              placeholder="10 digits"
              inputMode="numeric"
              autoComplete="off"
            />
            <TextField
              id="doctor-email"
              label="Email"
              value={draft.email}
              onChange={(value) => setDraft((current) => ({ ...current, email: value }))}
              type="email"
              inputMode="email"
              autoComplete="off"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TextField
              id="doctor-speciality"
              label="What they do"
              value={draft.speciality}
              onChange={(value) => setDraft((current) => ({ ...current, speciality: value }))}
              autoComplete="off"
            />
            <TextField
              id="doctor-registration"
              label="Registration"
              value={draft.registration}
              onChange={(value) => setDraft((current) => ({ ...current, registration: value }))}
              autoComplete="off"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TextField
              id="doctor-room"
              label="Room"
              value={draft.room}
              onChange={(value) => setDraft((current) => ({ ...current, room: value }))}
              hint="The room they are found in, at the branch they work from."
              autoComplete="off"
            />
            <TextField
              id="doctor-fee"
              label="Consultation fee"
              value={String(draft.consultationFee)}
              onChange={(value) =>
                setDraft((current) => ({ ...current, consultationFee: Number(value) || 0 }))
              }
              type="number"
              inputMode="numeric"
            />
          </div>
          <TextField
            id="doctor-video-fee"
            label="Video consultation fee"
            value={String(draft.videoFee)}
            onChange={(value) => setDraft((current) => ({ ...current, videoFee: Number(value) || 0 }))}
            type="number"
            inputMode="numeric"
          />
        </>
      )}

      {failure ? (
        <p role="alert" className="t-cap" style={{ color: "var(--red)", marginTop: 10 }}>
          {failure}
        </p>
      ) : null}
    </Dialog>
  );
}
