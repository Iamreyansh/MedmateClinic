"use client";

import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  chooseKioskDoctor,
  fetchKiosk,
  payKiosk,
  resetKiosk,
  sendKioskCode,
  setKioskPatient,
  verifyKioskCode,
} from "@/features/kiosk/api/kiosk";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { useAction, useRemote } from "@/mobile/hooks";
import { MobileCard, MobileError, MobileLoading } from "@/mobile/components";

/**
 * The check-in on a phone.
 *
 * The kiosk's own conversation — welcome, mobile, code, who you are, who
 * you want to see, pay, and the slip — on a screen a patient holds in their
 * hand. The session lives on the service, so a patient who comes back to
 * the page picks up where they were.
 */
export function MobileCheckInScreen() {
  const [started, setStarted] = useState(false);
  const load = useCallback(() => fetchKiosk(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);
  const action = useAction();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("F");

  const step = data?.step ?? "mobile";

  const startOver = async () => {
    const done = await action.run(() => resetKiosk());
    if (done) {
      setStarted(false);
      setPhone("");
      setCode("");
      setName("");
      setAge("");
      reload();
    }
  };

  return (
    <div className="mob-phone">
      <header className="mob-head pub">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Check in</h1>
        <p>At the clinic, on your phone</p>
      </header>

      <div className="mob-body">
        {status === "loading" && !data ? <MobileLoading title="Opening the check-in…" /> : null}
        {status === "error" && error ? (
          <MobileError message={error} onRetry={reload} unreachable={unreachable} />
        ) : null}

        {action.error ? (
          <div className="note red" role="alert">
            <Icon name="alert" size={18} />
            <div>{action.error}</div>
          </div>
        ) : null}

        {data && !started ? (
          <>
            <MobileCard title="Welcome">
              <p className="t-cap">
                Confirm your mobile, say who you are and who you would like to see, and we will
                give you a number to wait for.
              </p>
              <div className="mob-foot">
                <Button icon="chev" onClick={() => setStarted(true)}>
                  Start the check-in
                </Button>
              </div>
            </MobileCard>
            {data.open === false ? (
              <div className="note gold">
                <Icon name="alert" size={18} />
                <div>
                  The desk has the check-in closed on this device. Ask at the desk to open it.
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {data && started && step === "mobile" ? (
          <MobileCard title="Your mobile number">
            <p className="t-cap">We send a code to it, so we know it is you.</p>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="ci-phone">Mobile number</label>
              <Input
                id="ci-phone"
                value={phone}
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                placeholder="10-digit mobile"
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="mob-foot">
              <Button
                icon="send"
                disabled={phone.length !== 10 || action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const next = await sendKioskCode({ phone });
                    setPhone("");
                    reload();
                    return next;
                  })
                }
              >
                {action.busy ? "Sending…" : "Send the code"}
              </Button>
            </div>
          </MobileCard>
        ) : null}

        {data && started && step === "code" ? (
          <MobileCard title="The code">
            <p className="t-cap">Type the 6-digit code we sent to {data.phone}.</p>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="ci-code">6-digit code</label>
              <Input
                id="ci-code"
                value={code}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="mob-foot">
              <Button
                icon="check"
                disabled={code.length !== 6 || action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const next = await verifyKioskCode({ phone: data.phone ?? phone, code });
                    setCode("");
                    reload();
                    return next;
                  })
                }
              >
                {action.busy ? "Checking…" : "Check the code"}
              </Button>
            </div>
          </MobileCard>
        ) : null}

        {data && started && step === "patient" ? (
          <MobileCard title="Who are you">
            <div className="field">
              <label htmlFor="ci-name">Your name</label>
              <Input
                id="ci-name"
                value={name}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="mob-2" style={{ marginTop: 12 }}>
              <div className="field">
                <label htmlFor="ci-age">Age</label>
                <Input
                  id="ci-age"
                  value={age}
                  inputMode="numeric"
                  maxLength={3}
                  onChange={(event) => setAge(event.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="field">
                <label htmlFor="ci-sex">Sex</label>
                <Input
                  id="ci-sex"
                  value={sex}
                  maxLength={1}
                  onChange={(event) => setSex(event.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="mob-foot">
              <Button
                icon="chev"
                disabled={name.trim().length < 2 || !age || action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const next = await setKioskPatient({ name, age, sex });
                    reload();
                    return next;
                  })
                }
              >
                Next
              </Button>
            </div>
          </MobileCard>
        ) : null}

        {data && started && step === "doctor" ? (
          <MobileCard title="Who would you like to see">
            {data.booking ? (
              <div className="note mint">
                <Icon name="cal" size={18} />
                <div>
                  You have a booking with {data.booking.doctorName}.
                </div>
              </div>
            ) : null}
            <div className="mob-section" style={{ marginTop: 10 }}>
              {data.doctors.map((doctor) => (
                <button
                  key={doctor.id}
                  type="button"
                  className="mob-row"
                  onClick={() =>
                    void action.run(async () => {
                      const next = await chooseKioskDoctor({ doctorId: doctor.id });
                      reload();
                      return next;
                    })
                  }
                >
                  <span className="txt">
                    <b>{doctor.name}</b>
                    <small>
                      {doctor.speciality} · {doctor.room}
                    </small>
                  </span>
                  <span className="end">
                    <span className="badge plain">{doctor.waiting} waiting</span>
                  </span>
                </button>
              ))}
            </div>
          </MobileCard>
        ) : null}

        {data && started && step === "pay" ? (
          <MobileCard title="Paying at the desk">
            {data.bill ? (
              <>
                <div className="mob-section">
                  {data.bill.lines.map((line) => (
                    <div key={line.name} className="mob-row">
                      <span className="txt">
                        <b>{line.name}</b>
                      </span>
                      <span className="end">₹{line.amount}</span>
                    </div>
                  ))}
                </div>
                <div className="mob-kv" style={{ marginTop: 10 }}>
                  <span>To pay</span>
                  <b>₹{data.bill.total}</b>
                </div>
              </>
            ) : (
              <p className="t-cap">There is nothing to pay right now.</p>
            )}
            <div className="mob-foot">
              <Button
                icon="check"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const next = await payKiosk({ method: "counter" });
                    reload();
                    return next;
                  })
                }
              >
                {action.busy ? "Paying…" : "I will pay at the desk"}
              </Button>
            </div>
          </MobileCard>
        ) : null}

        {data && started && step === "token" ? (
          <MobileCard title="You are checked in">
            <div className="kiosk-token" style={{ fontSize: 56 }}>
              {data.token ?? "—"}
            </div>
            <p className="t-cap" style={{ textAlign: "center" }}>
              {data.waiting > 0
                ? `${data.waiting} ${data.waiting === 1 ? "person is" : "people are"} ahead of you.`
                : "You are next. Please wait to be called."}
            </p>
            {data.doctor ? (
              <p className="t-cap" style={{ textAlign: "center" }}>
                {data.doctor.name} · {data.doctor.room}
              </p>
            ) : null}
            <div className="mob-foot">
              {data.token ? (
                <Link className="btn block" to={`/m/visit/${data.token}`}>
                  Track my turn
                </Link>
              ) : null}
              <Button variant="ghost" onClick={() => void startOver()}>
                Start again
              </Button>
            </div>
          </MobileCard>
        ) : null}
      </div>
    </div>
  );
}
