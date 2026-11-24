import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";

/** The landing page's header: the wordmark, the section links, sign in and trial. */
export function LandingNav() {
  return (
    <header className="lp-nav">
      <div className="lp-in">
        <Link aria-label="MedMate Doctor home" to="/">
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
  );
}

/** The hero: the promise on the left, the product mock on the right. */
export function LandingHero() {
  return (
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
  );
}
