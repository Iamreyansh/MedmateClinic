"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Intro } from "@/components/onboarding/Intro";
import { ClinicStep } from "@/components/onboarding/steps/ClinicStep";
import { LocationStep } from "@/components/onboarding/steps/LocationStep";
import { RoleStep } from "@/components/onboarding/steps/RoleStep";
import { AgreementsStep } from "@/components/onboarding/steps/AgreementsStep";
import { CodeStep, YouStep } from "@/components/onboarding/steps/YouStep";
import {
  AGREEMENTS,
  EMPTY_FORM,
  HANDY,
  STEPS,
  type Form,
  type SetField,
  type Stage,
} from "@/components/onboarding/types";

/**
 * The clinic sign-up flow — the screen before it, then five steps.
 *
 * The state lives here; each step is a pure form over it. Where the flow would
 * talk to a service — the OTP, the HPR registry — the call is named and
 * isolated so it can be pointed at the API.
 */

const ORDER: Stage[] = ["you", "code", "clinic", "location", "role", "agreements"];

export function ClinicSignUp() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState<string[]>([]);

  const set: SetField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const stepIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.key === stage),
  );

  const valid = useMemo(() => {
    switch (stage) {
      case "you":
        return form.name.trim().length > 1 && form.mobile.replace(/\D/g, "").length === 10;
      case "code":
        return code.replace(/\D/g, "").length === 6;
      case "clinic":
        return (
          form.clinicName.trim().length > 1 &&
          form.clinicKind !== "" &&
          form.registeredUnder !== "" &&
          form.regNumber.trim().length > 1
        );
      case "location":
        return (
          form.locName.trim().length > 1 &&
          form.street.trim().length > 1 &&
          form.city.trim().length > 1 &&
          form.pin.replace(/\D/g, "").length === 6 &&
          form.phone.replace(/\D/g, "").length >= 10
        );
      case "role":
        if (form.role !== "doctor") return form.role === "manager";
        return (
          form.hpr.trim().length > 3 &&
          form.doctorName.trim().length > 1 &&
          form.speciality.trim().length > 1 &&
          Number(form.fee) > 0 &&
          form.signing !== ""
        );
      case "agreements":
        return agreed.length === AGREEMENTS.length;
      default:
        return true;
    }
  }, [stage, form, code, agreed]);

  const goTo = (next: Stage) => setStage(next);

  const forward = () => {
    const next = ORDER[ORDER.indexOf(stage) + 1];
    if (next) goTo(next);
  };

  const backward = () => {
    const index = ORDER.indexOf(stage);
    if (index > 0) goTo(ORDER[index - 1]);
  };

  const toggleAgreement = (id: string) =>
    setAgreed((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));

  if (stage === "intro") {
    return <Intro onStart={() => goTo("you")} />;
  }

  return (
    <div className="su">
      <aside className="su-side">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
          <div className="slogan">DOCTOR DASHBOARD</div>
        </div>

        <div className="su-pitch">
          <h1>
            Run your clinic on MedMate, <em>ready in 10 minutes.</em>
          </h1>
          <p className="su-sub">14 days free with the full Clinic plan. No card needed.</p>
          <div className="su-handy">
            <b>Keep these handy</b>
            <ul>
              {HANDY.map((item) => (
                <li key={item}>
                  <Icon name="check" size={16} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <main className="su-main">
        <div className="su-card">
          <div className="su-steps">
            {STEPS.map((step, index) => (
              <div key={step.key}>
                <div className={`seg${index <= stepIndex ? " on" : ""}`} />
                <div
                  className={`lbl${index < stepIndex ? " done" : ""}${index === stepIndex ? " on" : ""}`}
                >
                  {step.label}
                </div>
              </div>
            ))}
          </div>

          {stage === "you" ? (
            <YouStep form={form} set={set} onBack={backward} onNext={() => goTo("code")} valid={valid} />
          ) : null}

          {stage === "code" ? (
            <CodeStep
              mobile={form.mobile}
              code={code}
              setCode={setCode}
              onBack={backward}
              onNext={forward}
              valid={valid}
            />
          ) : null}

          {stage === "clinic" ? (
            <ClinicStep form={form} set={set} onBack={backward} onNext={forward} valid={valid} />
          ) : null}

          {stage === "location" ? (
            <LocationStep form={form} set={set} onBack={backward} onNext={forward} valid={valid} />
          ) : null}

          {stage === "role" ? (
            <RoleStep form={form} set={set} onBack={backward} onNext={forward} valid={valid} />
          ) : null}

          {stage === "agreements" ? (
            <AgreementsStep
              agreed={agreed}
              onToggle={toggleAgreement}
              onBack={backward}
              onFinish={() => router.push("/dashboard")}
              valid={valid}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
