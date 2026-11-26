"use client";

import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchIntake, submitIntake } from "@/features/patient-web/api/patientWeb";
import type { IntakeForm } from "@/features/patient-web/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextArea } from "@/components/ui/Input";
import { useAction, useRemote } from "@/mobile/hooks";
import { MobileCard, MobileError, MobileLoading, MobileTitle } from "@/mobile/components";
import { PhoneTabBar } from "@/mobile/appShell";

/** The symptoms the patient can pick. */
const SYMPTOMS = [
  "Fever",
  "Cough",
  "Cold",
  "Headache",
  "Body ache",
  "Sore throat",
  "Stomach pain",
  "Loose motions",
  "Rash",
  "Breathlessness",
  "Chest pain",
  "Back pain",
];

/** The red flags — the things that need a doctor now. */
const RED_FLAGS = [
  "Breathlessness at rest",
  "Chest pain",
  "Unconsciousness or confusion",
  "Bleeding that will not stop",
  "Severe dehydration",
  "A rash that does not fade",
];

/** How long the patient has had it. */
const DURATIONS = ["Today", "2–3 days", "About a week", "More than a week"];

/**
 * The symptoms form, on the patient's phone.
 *
 * The patient fills it in before the visit, so the doctor reads it before
 * the patient is in the room. The red flags are the ones that mean the
 * patient should not wait for a slot.
 */
export function MobileIntakeScreen() {
  const { key = "" } = useParams();
  const load = useCallback(() => fetchIntake(key), [key]);
  const { status, data, error, reload, unreachable, code } = useRemote(load, key);
  const [sent, setSent] = useState(false);

  if (code === 404) {
    return (
      <div className="mob-phone">
        <header className="mob-head pub">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>Before your visit</h1>
          <p>This link is no longer open</p>
        </header>
        <div className="mob-body">
          <MobileCard>
            <span className="kiosk-ic warn">
              <Icon name="alert" size={26} />
            </span>
            <b style={{ display: "block", textAlign: "center", marginTop: 10 }}>
              This link has expired
            </b>
            <p className="t-cap" style={{ textAlign: "center", marginTop: 6 }}>
              Ask the clinic for a new link, and you can fill this in on it.
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
        <h1>Before your visit</h1>
        <p>{data?.patient ? `Hello, ${data.patient}.` : "Tell the doctor what is wrong"}</p>
      </header>

      <div className="mob-body">
        {status === "loading" && !data ? <MobileLoading title="Opening the form…" /> : null}
        {status === "error" && error ? (
          <MobileError message={error} onRetry={reload} unreachable={unreachable} />
        ) : null}

        {sent ? (
          <MobileCard>
            <span className="kiosk-ic ok">
              <Icon name="check" size={26} />
            </span>
            <b style={{ display: "block", textAlign: "center", marginTop: 10 }}>Thank you</b>
            <p className="t-cap" style={{ textAlign: "center", marginTop: 6 }}>
              The doctor will read this before you go in. You can change it until your visit.
            </p>
          </MobileCard>
        ) : null}

        {data && !sent ? (
          <Answers form={data} linkKey={key} onSent={() => setSent(true)} />
        ) : null}
      </div>
      <PhoneTabBar linkKey={key} activeHref="/m/symptoms" />
    </div>
  );
}

/** The form itself, over the answers the service already holds. */
function Answers({
  form,
  linkKey,
  onSent,
}: {
  form: IntakeForm;
  linkKey: string;
  onSent: () => void;
}) {
  const action = useAction();
  const [symptoms, setSymptoms] = useState<string[]>(form.symptoms);
  const [redFlags, setRedFlags] = useState<string[]>(form.redFlags);
  const [notes, setNotes] = useState(form.notes);
  const [duration, setDuration] = useState(form.duration);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  const send = async () => {
    const done = await action.run(() =>
      submitIntake(linkKey, { symptoms, redFlags, notes, duration }),
    );
    if (done) onSent();
  };

  return (
    <>
      {form.filled ? (
        <div className="note mint">
          <Icon name="check" size={18} />
          <div>You have already filled this in. You can change it until the visit.</div>
        </div>
      ) : null}

      {form.open === false ? (
        <div className="note gold">
          <Icon name="alert" size={18} />
          <div>This form is closed now. The clinic will ask you for it at the desk.</div>
        </div>
      ) : null}

      <MobileTitle title="What is wrong?" line="Tick everything that applies." />

      <MobileCard title="Symptoms">
        <div className="chips">
          {SYMPTOMS.map((symptom) => (
            <button
              key={symptom}
              type="button"
              className={`chip${symptoms.includes(symptom) ? " on" : ""}`}
              aria-pressed={symptoms.includes(symptom)}
              onClick={() => setSymptoms((list) => toggle(list, symptom))}
            >
              {symptom}
            </button>
          ))}
        </div>
      </MobileCard>

      <MobileCard title="Red flags">
        <p className="t-cap" style={{ marginBottom: 10 }}>
          Tick any of these, and tell the desk straight away.
        </p>
        <div className="chips">
          {RED_FLAGS.map((flag) => (
            <button
              key={flag}
              type="button"
              className={`chip red-flag${redFlags.includes(flag) ? " on" : ""}`}
              aria-pressed={redFlags.includes(flag)}
              onClick={() => setRedFlags((list) => toggle(list, flag))}
            >
              {flag}
            </button>
          ))}
        </div>
      </MobileCard>

      <MobileCard title="How long has it been?">
        <div className="chips">
          {DURATIONS.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`chip${duration === entry ? " on" : ""}`}
              aria-pressed={duration === entry}
              onClick={() => setDuration(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
      </MobileCard>

      <MobileCard title="In your own words">
        <div className="field">
          <label htmlFor="in-notes">Anything else the doctor should know</label>
          <TextArea
            id="in-notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </MobileCard>

      {action.error ? <MobileError message={action.error} onRetry={() => action.clear()} /> : null}

      <div className="mob-foot">
        <Button icon="send" disabled={action.busy} onClick={() => void send()}>
          {action.busy ? "Sending…" : "Send the form"}
        </Button>
      </div>
    </>
  );
}
