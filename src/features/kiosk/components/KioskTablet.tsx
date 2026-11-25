import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  chooseKioskDoctor,
  payKiosk,
  resetKiosk,
  sendKioskCode,
  setKioskLanguage,
  setKioskPatient,
  takeKioskToken,
  verifyKioskCode,
} from "@/features/kiosk/api/kiosk";
import type { KioskLanguage, KioskSession } from "@/features/kiosk/types";

export type KioskTabletProps = {
  session: KioskSession;
  /** The session changed — the tablet draws the new step. */
  onChange: (session: KioskSession) => void;
};

/** The languages the kiosk speaks, and what it calls them. */
const LANGUAGES: Array<{ value: KioskLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "kn", label: "ಕನ್ನಡ" },
  { value: "hi", label: "हिन्दी" },
];

/** The steps of the check-in, in order. */
const STEPS = [
  { value: "mobile", label: "Mobile" },
  { value: "code", label: "Code" },
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "pay", label: "Pay" },
] as const;

/**
 * The QR the patient scans with their phone.
 *
 * The pattern is drawn from the kiosk's own link, so the same clinic always
 * shows the same code and a different clinic shows a different one.
 */
function qrPattern(seed: string) {
  const size = 21;
  const cells: boolean[][] = [];
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  for (let row = 0; row < size; row += 1) {
    const line: boolean[] = [];
    for (let column = 0; column < size; column += 1) {
      hash ^= hash << 13;
      hash ^= hash >>> 17;
      hash ^= hash << 5;
      line.push((hash >>> 3) % 2 === 0);
    }
    cells.push(line);
  }
  // the three finder squares every QR carries
  const finder = (top: number, left: number) => {
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const edge = row === 0 || row === 6 || column === 0 || column === 6;
        const middle = row >= 2 && row <= 4 && column >= 2 && column <= 4;
        cells[top + row][left + column] = edge || middle;
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  const modules: ReactElement[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!cells[row][column]) continue;
      modules.push(
        <rect
          key={`${row}-${column}`}
          x={column}
          y={row}
          width={1}
          height={1}
          fill="var(--forest)"
        />,
      );
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Scan this code with your phone">
      {modules}
    </svg>
  );
}

/**
 * The tablet.
 *
 * One question per screen, and a big touch target for the answer. The patient
 * confirms their mobile, says who they are and who they want to see, pays if
 * they need to, and gets a token.
 *
 * After 45 seconds of nothing the patient may have walked away, so the kiosk
 * asks and resets rather than holding someone else's details on the screen.
 */
export function KioskTablet({ session, onChange }: KioskTabletProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [method, setMethod] = useState("upi");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idle, setIdle] = useState(false);
  /** The patient has tapped to check in — before that, the kiosk waits. */
  const [started, setStarted] = useState(false);

  // The patient may have walked away. After 45 seconds the kiosk asks.
  useEffect(() => {
    if (session.step === "token") return;
    const timer = window.setTimeout(() => setIdle(true), 45000);
    return () => window.clearTimeout(timer);
  }, [session.step]);

  /** Every change is activity — the idle timer starts again. */
  const touch = () => setIdle(false);

  /** Start again: the welcome comes back and the session is cleared. */
  const startOver = () => {
    touch();
    setStarted(false);
    void run(() => resetKiosk());
  };

  const run = async (action: () => Promise<KioskSession>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const chooseLanguage = (language: KioskLanguage) => {
    touch();
    void run(() => setKioskLanguage(language));
  };

  /** The shared chrome: the clinic's name and the language switch. */
  const head = (
    <div className="kiosk-head">
      <div className="lockup">
        <div className="wordmark" style={{ fontSize: 24, color: "#fff" }}>
          Med<span className="m">Mate</span>
        </div>
      </div>
      <div className="kiosk-head-r">
        <span className="kiosk-clinic">MedMate Clinic Indiranagar</span>
        <div className="kiosk-lang" role="group" aria-label="Language">
          {LANGUAGES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className={cn(session.language === entry.value && "on")}
              onClick={() => chooseLanguage(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /** The strip that shows how far the patient has got. */
  const strip = useMemo(() => {
    const current = STEPS.findIndex((entry) => entry.value === session.step);
    return (
      <ol className="kiosk-steps">
        {STEPS.map((entry, index) => {
          const done = current > index || session.step === "token";
          const now = current === index;
          return (
            <li key={entry.value} className={cn(done && "done", now && "now")}>
              <span>{done ? "✓" : index + 1}</span>
              {entry.label}
            </li>
          );
        })}
      </ol>
    );
  }, [session.step]);

  const step = session.step;

  return (
    <div className="kiosk">
      {head}
      {strip}

      <div className="kiosk-body">
        {error ? (
          <div className="note red" style={{ marginBottom: 16 }}>
            <Icon name="alert" size={18} />
            <div>{error}</div>
          </div>
        ) : null}

        {idle ? (
          <div className="kiosk-card center kiosk-warn">
            <span className="kiosk-ic warn">
              <Icon name="alert" size={28} />
            </span>
            <h2>Are you still there?</h2>
            <p>Nothing has been entered for a while. We will start again.</p>
            <Button
              className="kiosk-go"
              onClick={() => {
                setIdle(false);
                startOver();
              }}
            >
              Start again
            </Button>
          </div>
        ) : null}

        {!idle && step === "mobile" && !started ? (
          <div className="kiosk-card">
            <div className="kiosk-home">
              <div>
                <div className="t-eyebrow">Self check-in</div>
                <h1>Welcome</h1>
                <p>
                  Check in for your appointment, or see a doctor today. It takes about a minute.
                </p>
                <Button
                  className="kiosk-go"
                  onClick={() => {
                    touch();
                    setStarted(true);
                  }}
                >
                  Tap to check in
                  <Icon name="chev" size={18} />
                </Button>
              </div>

              <div className="kiosk-qr">
                <div className="kiosk-qr-img">
                  {qrPattern(session.qr ?? "medmate-clinic")}
                </div>
                <b>Or use your phone</b>
                <small>Scan with your camera. No app needed.</small>
              </div>

              <div className="kiosk-docs-wrap">
                <div className="t-eyebrow">Doctors today</div>
                <div className="kiosk-docs">
                  {session.doctors.map((doctor) => (
                    <div key={doctor.id}>
                      <b>{doctor.name}</b>
                      <span>
                        {doctor.speciality} · {doctor.room}
                      </span>
                      <em>{doctor.waiting ? `${doctor.waiting} waiting` : "No wait"}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!idle && step === "mobile" && started ? (
          <div className="kiosk-card center">
            <span className="kiosk-ic">
              <Icon name="phone" size={28} />
            </span>
            <h1>Welcome</h1>
            <p>Enter your mobile number. We will send you a code to confirm it is you.</p>
            <input
              className="kiosk-in input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              aria-label="Mobile number"
              value={phone}
              onChange={(event) => {
                touch();
                setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
              }}
            />
            <Button
              className="kiosk-go"
              disabled={busy || phone.length !== 10}
              onClick={() => {
                touch();
                void run(() => sendKioskCode({ phone }));
              }}
            >
              {busy ? "Sending…" : "Send the code"}
            </Button>
          </div>
        ) : null}

        {!idle && step === "code" ? (
          <div className="kiosk-card center">
            <span className="kiosk-ic">
              <Icon name="shield" size={28} />
            </span>
            <h2>Enter the code</h2>
            <p>We sent a 6-digit code to {session.phone}.</p>
            <div className={cn("kiosk-num", !code && "empty")}>
              {code ? (
                code
              ) : (
                <span>
                  <Icon name="more" size={28} />
                </span>
              )}
            </div>
            <input
              className="kiosk-in input"
              type="tel"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              aria-label="The code we sent"
              value={code}
              onChange={(event) => {
                touch();
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              }}
            />
            <Button
              className="kiosk-go"
              disabled={busy || code.length !== 6}
              onClick={() => {
                touch();
                void run(() => verifyKioskCode({ phone: session.phone ?? "", code }));
              }}
            >
              {busy ? "Checking…" : "Continue"}
            </Button>
          </div>
        ) : null}

        {!idle && step === "patient" ? (
          <div className="kiosk-card">
            <h2>Who is seeing the doctor?</h2>
            <p>So the doctor knows who is coming in.</p>
            <div className="kiosk-form">
              <div className="field">
                <label htmlFor="kiosk-name">Full name</label>
                <input
                  id="kiosk-name"
                  className="input kiosk-text"
                  value={name}
                  placeholder="Full name"
                  onChange={(event) => {
                    touch();
                    setName(event.target.value);
                  }}
                />
              </div>
              <div className="kiosk-row2">
                <div className="field">
                  <label htmlFor="kiosk-age">Age (years)</label>
                  <input
                    id="kiosk-age"
                    className="input kiosk-text"
                    type="tel"
                    inputMode="numeric"
                    maxLength={3}
                    value={age}
                    placeholder="Age"
                    onChange={(event) => {
                      touch();
                      setAge(event.target.value.replace(/\D/g, "").slice(0, 3));
                    }}
                  />
                </div>
                <div className="field">
                  <label>Sex</label>
                  <div className="kiosk-seg yn">
                    {[
                      { value: "F", label: "Female" },
                      { value: "M", label: "Male" },
                      { value: "O", label: "Other" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(sex === option.value && "on")}
                        onClick={() => {
                          touch();
                          setSex(option.value);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field">
                <label>Allergic to any medicine?</label>
                <div className="kiosk-seg yn">
                  {[
                    { value: "N", label: "No" },
                    { value: "Y", label: "Yes" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(sex === option.value && "on")}
                      onClick={() => {
                        touch();
                        setSex(option.value);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="kiosk-phone">Mobile</label>
                <input
                  id="kiosk-phone"
                  className="input kiosk-text"
                  value={phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : ""}
                  placeholder="Mobile"
                  readOnly
                />
              </div>
            </div>
            <div className="kiosk-acts">
              <Button
                variant="secondary"
                onClick={() => {
                  touch();
                  startOver();
                }}
              >
                Start again
              </Button>
              <Button
                className="kiosk-go"
                disabled={busy || name.trim().length < 2}
                onClick={() => {
                  touch();
                  void run(() => setKioskPatient({ name, age, sex }));
                }}
              >
                {busy ? "Saving…" : "Continue"}
              </Button>
            </div>
          </div>
        ) : null}

        {!idle && step === "doctor" ? (
          <div className="kiosk-card">
            <h2>Who would you like to see?</h2>
            <p>Choose a doctor. You can wait for the one with the shortest queue.</p>
            <div className="kiosk-list">
              {session.doctors.map((doctor) => (
                <button
                  key={doctor.id}
                  type="button"
                  className={cn("kiosk-opt", doctorId === doctor.id && "on")}
                  onClick={() => {
                    touch();
                    setDoctorId(doctor.id);
                  }}
                >
                  <span className="kiosk-av">{doctor.name.slice(4, 6).toUpperCase()}</span>
                  <span>
                    <b>{doctor.name}</b>
                    <small>
                      {doctor.speciality} · {doctor.room}
                    </small>
                  </span>
                  <span className="kiosk-fee">
                    <small>Fee</small>₹{doctor.fee}
                  </span>
                </button>
              ))}
            </div>
            <Button
              className="kiosk-go"
              disabled={busy || !doctorId}
              onClick={() => {
                touch();
                void run(() => chooseKioskDoctor({ doctorId }));
              }}
            >
              {busy ? "Saving…" : "Continue"}
            </Button>
          </div>
        ) : null}

        {!idle && step === "pay" ? (
          <div className="kiosk-card">
            <h2>Pay</h2>
            <p>Pay here and you will not have to queue at the counter.</p>
            {session.bill ? (
              <div className="kiosk-bill">
                {session.bill.lines.map((line) => (
                  <div key={line.name}>
                    <span>{line.name}</span>
                    <b>₹{line.amount}</b>
                  </div>
                ))}
                <div className="total">
                  <span>To pay</span>
                  <b>₹{session.bill.total}</b>
                </div>
              </div>
            ) : null}
            <div className="kiosk-seg" style={{ marginTop: 18 }}>
              {[
                { value: "upi", label: "UPI" },
                { value: "card", label: "Card" },
                { value: "cash", label: "Cash at the desk" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(method === option.value && "on")}
                  onClick={() => {
                    touch();
                    setMethod(option.value);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="kiosk-acts kiosk-pay">
              <Button variant="secondary" onClick={startOver}>
                Cancel
              </Button>
              <Button
                className="kiosk-go"
                disabled={busy}
                onClick={() => {
                  touch();
                  void run(() => payKiosk({ method }));
                }}
              >
                {busy ? "Paying…" : `Pay ₹${session.bill?.total ?? 0}`}
              </Button>
            </div>
          </div>
        ) : null}

        {!idle && step === "token" ? (
          <div className="kiosk-card center kiosk-tk">
            <span className="kiosk-ic ok">
              <Icon name="check" size={28} />
            </span>
            <h2>You are checked in</h2>
            <p>Please keep this screen. We will call your token.</p>
            <div className="kiosk-token">{session.token ?? "—"}</div>
            <div className="kiosk-token-l">Your token</div>
            {session.doctor ? (
              <div className="note mint" style={{ textAlign: "left", marginTop: 16 }}>
                <Icon name="stetho" size={18} />
                <div>
                  {session.doctor.name} · {session.doctor.room}
                  {session.waiting ? ` · ${session.waiting} ahead of you` : " · you are next"}
                </div>
              </div>
            ) : null}
            <Button
              className="kiosk-go"
              disabled={busy}
              onClick={() => {
                touch();
                void run(() => takeKioskToken());
              }}
            >
              {busy ? "Printing…" : "Print my slip"}
            </Button>
            <Button
              variant="secondary"
              style={{ marginTop: 10 }}
              onClick={() => {
                touch();
                void run(() => resetKiosk());
              }}
            >
              Done
            </Button>
          </div>
        ) : null}
      </div>

      <button type="button" className="kiosk-staff">
        <Icon name="lock" size={14} />
        Staff
      </button>
    </div>
  );
}
