"use client";

import { Link } from "react-router-dom";
import { features, rules, standards, steps } from "@/features/landing/components/content";
import { Icon } from "@/components/ui/Icon";
import { MobileCard, MobileTitle } from "@/mobile/components";

/**
 * The landing page on a phone.
 *
 * The same words the desktop landing page uses — the steps of a visit, what
 * the product does, and the rules it keeps — laid out for one column.
 */
export function MobileLandingScreen() {
  return (
    <div className="mob-phone">
      <header className="mob-head pub">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Consult, prescribe and sign, in one place.</h1>
        <p>For doctors running their own clinic.</p>
      </header>

      <div className="mob-body">
        <div className="mob-foot">
          <Link className="btn block" to="/m/signup">
            Set up your clinic
          </Link>
          <Link className="btn block sec" to="/login">
            Sign in
          </Link>
        </div>

        <MobileCard title="How a visit goes">
          <div className="mob-section">
            {steps.map((step) => (
              <div key={step.n} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="ico">
                  <Icon name={step.icon} size={18} />
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>
                    {step.n} · {step.title}
                  </b>
                  <small style={{ whiteSpace: "normal" }}>{step.body}</small>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobileCard title="What it does">
          <div className="mob-section">
            {features.map((feature) => (
              <div key={feature.title} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="ico">
                  <Icon name={feature.icon} size={18} />
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{feature.title}</b>
                  <small style={{ whiteSpace: "normal" }}>{feature.body}</small>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobileCard title="The rules it keeps">
          <div className="mob-section">
            {rules.map((rule) => (
              <div key={rule.title} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{rule.title}</b>
                  <small style={{ whiteSpace: "normal" }}>{rule.body}</small>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobileTitle title="Standards" line={standards.join(" · ")} />

        <div className="mob-foot">
          <Link className="btn block" to="/m/signup">
            Set up your clinic
          </Link>
          <p className="t-cap" style={{ textAlign: "center" }}>
            Already use MedMate? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
