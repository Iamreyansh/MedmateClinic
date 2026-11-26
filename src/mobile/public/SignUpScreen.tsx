"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "@/services/api/client";
import { requestPreSignupCode, signUpClinic, verifyPreSignupCode } from "@/mobile/api";
import type { SignupRequest, SignupResult } from "@/mobile/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { useAction, useCountdown } from "@/mobile/hooks";

/**
 * The clinic sign-up on a phone.
 *
 * Five steps — the clinic, the location, the doctor, the role and you — and
 * then the code. The code is not decoration: the service cannot verify a
 * mobile before the clinic exists, so the sign-up asks for a code of its
 * own and the service refuses the sign-up until it has been verified.
 */

const STEPS = ["Clinic", "Location", "Doctor", "Role", "You"] as const;
type Step = (typeof STEPS)[number];

const ORDER: Step[] = ["Clinic", "Location", "Doctor", "Role", "You"];

/** How long the person waits before the code may be sent again. */
const RESEND_SECONDS = 30;

/** How many wrong codes may be tried before the code is spent. */
const MAX_ATTEMPTS = 5;

const CLINIC_KINDS = [
  { value: "clinic", label: "Clinic", note: "One or more doctors" },
  { value: "polyclinic", label: "Polyclinic", note: "Several specialities" },
  { value: "nursing", label: "Nursing home", note: "With beds" },
];

const ROLES = [
  { value: "doctor", label: "I'm a doctor here", note: "I see patients and write prescriptions." },
  { value: "manager", label: "I run the clinic", note: "I manage the clinic but don't see patients." },
];

const SIGNING = [
  { value: "aadhaar", label: "Aadhaar eSign", note: "OTP on your Aadhaar-linked mobile" },
  { value: "dsc", label: "DSC token", note: "Class 3 digital signature" },
];

const STATES = [
  "Andhra Pradesh (37)",
  "Assam (18)",
  "Bihar (10)",
  "Chhattisgarh (22)",
  "Delhi (07)",
  "Goa (30)",
  "Gujarat (24)",
  "Haryana (06)",
  "Himachal Pradesh (02)",
  "Jharkhand (20)",
  "Karnataka (29)",
  "Kerala (32)",
  "Madhya Pradesh (23)",
  "Maharashtra (27)",
  "Odisha (21)",
  "Punjab (03)",
  "Rajasthan (08)",
  "Tamil Nadu (33)",
  "Telangana (36)",
  "Uttar Pradesh (09)",
  "Uttarakhand (05)",
  "West Bengal (19)",
];

const ACTS = [
  "Karnataka Private Medical Establishments Act",
  "Karnataka Clinical Establishments Act",
  "Kerala Clinical Establishments Act",
  "Tamil Nadu Clinical Establishments Act",
  "Maharashtra Clinical Establishments Act",
  "Other state law",
  "Applied, number awaited",
];

const EMPTY: SignupRequest = {
  name: "",
  mobile: "",
  email: "",
  clinicName: "",
  clinicKind: "",
  registeredUnder: "",
  regNumber: "",
  validUntil: "",
  clinicEmail: "",
  gstin: "",
  pan: "",
  locName: "",
  street: "",
  area: "",
  city: "",
  pin: "",
  state: "Karnataka (29)",
  phone: "",
  rooms: "",
  hfr: "",
  role: "",
  hpr: "",
  doctorName: "",
  doctorQual: "",
  doctorReg: "",
  speciality: "",
  fee: "",
  videoFee: "",
  signing: "",
};

/** The sign-up, on a phone. */
export function MobileSignUpScreen() {
  const [form, setForm] = useState<SignupRequest>(EMPTY);
  const [step, setStep] = useState<Step>("Clinic");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState<SignupResult | null>(null);
  const action = useAction();
  const cooldown = useCountdown(RESEND_SECONDS);

  const set = <K extends keyof SignupRequest>(key: K, value: SignupRequest[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const index = ORDER.indexOf(step);

  const valid = useMemo(() => {
    switch (step) {
      case "Clinic":
        return (
          form.clinicName.trim().length > 1 &&
          form.clinicKind !== "" &&
          form.registeredUnder !== "" &&
          form.regNumber.trim().length > 1
        );
      case "Location":
        return (
          form.locName.trim().length > 1 &&
          form.street.trim().length > 1 &&
          form.city.trim().length > 1 &&
          form.pin.replace(/\D/g, "").length === 6 &&
          form.phone.replace(/\D/g, "").length >= 10
        );
      case "Doctor":
        return (
          form.doctorName.trim() === "" ||
          (form.doctorName.trim().length > 1 &&
            form.doctorReg.trim().length > 1 &&
            form.speciality.trim().length > 1 &&
            Number(form.fee) > 0)
        );
      case "Role":
        if (form.role === "") return false;
        if (form.role !== "doctor") return true;
        return (
          form.doctorName.trim().length > 1 &&
          form.doctorReg.trim().length > 1 &&
          form.speciality.trim().length > 1 &&
          Number(form.fee) > 0 &&
          form.signing !== ""
        );
      case "You":
        return form.name.trim().length > 1 && form.mobile.replace(/\D/g, "").length === 10;
      default:
        return true;
    }
  }, [form, step]);

  const sendCode = async () => {
    const sent = await action.run(() => requestPreSignupCode(form.mobile));
    if (sent) {
      setCodeSent(true);
      setAttempts(0);
      setCode("");
      cooldown.start();
    }
  };

  const checkCode = async () => {
    const verified = await action.run(() => verifyPreSignupCode(form.mobile, code));
    if (!verified) {
      setAttempts((count) => count + 1);
      setCode("");
      return;
    }
    // The mobile is verified. The cooldown is over, and the sign-up may go.
    cooldown.stop();
    const answer = await action.run(async () => {
      const result = await signUpClinic(form);
      // The sign-up signs the owner in, so the device holds the new clinic's
      // session from here on.
      auth.set(result.accessToken);
      return result;
    });
    if (answer) setDone(answer);
  };

  if (done) {
    return (
      <div className="mob-phone">
        <header className="mob-head pub">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>Your clinic is ready</h1>
          <p>{done.clinicName}</p>
        </header>
        <div className="mob-body">
          <div className="su-ok">
            <Icon name="check" size={20} />
            <div>
              <b>You are signed in</b>
              <span>Your clinic's dashboard is open on this device.</span>
            </div>
          </div>

          <div className="su-book">
            <Icon name="send" size={18} />
            <div>
              <b>Your booking link</b>
              <span style={{ wordBreak: "break-all" }}>{done.bookingUrl}</span>
            </div>
          </div>

          <p className="t-cap">
            Send this link to your patients. It is the clinic&apos;s own link, and it is the only
            one that works.
          </p>

          <div className="mob-foot">
            <Link className="btn block" to="/m/dashboard">
              Open the dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mob-phone">
      <header className="mob-head pub">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Set up your clinic</h1>
        <p>Step {index + 1} of {STEPS.length}</p>
      </header>

      <div className="mob-body">
        <div className="mob-steps" aria-hidden="true">
          {STEPS.map((entry, position) => (
            <span
              key={entry}
              className={`seg${position < index ? " on" : position === index ? " now" : ""}`}
            />
          ))}
        </div>
        <p className="mob-step-lbl">
          {STEPS[index]} — {STEPS.length - index - 1} to go
        </p>

        {action.error ? (
          <div className="note red" role="alert">
            <Icon name="alert" size={18} />
            <div>{action.error}</div>
          </div>
        ) : null}

        {step === "Clinic" ? (
          <div className="mob-section">
            <Field
              id="su-clinic"
              label="Clinic name"
              value={form.clinicName}
              onChange={(value) => set("clinicName", value)}
            />
            <Choice
              label="What kind of clinic is it?"
              options={CLINIC_KINDS}
              value={form.clinicKind}
              onChange={(value) => set("clinicKind", value)}
            />
            <Select
              id="su-under"
              label="Registered under"
              value={form.registeredUnder}
              options={ACTS}
              placeholder="Your state act"
              onChange={(value) => set("registeredUnder", value)}
            />
            <Field
              id="su-reg"
              label="Registration number"
              value={form.regNumber}
              onChange={(value) => set("regNumber", value)}
            />
            <Field
              id="su-valid"
              label="Valid until"
              value={form.validUntil}
              placeholder="DD/MM/YYYY"
              onChange={(value) => set("validUntil", value)}
            />
            <Field
              id="su-cemail"
              label="Clinic email"
              type="email"
              value={form.clinicEmail}
              onChange={(value) => set("clinicEmail", value)}
            />
            <Field
              id="su-gstin"
              label="GSTIN (if registered)"
              value={form.gstin}
              onChange={(value) => set("gstin", value)}
            />
            <Field
              id="su-pan"
              label="PAN (if registered)"
              value={form.pan}
              onChange={(value) => set("pan", value)}
            />
          </div>
        ) : null}

        {step === "Location" ? (
          <div className="mob-section">
            <Field
              id="su-loc"
              label="Location name"
              value={form.locName}
              placeholder="Indiranagar clinic"
              onChange={(value) => set("locName", value)}
            />
            <Field
              id="su-street"
              label="Street"
              value={form.street}
              onChange={(value) => set("street", value)}
            />
            <Field
              id="su-area"
              label="Area"
              value={form.area}
              onChange={(value) => set("area", value)}
            />
            <Field
              id="su-city"
              label="City"
              value={form.city}
              onChange={(value) => set("city", value)}
            />
            <Field
              id="su-pin"
              label="PIN"
              value={form.pin}
              inputMode="numeric"
              maxLength={6}
              onChange={(value) => set("pin", value)}
            />
            <Select
              id="su-state"
              label="State"
              value={form.state}
              options={STATES}
              onChange={(value) => set("state", value)}
            />
            <Field
              id="su-phone"
              label="Clinic phone"
              value={form.phone}
              inputMode="tel"
              onChange={(value) => set("phone", value)}
            />
            <Field
              id="su-rooms"
              label="Rooms"
              value={form.rooms}
              inputMode="numeric"
              onChange={(value) => set("rooms", value)}
            />
            <Field
              id="su-hfr"
              label="Facility HFR ID (if you have one)"
              value={form.hfr}
              onChange={(value) => set("hfr", value)}
            />
          </div>
        ) : null}

        {step === "Doctor" ? (
          <div className="mob-section">
            <p className="t-cap">
              The doctor who will see patients here. Skip it if the clinic has no doctor yet.
            </p>
            <Field
              id="su-dname"
              label="Doctor's name"
              value={form.doctorName}
              onChange={(value) => set("doctorName", value)}
            />
            <Field
              id="su-dqual"
              label="Qualification"
              value={form.doctorQual}
              placeholder="MBBS, MD"
              onChange={(value) => set("doctorQual", value)}
            />
            <Field
              id="su-dreg"
              label="Medical council registration"
              value={form.doctorReg}
              onChange={(value) => set("doctorReg", value)}
            />
            <Field
              id="su-spec"
              label="Speciality"
              value={form.speciality}
              onChange={(value) => set("speciality", value)}
            />
            <Field
              id="su-fee"
              label="Fee in the clinic (₹)"
              value={form.fee}
              inputMode="numeric"
              onChange={(value) => set("fee", value)}
            />
            <Field
              id="su-vfee"
              label="Fee for a video consultation (₹)"
              value={form.videoFee}
              inputMode="numeric"
              onChange={(value) => set("videoFee", value)}
            />
            <Field
              id="su-hpr"
              label="HPR ID (if you are a doctor)"
              value={form.hpr}
              onChange={(value) => set("hpr", value)}
            />
          </div>
        ) : null}

        {step === "Role" ? (
          <div className="mob-section">
            <Choice
              label="What is your role here?"
              options={ROLES}
              value={form.role}
              onChange={(value) => set("role", value)}
            />
            {form.role === "doctor" ? (
              <>
                <Choice
                  label="How will you sign prescriptions?"
                  options={SIGNING}
                  value={form.signing}
                  onChange={(value) => set("signing", value)}
                />
                {form.doctorName.trim() === "" ? (
                  <div className="note gold">
                    <Icon name="alert" size={18} />
                    <div>
                      Add the doctor&apos;s details on the previous step, or choose &ldquo;I run the
                      clinic&rdquo; instead.
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {step === "You" ? (
          <div className="mob-section">
            {!codeSent ? (
              <>
                <Field
                  id="su-name"
                  label="Your full name"
                  value={form.name}
                  autoComplete="name"
                  onChange={(value) => set("name", value)}
                />
                <Field
                  id="su-mobile"
                  label="Your mobile"
                  value={form.mobile}
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel"
                  onChange={(value) => set("mobile", value)}
                />
                <Field
                  id="su-email"
                  label="Email (for invoices and agreements)"
                  type="email"
                  value={form.email}
                  autoComplete="email"
                  onChange={(value) => set("email", value)}
                />
                <div className="su-note">
                  <Icon name="shield" size={16} />
                  <span>
                    We send a 6-digit code to your mobile to check it is yours. Your details are
                    used only to set up and run your MedMate account (DPDP Act 2023).
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="su-lead" style={{ margin: "0 0 14px" }}>
                  We sent a 6-digit code to {form.mobile}. Type it in here.
                </p>
                <Field
                  id="su-code"
                  label="The 6-digit code"
                  value={code}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(value) => setCode(value.replace(/\D/g, ""))}
                />
                {attempts > 0 ? (
                  <div className="note gold">
                    <Icon name="alert" size={18} />
                    <div>
                      {attempts} {attempts === 1 ? "try" : "tries"} so far. After {MAX_ATTEMPTS} the
                      code is spent and you will need a new one.
                    </div>
                  </div>
                ) : null}
                <Button
                  variant="secondary"
                  disabled={cooldown.left > 0 || attempts >= MAX_ATTEMPTS || action.busy}
                  onClick={() => void sendCode()}
                >
                  {cooldown.left > 0
                    ? `Send another code in ${cooldown.left}s`
                    : attempts >= MAX_ATTEMPTS
                      ? "The code has been spent"
                      : "Send the code again"}
                </Button>
              </>
            )}
          </div>
        ) : null}

        <div className="mob-foot">
          {index > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(ORDER[Math.max(0, index - 1)])}
              disabled={action.busy}
            >
              Back
            </Button>
          ) : null}

          {step === "You" ? (
            codeSent ? (
              <Button
                icon="check"
                disabled={code.length !== 6 || attempts >= MAX_ATTEMPTS || action.busy}
                onClick={() => void checkCode()}
              >
                {action.busy ? "Checking…" : "Verify and create the clinic"}
              </Button>
            ) : (
              <Button
                icon="send"
                disabled={!valid || action.busy}
                onClick={() => void sendCode()}
              >
                {action.busy ? "Sending…" : "Send the code"}
              </Button>
            )
          ) : (
            <Button
              icon="chev"
              disabled={!valid}
              onClick={() => setStep(ORDER[Math.min(ORDER.length - 1, index + 1)])}
            >
              Next
            </Button>
          )}
        </div>

        <p className="t-cap" style={{ textAlign: "center" }}>
          Already use MedMate? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

/** One field, with its label. */
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  maxLength,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** One choice from a list, as a dropdown. */
function Select({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

/** One choice out of a few, as a set of rows. */
function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string; note: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
      <div className="mob-section">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`mob-agree${value === option.value ? " on" : ""}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="tick">
                {value === option.value ? <Icon name="check" size={14} /> : null}
              </span>
              <b>{option.label}</b>
            </span>
            <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{option.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
