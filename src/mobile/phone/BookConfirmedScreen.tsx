"use client";

import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { BookResult } from "@/features/patient-web/types";
import { Icon } from "@/components/ui/Icon";
import { MobileCard, MobileTitle } from "@/mobile/components";
import { clockTime } from "@/mobile/time";

/**
 * The booking is made.
 *
 * The patient sees their number — the slip the desk reads out — the doctor
 * and the time. The link key is in the URL and is never drawn.
 */
export function MobileBookConfirmedScreen() {
  const [params] = useSearchParams();
  const location = useLocation();
  const linkKey = params.get("key") ?? "";
  const booking = (location.state as { booking?: BookResult } | null)?.booking ?? null;

  return (
    <div className="mob-phone">
      <header className="mob-head pub">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>You are booked</h1>
        <p>Keep this number</p>
      </header>

      <div className="mob-body">
        <MobileCard>
          <div className="mob-card-h">
            <b>Your number at the clinic</b>
          </div>
          <div className="kiosk-token" style={{ fontSize: 56 }}>
            {booking?.queueToken ?? "—"}
          </div>
          <p className="t-cap" style={{ textAlign: "center" }}>
            This is the number the desk calls out. Keep it with you.
          </p>
        </MobileCard>

        {booking ? (
          <MobileCard title="The visit">
            <div className="mob-kv">
              <span>Doctor</span>
              <b>{booking.doctor}</b>
            </div>
            <div className="mob-kv">
              <span>Time</span>
              <b>{clockTime(booking.startsAt)}</b>
            </div>
            <div className="mob-kv">
              <span>Clinic</span>
              <b>{booking.clinic}</b>
            </div>
          </MobileCard>
        ) : (
          <MobileTitle
            title="Your booking is made"
            line="Open the link the clinic sent you to see the visit again."
          />
        )}

        <div className="mob-foot">
          {linkKey ? (
            <>
              <Link className="btn block" to={`/m/visit/${encodeURIComponent(linkKey)}`}>
                Track my turn
              </Link>
              <Link className="btn block sec" to={`/m/symptoms/${encodeURIComponent(linkKey)}`}>
                Fill in my symptoms
              </Link>
            </>
          ) : null}
        </div>

        <div className="note mint">
          <Icon name="check" size={18} />
          <div>
            The clinic has your booking. If anything changes, call the clinic and they will move it
            for you.
          </div>
        </div>
      </div>
    </div>
  );
}
