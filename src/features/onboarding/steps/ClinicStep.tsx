"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { ACTS, CLINIC_KINDS, type StepProps } from "@/features/onboarding/types";

/** Step 2 — the clinic: what it is called, what kind it is, how it is registered. */
export function ClinicStep({ form, set, onBack, onNext, valid }: StepProps) {
  return (
    <>
      <div className="su-eyebrow">Step 2 of 5</div>
      <h2 className="su-h">
        Now, your <em>clinic</em>
      </h2>
      <p className="su-lead">This goes on prescriptions, bills and the page patients book from.</p>
      <div className="su-form">
        <div className="field">
          <label htmlFor="su-clinic-name">Clinic name</label>
          <Input
            id="su-clinic-name"
            value={form.clinicName}
            onChange={(event) => set("clinicName", event.target.value)}
          />
        </div>

        <div className="field">
          <label>What kind of clinic?</label>
          <div className="su-3">
            {CLINIC_KINDS.map((kind) => (
              <button
                key={kind.value}
                type="button"
                className={`opt col${form.clinicKind === kind.value ? " on" : ""}`}
                onClick={() => set("clinicKind", kind.value)}
              >
                <b>{kind.title}</b>
                <span>{kind.body}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="su-2">
          <div className="field">
            <label htmlFor="su-act">Registered under</label>
            <select
              id="su-act"
              className="input"
              value={form.registeredUnder}
              onChange={(event) => set("registeredUnder", event.target.value)}
            >
              <option value="">Choose the act</option>
              {ACTS.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="su-reg">Registration number</label>
            <Input
              id="su-reg"
              value={form.regNumber}
              onChange={(event) => set("regNumber", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="su-valid">Valid until</label>
            <Input
              id="su-valid"
              type="date"
              value={form.validUntil}
              onChange={(event) => set("validUntil", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="su-clinic-email">Email</label>
            <Input
              id="su-clinic-email"
              type="email"
              value={form.clinicEmail}
              onChange={(event) => set("clinicEmail", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="su-gstin">GSTIN (only if GST-registered)</label>
            <Input
              id="su-gstin"
              value={form.gstin}
              onChange={(event) => set("gstin", event.target.value.toUpperCase())}
            />
          </div>
          <div className="field">
            <label htmlFor="su-pan">PAN</label>
            <Input
              id="su-pan"
              value={form.pan}
              onChange={(event) => set("pan", event.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="su-book">
          <Icon name="cal" size={16} />
          <span>
            The booking link is made when the clinic is created. It carries a private code, so
            nobody can guess the clinic&apos;s address.
          </span>
        </div>
      </div>
      <div className="su-foot">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!valid} onClick={onNext}>
          Continue
        </Button>
      </div>
    </>
  );
}
