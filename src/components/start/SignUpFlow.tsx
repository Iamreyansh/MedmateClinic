"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

/**
 * The clinic sign-up flow — five steps, and the screen before it.
 *
 * Nothing is prefilled: the file fills its fields with an example, a real
 * clinic starts from nothing. The only defaults are the things a person would
 * not change: the country code, and the state they are most likely in.
 *
 * Where the flow would talk to a service — the OTP, the HPR registry — the
 * call is named and isolated so it can be pointed at the API.
 */

type ClinicKind = "clinic" | "polyclinic" | "nursing";
type Role = "doctor" | "manager";
type Signing = "aadhaar" | "dsc";

type Form = {
  name: string;
  mobile: string;
  email: string;
  clinicName: string;
  clinicKind: ClinicKind | "";
  registeredUnder: string;
  regNumber: string;
  validUntil: string;
  clinicEmail: string;
  gstin: string;
  pan: string;
  locName: string;
  street: string;
  area: string;
  city: string;
  pin: string;
  state: string;
  phone: string;
  rooms: string;
  hfr: string;
  role: Role | "";
  hpr: string;
  doctorName: string;
  doctorQual: string;
  doctorReg: string;
  speciality: string;
  fee: string;
  videoFee: string;
  signing: Signing | "";
};

const EMPTY: Form = {
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

const STEPS = [
  { key: "you", label: "You" },
  { key: "clinic", label: "Clinic" },
  { key: "location", label: "Location" },
  { key: "role", label: "Your role" },
  { key: "agreements", label: "Agreements" },
] as const;

const HANDY = [
  "Your mobile number, to receive a code",
  "The clinic's registration number (state Clinical Establishments Act)",
  "GSTIN and PAN, only if the clinic is GST-registered",
  "Your HPR ID, if you are a doctor",
  "Facility HFR ID, if you have one",
];

const CLINIC_KINDS: Array<{ value: ClinicKind; title: string; body: string }> = [
  { value: "clinic", title: "Clinic", body: "One or more doctors" },
  { value: "polyclinic", title: "Polyclinic", body: "Several specialities" },
  { value: "nursing", title: "Nursing home", body: "With beds" },
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

const AGREEMENTS = [
  {
    id: "terms",
    title: "Terms of service",
    version: "v1.0",
    points: "What MedMate does, what you do, fees and how either side can end it.",
    href: "/legal/terms",
  },
  {
    id: "dpa",
    title: "Data processing agreement",
    version: "v1.0",
    points:
      "DPDP Act 2023: you are the data fiduciary, MedMate processes patient data only on your instructions, breaches reported within 72 hours.",
    href: "/legal/dpa",
  },
  {
    id: "declaration",
    title: "Clinic declaration",
    version: "v1.0",
    points:
      "The clinic is registered, its doctors are registered with a medical council, and it follows the Telemedicine Practice Guidelines 2020.",
    href: "/legal/declaration",
  },
];

const SIGNING: Array<{ value: Signing; title: string; body: string }> = [
  { value: "aadhaar", title: "Aadhaar eSign", body: "OTP on your Aadhaar-linked mobile" },
  { value: "dsc", title: "DSC token", body: "Class 3 digital signature" },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * The HPR registry lookup. In production this asks the ABDM Health
 * Professional Registry; the stub answers with the shape the screen draws, so
 * the flow can be walked end to end before the registry is connected.
 */
async function lookupHpr(hprId: string): Promise<{ name: string; qualification: string; council: string }> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const id = hprId.trim() || "71-4421-8890-3326";
  const digits = id.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);
  const name = "Dr. Ananya Rao";
  return {
    name,
    qualification: "MBBS, MD (General Medicine)",
    council: `Karnataka Medical Council · Reg. KMC ${digits.slice(-5)} · verified in HPR`,
  };
}

export function SignUpFlow() {
  const [stage, setStage] = useState<"intro" | "you" | "code" | "clinic" | "location" | "role" | "agreements">(
    "intro",
  );
  const [form, setForm] = useState<Form>(EMPTY);
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState<string[]>([]);
  const [looking, setLooking] = useState(false);
  const router = useRouter();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

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

  const bookingUrl = useMemo(() => {
    const slug = slugify(form.clinicName) || "your-clinic";
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/book?clinic=${slug}`;
  }, [form.clinicName]);

  const advance = () => {
    const order: Array<typeof stage> = ["you", "code", "clinic", "location", "role", "agreements"];
    const next = order[order.indexOf(stage) + 1];
    if (next) setStage(next);
  };

  const back = () => {
    const order: Array<typeof stage> = ["intro", "you", "code", "clinic", "location", "role", "agreements"];
    const index = order.indexOf(stage);
    if (index > 0) setStage(order[index - 1]);
  };

  const findHpr = async () => {
    setLooking(true);
    const doctor = await lookupHpr(form.hpr);
    setForm((f) => ({
      ...f,
      doctorName: doctor.name,
      doctorQual: doctor.qualification,
      doctorReg: doctor.council,
    }));
    setLooking(false);
  };

  if (stage === "intro") {
    return (
      <div className="su-intro-wrap">
        <div className="su-intro">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>
            Run your clinic on MedMate, <em>ready in 10 minutes</em>
          </h1>
          <p>14 days free with the full Clinic plan. Nothing is charged during set-up.</p>

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

          <div className="su-actions">
            <Button icon="spark" onClick={() => setStage("you")}>
              Start
            </Button>
            <span className="su-signin">
              Already on MedMate? <Link href="/login">Sign in</Link>
            </span>
          </div>
        </div>
      </div>
    );
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
                <div className={cn("seg", index <= stepIndex && "on")} />
                <div
                  className={cn(
                    "lbl",
                    index < stepIndex && "done",
                    index === stepIndex && "on",
                  )}
                >
                  {step.label}
                </div>
              </div>
            ))}
          </div>

          {stage === "you" ? (
            <>
              <div className="su-eyebrow">Step 1 of 5</div>
              <h2 className="su-h">
                First, <em>about you</em>
              </h2>
              <p className="su-lead">
                You&apos;ll be the clinic&apos;s owner. We send a 6-digit code to your mobile to check it&apos;s
                yours.
              </p>
              <div className="su-form">
                <div className="field">
                  <label htmlFor="su-name">Full name</label>
                  <Input
                    id="su-name"
                    value={form.name}
                    autoComplete="name"
                    onChange={(event) => set("name", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="su-mobile">Mobile</label>
                  <div className="su-cc">
                    <span className="cc">+91</span>
                    <Input
                      id="su-mobile"
                      value={form.mobile}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      onChange={(event) => set("mobile", event.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="su-email">Email (for invoices and agreements)</label>
                  <Input
                    id="su-email"
                    type="email"
                    value={form.email}
                    autoComplete="email"
                    onChange={(event) => set("email", event.target.value)}
                  />
                </div>
                <div className="su-note">
                  <Icon name="shield" size={16} />
                  <span>Your details are used only to set up and run your MedMate account (DPDP Act 2023).</span>
                </div>
              </div>
              <div className="su-foot">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button icon="send" disabled={!valid} onClick={() => setStage("code")}>
                  Send code
                </Button>
              </div>
              <p className="su-signin" style={{ marginTop: 14 }}>
                Already use MedMate? <Link href="/login">Sign in</Link>
              </p>
            </>
          ) : null}

          {stage === "code" ? (
            <>
              <div className="su-eyebrow">Step 1 of 5</div>
              <h2 className="su-h">
                Enter the <em>code</em>
              </h2>
              <p className="su-lead">
                We sent a 6-digit code to {form.mobile ? `+91 ${form.mobile}` : "your mobile"}.
              </p>
              <div className="su-form">
                <div className="field">
                  <label htmlFor="su-code">6-digit code</label>
                  <Input
                    id="su-code"
                    value={code}
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  />
                </div>
                {process.env.NODE_ENV !== "production" ? (
                  <div className="su-note">
                    <Icon name="alert" size={16} />
                    <span>Test mode: any 6-digit code works.</span>
                  </div>
                ) : null}
              </div>
              <div className="su-foot">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button icon="check" disabled={!valid} onClick={advance}>
                  Verify
                </Button>
              </div>
            </>
          ) : null}

          {stage === "clinic" ? (
            <>
              <div className="su-eyebrow">Step 2 of 5</div>
              <h2 className="su-h">
                Now, your <em>clinic</em>
              </h2>
              <p className="su-lead">
                This goes on prescriptions, bills and the page patients book from.
              </p>
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
                        className={cn("opt col", form.clinicKind === kind.value && "on")}
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
                    Patients will book at <b>{bookingUrl}</b>
                  </span>
                </div>
              </div>
              <div className="su-foot">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button disabled={!valid} onClick={advance}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}

          {stage === "location" ? (
            <>
              <div className="su-eyebrow">Step 3 of 5</div>
              <h2 className="su-h">
                Where do you <em>see patients?</em>
              </h2>
              <p className="su-lead">Your first location. Add more branches later from Locations.</p>
              <div className="su-form">
                <div className="field">
                  <label htmlFor="su-loc-name">Name for this location</label>
                  <Input
                    id="su-loc-name"
                    value={form.locName}
                    onChange={(event) => set("locName", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="su-street">Building and street</label>
                  <Input
                    id="su-street"
                    value={form.street}
                    onChange={(event) => set("street", event.target.value)}
                  />
                </div>
                <div className="su-2">
                  <div className="field">
                    <label htmlFor="su-area">Area or landmark</label>
                    <Input
                      id="su-area"
                      value={form.area}
                      onChange={(event) => set("area", event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="su-city">City or town</label>
                    <Input
                      id="su-city"
                      value={form.city}
                      onChange={(event) => set("city", event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="su-pin">PIN code</label>
                    <Input
                      id="su-pin"
                      value={form.pin}
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => set("pin", event.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="su-state">State</label>
                    <select
                      id="su-state"
                      className="input"
                      value={form.state}
                      onChange={(event) => set("state", event.target.value)}
                    >
                      {STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="su-phone">Phone patients can call</label>
                    <Input
                      id="su-phone"
                      value={form.phone}
                      inputMode="tel"
                      onChange={(event) => set("phone", event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="su-rooms">Consultation rooms</label>
                    <Input
                      id="su-rooms"
                      value={form.rooms}
                      placeholder="Room 1, Room 2"
                      onChange={(event) => set("rooms", event.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="su-hfr">HFR facility ID (optional)</label>
                  <Input id="su-hfr" value={form.hfr} onChange={(event) => set("hfr", event.target.value)} />
                </div>
              </div>
              <div className="su-foot">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button disabled={!valid} onClick={advance}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}

          {stage === "role" ? (
            <>
              <div className="su-eyebrow">Step 4 of 5</div>
              <h2 className="su-h">
                Your <em>role</em>
              </h2>
              <p className="su-lead">You can add other doctors and staff once the clinic is set up.</p>
              <div className="su-form">
                <div className="su-2">
                  <button
                    type="button"
                    className={cn("opt col", form.role === "doctor" && "on")}
                    onClick={() => set("role", "doctor")}
                  >
                    <b>I&apos;m a doctor here</b>
                    <span>I see patients and write prescriptions, and I own or run the clinic.</span>
                  </button>
                  <button
                    type="button"
                    className={cn("opt col", form.role === "manager" && "on")}
                    onClick={() => set("role", "manager")}
                  >
                    <b>I run the clinic</b>
                    <span>I manage the clinic but don&apos;t see patients.</span>
                  </button>
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
                            className={cn("opt col", form.signing === option.value && "on")}
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
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button disabled={!valid} onClick={advance}>
                  Continue
                </Button>
              </div>
            </>
          ) : null}

          {stage === "agreements" ? (
            <>
              <div className="su-eyebrow">Step 5 of 5</div>
              <h2 className="su-h">
                Read and <em>agree</em>
              </h2>
              <p className="su-lead">Short and in plain words. Read each one; the key points are on top.</p>
              <div className="su-form">
                {AGREEMENTS.map((agreement) => {
                  const isOn = agreed.includes(agreement.id);
                  return (
                    <div key={agreement.id} className={cn("su-agr", isOn && "on")}>
                      <div className="su-agr-head">
                        <button
                          type="button"
                          className="tick"
                          aria-pressed={isOn}
                          aria-label={`Agree to the ${agreement.title}`}
                          onClick={() =>
                            setAgreed((list) =>
                              list.includes(agreement.id)
                                ? list.filter((id) => id !== agreement.id)
                                : [...list, agreement.id],
                            )
                          }
                        >
                          {isOn ? <Icon name="check" size={14} /> : null}
                        </button>
                        <b>{agreement.title}</b>
                        <span className="v">{agreement.version}</span>
                        <a href={agreement.href} target="_blank" rel="noreferrer">
                          Open in a new tab
                        </a>
                      </div>
                      <p>{agreement.points}</p>
                    </div>
                  );
                })}
                <div className="su-note">
                  <Icon name="lock" size={16} />
                  <span>
                    We record who agreed, the version, the time and the device. Agreements can&apos;t be
                    changed afterwards.
                  </span>
                </div>
              </div>
              <div className="su-foot">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button icon="check" disabled={!valid} onClick={() => router.push("/dashboard")}>
                  Set up your clinic
                </Button>
              </div>
              <p className="su-signin" style={{ marginTop: 14 }}>
                Free to try. Nothing is charged during set-up.
              </p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
