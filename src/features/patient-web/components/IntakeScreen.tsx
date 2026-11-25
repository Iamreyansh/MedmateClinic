import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { fetchIntake, submitIntake } from "@/features/patient-web/api/patientWeb";
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
 */
export function IntakeScreen() {
  const { token = "" } = useParams();
  const [form, setForm] = useState<IntakeForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchIntake(token)
      .then((data) => {
        if (!alive) return;
        setForm(data);
        setSymptoms(data.symptoms);
        setRedFlags(data.redFlags);
        setNotes(data.notes);
        setDuration(data.duration);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not open the form");
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const toggle = (list: string[], setList: (next: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitIntake(token, { symptoms, redFlags, notes, duration });
      setSent(true);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not send the form");
    } finally {
      setBusy(false);
    }
  };

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
        {error ? (
          <div className="card">
            <p className="err">{error}</p>
          </div>
        ) : null}

        {!error && sent ? (
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

        {!error && !sent && form ? (
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
                    className={cn("chip red-flag", redFlags.includes(entry) && "on")}
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
                  rows={4}
                  value={notes}
                  placeholder="Tell the doctor in your own words."
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>

            <Button
              className="block"
              style={{ marginTop: 14 }}
              disabled={busy || symptoms.length === 0}
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

