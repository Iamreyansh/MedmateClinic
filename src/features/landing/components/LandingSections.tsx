import { Icon } from "@/components/ui/Icon";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { features, rules, standards, steps } from "@/features/landing/components/content";

/** The standards strip under the hero. */
export function LandingStandards() {
  return (
    <section className="lp-strip-wrap" aria-label="Standards">
      <div className="lp-in">
        <div className="lp-strip">
          {standards.map((standard) => (
            <span key={standard}>
              <Icon name="check" size={14} />
              {standard}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** How a visit flows, in five steps. */
export function LandingSteps() {
  return (
    <section className="lp-sec" id="flow">
      <div className="lp-in">
        <div className="lp-head">
          <span className="lp-eyebrow">How it works</span>
          <h2>
            From the door to the follow-up, <em>nothing falls through.</em>
          </h2>
        </div>
        <ol className="lp-flow fig">
          {steps.map((step) => (
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
  );
}

/** The twelve things a clinic runs on. */
export function LandingFeatures() {
  return (
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
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.body}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Compliance, as a band of five rules. */
export function LandingRules() {
  return (
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
          {rules.map((rule) => (
            <div className="lp-band-card" key={rule.title}>
              <Icon name="shield" size={22} />
              <b>{rule.title}</b>
              <span>{rule.body}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
