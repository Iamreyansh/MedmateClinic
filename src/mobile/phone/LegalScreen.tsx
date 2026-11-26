"use client";

import { Link } from "react-router-dom";
import { AGREEMENTS } from "@/features/onboarding/types";
import { Icon } from "@/components/ui/Icon";
import { MobileCard, MobileTitle } from "@/mobile/components";
import { PhoneTabBar } from "@/mobile/appShell";

/**
 * The legal documents, on a phone.
 *
 * The three a patient may be asked to agree to — the terms, the data
 * processing agreement and the clinic's declaration.
 */
export function MobileLegalScreen() {
  return (
    <div className="mob-phone">
      <header className="mob-head pub">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Legal</h1>
        <p>The documents behind the product</p>
      </header>

      <div className="mob-body">
        <MobileTitle
          title="The documents"
          line="Plain words, so you know what you are agreeing to."
        />

        {AGREEMENTS.map((agreement) => (
          <MobileCard key={agreement.id} title={agreement.title}>
            <p className="t-cap">{agreement.version}</p>
            <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.5 }}>{agreement.points}</p>
            <div className="mob-foot">
              <span className="badge mint">
                <Icon name="cert" size={12} />
                Read at {agreement.href}
              </span>
            </div>
          </MobileCard>
        ))}

        <div className="note blue">
          <Icon name="shield" size={18} />
          <div>
            Your patient data is handled under the DPDP Act 2023. The clinic is the data
            fiduciary; MedMate processes it only on the clinic&apos;s instructions.
          </div>
        </div>

        <div className="mob-foot">
          <Link className="btn block sec" to="/m/verify">
            Check a prescription
          </Link>
        </div>
      </div>
      <PhoneTabBar activeHref="/m/legal" />
    </div>
  );
}
