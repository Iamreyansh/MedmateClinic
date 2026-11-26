"use client";

import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { MobileCard, MobileTitle } from "@/mobile/components";
import { PhoneTabBar } from "@/mobile/appShell";

/**
 * A patient app screen that needs the link key and has not been given one.
 *
 * The link key lives in the URL. When a patient arrives without it — by
 * typing the address, or by following a link the clinic sent to somebody
 * else — this says what to do instead of showing an empty screen.
 */
export function MobileLinkNeededScreen({ what }: { what: "visit" | "symptoms" }) {
  return (
    <div className="mob-phone">
      <header className="mob-head pub">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>{what === "visit" ? "Your visit" : "Before your visit"}</h1>
        <p>Open the link the clinic sent you</p>
      </header>

      <div className="mob-body">
        <MobileCard>
          <span className="kiosk-ic warn">
            <Icon name="alert" size={26} />
          </span>
          <b style={{ display: "block", textAlign: "center", marginTop: 10 }}>
            There is nothing to show here yet
          </b>
          <p className="t-cap" style={{ textAlign: "center", marginTop: 6 }}>
            Open the link the clinic sent you — by SMS or on WhatsApp — and
            {what === "visit" ? " your turn" : " the form"} will be waiting on it.
          </p>
        </MobileCard>

        <MobileTitle title="What you can do" line="Without the clinic's link." />

        <div className="mob-foot">
          <Link className="btn block" to="/m/book">
            Book a visit
          </Link>
          <Link className="btn block sec" to="/m/verify">
            Check a document
          </Link>
        </div>
      </div>
      <PhoneTabBar activeHref={what === "visit" ? "/m/visit" : "/m/symptoms"} />
    </div>
  );
}
