"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Intro } from "@/features/onboarding/components/Intro";
import { ClinicStep } from "@/features/onboarding/steps/ClinicStep";
import { LocationStep } from "@/features/onboarding/steps/LocationStep";
import { RoleStep } from "@/features/onboarding/steps/RoleStep";
import { AgreementsStep } from "@/features/onboarding/steps/AgreementsStep";
import { YouStep } from "@/features/onboarding/steps/YouStep";
import { CodeStep } from "@/features/onboarding/steps/CodeStep";
import { signupClinic } from "@/features/onboarding/api/signup";
import { ApiError } from "@/services/api";
import { auth } from "@/services/api/client";
import {
  AGREEMENTS,
  EMPTY_FORM,
  HANDY,
  STEPS,
  type Form,
  type SetField,
  type Stage,
} from "@/features/onboarding/types";

/**
 * The clinic sign-up flow — the screen before it, then five steps.
 *
 * The state lives here; each step is a pure form over it. Where the flow would
 * talk to a service — the OTP, the HPR registry — the call is named and
 * isolated so it can be pointed at the API.
 */

const ORDER: Stage[] = ["you", "code", "clinic", "location", "role", "agreements"];

export function ClinicSignUp() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("intro");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const set: SetField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    // a different number is a different code
    if (key === "mobile") setCode("");
  };

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

  /**
   * Create the clinic, and sign the owner in.
   *
   * The service makes the clinic, its own schema and the booking link, and
   * answers with the session. The session is kept the way the rest of the app
   * keeps it — in memory and in the session storage, so a refresh does not
   * sign the owner out and a closed tab does.
   */
  const finish = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await signupClinic(form);
      auth.set(result.accessToken);
      navigate("/dashboard", {
        state: { clinicName: result.clinicName, bookingUrl: result.bookingUrl },
      });
    } catch (reason) {
      setCreateError(
        reason instanceof ApiError && reason.message
          ? reason.message
          : "The clinic could not be created. Check the connection and try again.",
      );
    } finally {
      setCreating(false);
    }
  };

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
              onFinish={finish}
              valid={valid}
              busy={creating}
              error={createError}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
