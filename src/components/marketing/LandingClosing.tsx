import { Icon } from "@/components/ui/Icon";
import { Pricing } from "@/components/marketing/Pricing";

/** The pricing section. */
export function LandingPricing() {
  return (
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
  );
}

/** The closing call, and the footer. */
export function LandingCta() {
  return (
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
  );
}

export function LandingFooter() {
  return (
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
  );
}
