import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Pricing } from "@/components/landing/Pricing";

/**
 * The landing page.
 *
 * The Figma file's design of record. Every class comes from the product's own
 * stylesheet; the handful of rules the file and the deployed MVP disagree on
 * live in `src/styles/app.css`, under "The landing page".
 */

const STEPS: Array<{ n: string; icon: IconName; title: string; body: string }> = [
  {
    n: "01",
    icon: "kiosk",
    title: "Check-in",
    body: "Patients confirm their mobile at the kiosk or desk and get a token by SMS.",
  },
  {
    n: "02",
    icon: "nurse",
    title: "Vitals",
    body: "BP, temperature, SpO₂ and weight; anything worrying is flagged and moved up.",
  },
  {
    n: "03",
    icon: "stetho",
    title: "Consult",
    body: "The patient's words, vitals and history, with suggestions and safety checks.",
  },
  {
    n: "04",
    icon: "print",
    title: "Prescription & bill",
    body: "A signed e-prescription to the patient, their ABHA and their pharmacy.",
  },
  {
    n: "05",
    icon: "cal",
    title: "Follow-up",
    body: "Booked before they leave, with reminders a day and an hour before.",
  },
];

const FEATURES: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "rx",
    title: "Prescriptions doctors trust",
    body: "Examination, several diagnoses with ICD-10 codes, suggestions from the symptoms, and checks for interactions, duplicates, pregnancy, age and doses.",
  },
  {
    icon: "users",
    title: "Queue and kiosk",
    body: "Self check-in, live token page, call next patient, and priorities for the very unwell.",
  },
  {
    icon: "cal",
    title: "Appointments",
    body: "Doctor calendars, first available slot, an online booking page and reminders.",
  },
  {
    icon: "video",
    title: "Teleconsultation",
    body: "Video or phone consults with identity and consent recorded as the 2020 guidelines require.",
  },
  {
    icon: "rupee",
    title: "Billing and UPI",
    body: "GST-compliant bills with your prefix, UPI, card and cash, refunds and a day-close cash book.",
  },
  {
    icon: "lab",
    title: "Lab and diagnostics",
    body: "Tube labels, results with reference ranges, and critical alerts straight to the doctor.",
  },
  {
    icon: "pill",
    title: "Send to the pharmacy",
    body: "The patient chooses a pharmacy and the prescription goes to its dashboard, with status back.",
  },
  {
    icon: "folder",
    title: "Patient records",
    body: "One timeline of visits, readings, results and bills, with allergies on top.",
  },
  {
    icon: "chart",
    title: "Reports",
    body: "Money, patients, waiting times, no-shows and missed follow-ups, compared with before.",
  },
  {
    icon: "pin",
    title: "Many locations",
    body: "Each branch with its rooms and HFR ID; doctors placed where they work.",
  },
  {
    icon: "users",
    title: "Roles and activity log",
    body: "Each person sees only what they need; who did what is recorded and can't be edited.",
  },
  {
    icon: "send",
    title: "Messages patients understand",
    body: "Tokens, reminders and results in plain English, Kannada and Hindi.",
  },
];

const RULES: Array<{ title: string; body: string }> = [
  {
    title: "Telemedicine Practice Guidelines 2020",
    body: "Identity and consent on every online consult; restricted medicines blocked.",
  },
  {
    title: "DPDP Act 2023",
    body: "Data processing agreement at sign-up, role-based access, and a log of who opened which record.",
  },
  {
    title: "IMC Regulations 2002",
    body: "Registration number, generic names, and records kept as long as required.",
  },
  {
    title: "Drugs and Cosmetics Rules",
    body: "Controlled medicines stay on paper; the patient chooses their pharmacy.",
  },
  {
    title: "GST Rule 46",
    body: "Exempt healthcare and taxable services billed correctly, with your own invoice series.",
  },
];

const STANDARDS = [
  "ABDM ready",
  "FHIR R4",
  "Telemedicine Guidelines 2020",
  "DPDP Act 2023",
  "GST billing",
  "English · ಕನ್ನಡ · हिन्दी",
];

export default function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-in">
          <Link aria-label="MedMate Doctor home" href="/">
            <div className="lockup">
              <div className="wordmark" style={{ fontSize: 28 }}>
                Med<span className="m">Mate</span>
              </div>
            </div>
          </Link>
          <nav aria-label="Main">
            <a href="#flow">How it works</a>
            <a href="#features">Features</a>
            <a href="#rules">India&apos;s rules</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="lp-nav-cta">
            <a className="btn ghost sm" href="/login">
              Sign in
            </a>
            <a className="btn sm" href="/start">
              Start free trial
            </a>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-in lp-hero-in">
          <div className="lp-hero-copy">
            <span className="lp-pill">Clinic software for India</span>
            <h1>
              Run your whole clinic from <em>one screen.</em>
            </h1>
            <p>
              Check-in, vitals, consult, e-prescription, bill and follow-up, joined up. Built around how
              Indian clinics really work, and ready for ABDM.
            </p>
            <div className="lp-hero-cta">
              <a className="btn xl" href="/start">
                <Icon name="spark" size={18} />
                Start 14-day free trial
              </a>
              <a href="#pricing" className="btn sec xl">
                See pricing
              </a>
            </div>
            <p className="lp-fine">No card needed for the trial · Set up in about 10 minutes</p>
          </div>

          <div className="shot" aria-hidden="true">
            <div className="shot-h">
              <Icon name="stetho" size={20} />
              Doctor Console · Meera N, 29 F · W-04
            </div>
            <div className="shot-lbl">What the patient told us</div>
            <div className="shot-q">“Fever 3 days, throat pain, dry cough at night”</div>
            <div className="shot-lbl">On examination</div>
            <div className="shot-q">Febrile. ENT: throat congested.</div>
            <div className="shot-diag">J02.9 Acute pharyngitis</div>
            <div className="shot-med">
              <Icon name="pill" size={18} />
              <span>
                <b>Paracetamol 650 mg</b>
                1 tab · 1-0-0-1 · after food · 3 days
              </span>
            </div>
            <div className="shot-med">
              <Icon name="pill" size={18} />
              <span>
                <b>Chlorhexidine 0.2%</b>
                10 ml gargle · twice a day · 7 days
              </span>
            </div>
            <div className="shot-safe">
              <Icon name="shield" size={16} />
              Safety checks passed: interactions, duplicates, age, doses
            </div>
            <div className="shot-btn">
              <Icon name="check" size={16} />
              Sign &amp; send
            </div>
          </div>
        </div>
      </section>

      <section className="lp-strip-wrap" aria-label="Standards">
        <div className="lp-in">
          <div className="lp-strip">
            {STANDARDS.map((standard) => (
              <span key={standard}>
                <Icon name="check" size={14} />
                {standard}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec" id="flow">
        <div className="lp-in">
          <div className="lp-head">
            <span className="lp-eyebrow">How it works</span>
            <h2>
              From the door to the follow-up, <em>nothing falls through.</em>
            </h2>
          </div>
          <ol className="lp-flow fig">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="lp-flow-n">{step.n}</span>
                <Icon name={step.icon} size={22} />
                <b>{step.title}</b>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-sec alt" id="features">
        <div className="lp-in">
          <div className="lp-head">
            <span className="lp-eyebrow">What it does</span>
            <h2>
              Everything a clinic runs on, <em>in one place.</em>
            </h2>
            <p>Each part is built for the person who uses it: the front desk, the nurse, the doctor and the owner.</p>
          </div>
          <div className="lp-grid">
            {FEATURES.map((feature) => (
              <article className="lp-feat" key={feature.title}>
                <span>
                  <Icon name={feature.icon} size={20} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-band" id="rules">
        <div className="lp-in">
          <div className="lp-head">
            <span className="lp-eyebrow">Built for India&apos;s rules</span>
            <h2>
              Compliance is <em>part of the work.</em>
            </h2>
            <p>
              The checks happen as you work, so the clinic stays on the right side of the law without extra
              paperwork.
            </p>
          </div>
          <div className="lp-band-grid">
            {RULES.map((rule) => (
              <div className="lp-band-card" key={rule.title}>
                <Icon name="shield" size={22} />
                <b>{rule.title}</b>
                <span>{rule.body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec" id="pricing">
        <div className="lp-in">
          <div className="lp-head">
            <span className="lp-eyebrow">Pricing</span>
            <h2>
              Simple plans. <em>Start free for 14 days.</em>
            </h2>
            <p>Every new clinic gets the full Clinic plan during the trial. Prices are per clinic and exclude 18% GST.</p>
          </div>
          <div className="pz-wrap">
            <Pricing />
          </div>
        </div>
      </section>

      <section className="lp-cta fig">
        <div className="lp-in">
          <h2>See it with your own patients.</h2>
          <p>Set up your clinic in about 10 minutes. Free for 14 days.</p>
          <div className="lp-cta-btns">
            <a className="btn xl" href="/start">
              <Icon name="spark" size={18} />
              Start free trial
            </a>
            <a className="btn sec xl" href="#talk">
              Talk to us
            </a>
          </div>
        </div>
      </section>

      <footer className="lp-foot fig">
        <div className="lp-in">
          <div className="lockup">
            <div className="wordmark" style={{ fontSize: 22 }}>
              Med<span className="m">Mate</span>
            </div>
          </div>
          <nav aria-label="Legal">
            <a href="/legal/terms">Terms of service</a>
            <a href="/legal/dpa">Data processing agreement</a>
            <a href="/legal/declaration">Clinic declaration</a>
            <a href="/login">Sign in</a>
          </nav>
          <span className="t-cap">© 2026 MedMate · Made in Bengaluru</span>
        </div>
      </footer>
    </div>
  );
}
