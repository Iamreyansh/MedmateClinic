"use client";

import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { cancelBooking, fetchLiveToken, fetchPublicBooking } from "@/features/patient-web/api/patientWeb";
import { rebookVisit } from "@/mobile/api";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAction, useRemote } from "@/mobile/hooks";
import { MobileCard, MobileError, MobileLoading } from "@/mobile/components";
import { clockTime } from "@/mobile/time";
import { PhoneTabBar } from "@/mobile/appShell";

/**
 * A patient's own booking, on their phone.
 *
 * The visit they have, and the two things they may do about it: call it
 * off, or move it to another time. The free times are the ones the service
 * sent — they are never worked out on the phone.
 */
export function MobileManageScreen() {
  const { key = "" } = useParams();
  const [params] = useSearchParams();
  const slug = params.get("clinic") ?? "";
  const action = useAction();

  const load = useCallback(() => fetchLiveToken(key), [key]);
  const { status, data, error, reload, unreachable, code } = useRemote(load, key);

  const [cancelled, setCancelled] = useState(false);
  const [moving, setMoving] = useState(false);
  const [chosen, setChosen] = useState("");

  const slots = useRemote(
    useCallback(
      () =>
        slug
          ? fetchPublicBooking(slug)
          : Promise.reject(new Error("Open the clinic's own booking link to move your visit.")),
      [slug],
    ),
    slug,
  );

  const cancel = async () => {
    const done = await action.run(() => cancelBooking(key));
    if (done) setCancelled(true);
  };

  const move = async () => {
    const slot = slots.data?.slots.find((entry) => entry.startsAt === chosen);
    if (!slot) return;
    const done = await action.run(() =>
      rebookVisit(key, { date: slots.data?.day ?? "", slot: clockTime(slot.startsAt) }),
    );
    if (done) {
      setMoving(false);
      setChosen("");
      reload();
    }
  };

  if (code === 404) {
    return (
      <div className="mob-phone">
        <header className="mob-head pub">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>Your booking</h1>
          <p>This link is no longer open</p>
        </header>
        <div className="mob-body">
          <MobileCard>
            <span className="kiosk-ic warn">
              <Icon name="alert" size={26} />
            </span>
            <b style={{ display: "block", textAlign: "center", marginTop: 10 }}>
              This link is not valid any more
            </b>
            <p className="t-cap" style={{ textAlign: "center", marginTop: 6 }}>
              Ask the clinic for a new link, and your booking will be on it.
            </p>
          </MobileCard>
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
        <h1>Your booking</h1>
        <p>Check the visit, or call it off</p>
      </header>

      <div className="mob-body">
        {status === "loading" && !data ? <MobileLoading title="Loading your booking…" /> : null}
        {status === "error" && error ? (
          <MobileError message={error} onRetry={reload} unreachable={unreachable} />
        ) : null}

        {cancelled ? (
          <MobileCard>
            <span className="kiosk-ic ok">
              <Icon name="check" size={26} />
            </span>
            <b style={{ display: "block", textAlign: "center", marginTop: 10 }}>
              The booking is called off
            </b>
            <p className="t-cap" style={{ textAlign: "center", marginTop: 6 }}>
              You can book another visit whenever you like.
            </p>
            <div className="mob-foot">
              <Link className="btn block" to="/m/book">
                Book another visit
              </Link>
            </div>
          </MobileCard>
        ) : null}

        {data && !cancelled ? (
          <>
            <MobileCard title="The visit">
              <div className="mob-kv">
                <span>Your number</span>
                <b>{data.token}</b>
              </div>
              <div className="mob-kv">
                <span>Doctor</span>
                <b>{data.doctor}</b>
              </div>
              <div className="mob-kv">
                <span>Room</span>
                <b>{data.room || "Not assigned yet"}</b>
              </div>
              <div className="mob-kv">
                <span>Position</span>
                <b>{data.position}</b>
              </div>
              <div className="mob-kv">
                <span>To pay</span>
                <b>₹{data.due}</b>
              </div>
            </MobileCard>

            {action.error ? (
              <MobileError message={action.error} onRetry={() => action.clear()} />
            ) : null}

            <div className="mob-foot">
              <Button
                variant="danger"
                disabled={action.busy}
                onClick={() => void cancel()}
              >
                {action.busy ? "Cancelling…" : "Call this booking off"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setMoving((open) => !open)}
                aria-expanded={moving}
              >
                {moving ? "Close" : "Move this visit"}
              </Button>
            </div>

            {moving ? (
              <MobileCard title="Move it to another time">
                {!slug ? (
                  <p className="t-cap">
                    Open the clinic&apos;s own booking link to see the times that are free, and your
                    visit can be moved from there.
                  </p>
                ) : slots.status === "loading" ? (
                  <MobileLoading title="Loading the free times…" />
                ) : slots.status === "error" && slots.error ? (
                  <MobileError message={slots.error} onRetry={slots.reload} unreachable={slots.unreachable} />
                ) : slots.data && slots.data.slots.length === 0 ? (
                  <p className="t-cap">There is nothing free to move to on this day.</p>
                ) : slots.data ? (
                  <>
                    <p className="t-cap" style={{ marginBottom: 10 }}>{slots.data.day}</p>
                    <div className="mob-slots">
                      {slots.data.slots.map((slot) => (
                        <button
                          key={slot.startsAt}
                          type="button"
                          className={`mob-slot${chosen === slot.startsAt ? " on" : ""}`}
                          disabled={!slot.free}
                          aria-pressed={chosen === slot.startsAt}
                          onClick={() => setChosen(slot.startsAt)}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                    <div className="mob-foot">
                      <Button icon="check" disabled={!chosen || action.busy} onClick={() => void move()}>
                        {action.busy ? "Moving…" : "Move my visit"}
                      </Button>
                    </div>
                  </>
                ) : null}
              </MobileCard>
            ) : null}
          </>
        ) : null}
      </div>
      <PhoneTabBar linkKey={key} activeHref="/m/manage" />
    </div>
  );
}
