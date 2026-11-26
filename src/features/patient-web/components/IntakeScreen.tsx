import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { cn } from "@/lib/cn";
import { fetchIntake, submitIntake } from "@/features/patient-web/api/patientWeb";
import { InvalidLinkCard } from "@/features/patient-web/components/InvalidLinkCard";
import { patientFailure, type PatientFailure } from "@/features/patient-web/lib/errors";
import type { IntakeForm } from "@/features/patient-web/types";

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
 * The symptoms form.
 *
 * The patient fills it in before the visit, so the doctor reads it before the
 * patient is in the room. The red flags are the ones that mean the patient
 * should not wait for a slot.
 *
 * The confirmation says what the service says: the form is filled in when the
 * service says it is filled in, and not before.
 */
export function IntakeScreen() {
  const { token = "" } = useParams();
  const [form, setForm] = useState<IntakeForm | null>(null);
  const [failure, setFailure] = useState<PatientFailure | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");
  /** The service says the form is filled in. */
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchIntake(token)
      .then((data) => {
        if (!alive) return;
        setForm(data);
        setSymptoms(data.symptoms);
        setRedFlags(data.redFlags);
        setNotes(data.notes);
        setDuration(data.duration);
        setFailure(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        const failed = patientFailure(reason, "Could not open the form");
        setFailure(failed);
        if (failed.invalidLink) {
          // A link the clinic has to replace leaves nothing behind: the form
          // is cleared, not only hidden.
          setForm(null);
          setSymptoms([]);
          setRedFlags([]);
          setNotes("");
          setDuration("");
        }
      });
    return () => {
      alive = false;
    };
  }, [token, attempt]);

  const toggle = (list: string[], setList: (next: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);
  };

  const send = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const result = await submitIntake(token, { symptoms, redFlags, notes, duration });
      // The confirmation is the service's own answer: the form is filled in
      // when the service says it is.
      if (result.filled) {
        setSent(true);
      } else {
        setFailure({
          message: "We could not save your answers yet. Try again in a moment.",
          unreachable: false,
          invalidLink: false,
          conflict: false,
        });
      }
    } catch (reason: unknown) {
      const failed = patientFailure(reason, "Could not send the form");
      setFailure(failed);
      if (failed.invalidLink) {
        setForm(null);
        setSymptoms([]);
        setRedFlags([]);
        setNotes("");
        setDuration("");
      }
    } finally {
      setBusy(false);
    }
  };

  const filled = Boolean(form?.filled) || sent;

  /** The form is on its way, and there is nothing to show yet. */
  const loading = Boolean(token) && !form && !failure;

  return (
    <div className="intake-page">
      <div className="mob-head pub" style={{ paddingBottom: 56 }}>
        <div className="lockup">
          <div className="wordmark" style={{ fontSize: 26 }}>
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Before your visit</h1>
        <p>{form?.patient ? `Hello, ${form.patient}.` : ""}</p>
      </div>

      <div className="intake-wrap">
        {failure?.invalidLink ? (
          <InvalidLinkCard onRetry={() => setAttempt((count) => count + 1)} />
        ) : null}

        {!failure?.invalidLink && failure && !filled ? (
          <ErrorState
            message={failure.message}
            title={failure.unreachable ? "The clinic is not answering" : "Something went wrong"}
            onRetry={() => void send()}
          />
        ) : null}

        {!failure?.invalidLink && loading && !form ? <LoadingState title="Opening the form…" /> : null}

        {!failure?.invalidLink && !filled && form && form.open === false ? (
          <div className="card">
            <div className="note gold">
              <Icon name="alert" size={18} />
              <div>
                This form is closed. Ask the front desk to open it for you.
              </div>
            </div>
          </div>
        ) : null}

        {!failure?.invalidLink && filled && form ? (
          <div className="card center" style={{ textAlign: "center" }}>
            <span className="kiosk-ic ok">
              <Icon name="check" size={28} />
            </span>
            <div className="t-h2" style={{ marginTop: 12 }}>
              Thank you
            </div>
            <p className="t-cap" style={{ marginTop: 6 }}>
              The doctor will read this before you come in.
            </p>
          </div>
        ) : null}

        {!failure?.invalidLink && !filled && form ? (
          <>
            <div className="intake-lead">
              This helps the doctor before you come in. It takes a minute.
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-h">
                <div className="t-h3">How long have you had it?</div>
              </div>
              <div className="chips">
                {DURATIONS.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className={cn("chip", duration === entry && "on")}
                    aria-pressed={duration === entry}
                    onClick={() => setDuration(entry)}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-h">
                <div className="t-h3">What are you feeling?</div>
              </div>
              <div className="chips">
                {SYMPTOMS.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className={cn("chip", symptoms.includes(entry) && "on")}
                    aria-pressed={symptoms.includes(entry)}
                    onClick={() => toggle(symptoms, setSymptoms, entry)}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-h">
                <div className="t-h3">Any of these?</div>
                <span className="t-cap">Tick all that apply</span>
              </div>
              <div className="chips">
                {RED_FLAGS.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className={cn("chip", "red-flag", redFlags.includes(entry) && "on")}
                    aria-pressed={redFlags.includes(entry)}
                    onClick={() => toggle(redFlags, setRedFlags, entry)}
                  >
                    {entry}
                  </button>
                ))}
              </div>
              {redFlags.length > 0 ? (
                <div className="note red" style={{ marginTop: 12 }}>
                  <Icon name="alert" size={18} />
                  <div>
                    If any of these is getting worse, please tell the front desk when you arrive.
                  </div>
                </div>
              ) : null}
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-h">
                <div className="t-h3">Anything else?</div>
              </div>
              <div className="field">
                <TextArea
                  id="intake-notes"
                  rows={3}
                  value={notes}
                  placeholder="In your own words"
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>

            <Button
              className="block"
              style={{ marginTop: 16 }}
              disabled={busy}
              onClick={() => void send()}
            >
              {busy ? "Sending…" : "Send to the doctor"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
