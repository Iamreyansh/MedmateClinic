"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { lookupHpr } from "@/components/onboarding/lookupHpr";
import { ROLES, SIGNING, type StepProps } from "@/components/onboarding/types";

/** Step 4 — what the owner does here, and how they sign prescriptions. */
export function RoleStep({ form, set, onBack, onNext, valid }: StepProps) {
  const [looking, setLooking] = useState(false);

  const findHpr = async () => {
    setLooking(true);
    const doctor = await lookupHpr(form.hpr);
    set("doctorName", doctor.name);
    set("doctorQual", doctor.qualification);
    set("doctorReg", `${doctor.council} · ${doctor.registration}`);
    setLooking(false);
  };

  return (
    <>
      <div className="su-eyebrow">Step 4 of 5</div>
      <h2 className="su-h">
        Your <em>role</em>
      </h2>
      <p className="su-lead">You can add other doctors and staff once the clinic is set up.</p>
      <div className="su-form">
        <div className="su-roles">
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              className={`su-role${form.role === role.value ? " on" : ""}`}
              onClick={() => set("role", role.value)}
            >
              <b>{role.title}</b>
              <span>{role.body}</span>
            </button>
          ))}
        </div>

        {form.role === "doctor" ? (
          <>
            <div className="field">
              <label htmlFor="su-hpr">Your HPR ID</label>
              <div style={{ display: "flex", gap: 10 }}>
                <Input
                  id="su-hpr"
                  value={form.hpr}
                  placeholder="71-0000-0000-0000"
                  onChange={(event) => set("hpr", event.target.value)}
                />
                <Button variant="secondary" icon="search" disabled={looking} onClick={findHpr}>
                  {looking ? "Finding…" : "Find me"}
                </Button>
              </div>
            </div>

            {form.doctorName ? (
              <div className="su-ok">
                <Icon name="check" size={18} />
                <span>
                  <b>
                    {form.doctorName} · {form.doctorQual}
                  </b>
                  <span>{form.doctorReg}</span>
                </span>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="su-spec">Speciality</label>
              <Input
                id="su-spec"
                value={form.speciality}
                onChange={(event) => set("speciality", event.target.value)}
              />
            </div>

            <div className="su-2">
              <div className="field">
                <label htmlFor="su-fee">Consultation fee, in clinic (₹)</label>
                <Input
                  id="su-fee"
                  value={form.fee}
                  inputMode="numeric"
                  onChange={(event) => set("fee", event.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="field">
                <label htmlFor="su-video">Video or audio (₹)</label>
                <Input
                  id="su-video"
                  value={form.videoFee}
                  inputMode="numeric"
                  onChange={(event) => set("videoFee", event.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <div className="field">
              <label>How will you sign prescriptions?</label>
              <div className="su-2">
                {SIGNING.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`opt col${form.signing === option.value ? " on" : ""}`}
                    onClick={() => set("signing", option.value)}
                  >
                    <b>{option.title}</b>
                    <span>{option.body}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
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
