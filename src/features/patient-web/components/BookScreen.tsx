import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { bookVisit, fetchPublicBooking } from "@/features/patient-web/api/patientWeb";
import type { BookResult, PublicBookingPage } from "@/features/patient-web/types";

/** The three steps of the booking. */
type Step = "doctor" | "details" | "confirmed";

/**
 * Book a doctor.
 *
 * The patient arrives here from the clinic's own link. One question a step:
 * who to see, then their details, then the confirmation.
 */
/** A key for one booking attempt. */
function newAttemptKey(): string {
  return `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function BookScreen() {
  const [params] = useSearchParams();
  /**
   * The clinic's own slug, read once from the link the patient was sent.
   *
   * The slug always travels with the booking link, and it is never guessed:
   * a page without one has no clinic to book with, so the screen says so
   * instead of picking one.
   */
  const slug = params.get("clinic") ?? "";

  const [page, setPage] = useState<PublicBookingPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("doctor");

  const [doctorId, setDoctorId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("F");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState<BookResult | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per attempt, so a double tap cannot make two visits.
  const [attemptKey, setAttemptKey] = useState(() => newAttemptKey());

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    fetchPublicBooking(slug)
      .then((data) => {
        if (!alive) return;
        setPage(data);
        setError(null);
        // "any available doctor" is the first choice
        setDoctorId(data.doctors[0]?.id ?? "");
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the booking page");
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const doctor = page?.doctors.find((entry) => entry.id === doctorId) ?? null;

  /**
   * What the patient is told.
   *
   * A link without a clinic has no clinic to book with, and the screen says
   * so in its own words rather than guessing a clinic.
   */
  const shownError = error ?? (slug ? null : "Open your clinic's own booking link to book a visit.");

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await bookVisit(
        {
          clinic: slug,
          doctorId,
          startsAt,
          name,
          phone,
          age,
          sex,
          reason,
        },
        attemptKey,
      );
      setBooking(result);
      setStep("confirmed");
      // The next attempt gets its own key.
      setAttemptKey(newAttemptKey());
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not book the visit");
    } finally {
      setBusy(false);
    }
  };

  /** The head every step shares. */
  const head = (
    <div className="mob-head pub" style={{ paddingBottom: 56 }}>
      <div className="lockup">
        <div className="wordmark" style={{ fontSize: 26 }}>
          Med<span className="m">Mate</span>
        </div>
      </div>
      <h1>Book a doctor</h1>
      <p>{page?.clinic.name ?? ""}</p>
    </div>
  );

  return (
    <div style={{ background: "var(--surface-2)", minHeight: "100vh" }}>
      {head}

      <div
        style={{
          maxWidth: 640,
          margin: "-40px auto 0",
          padding: "0 16px 40px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 14,
        }}
      >
        {shownError ? (
          <p className="err" role="alert">
            {shownError}
          </p>
        ) : null}

        {step === "doctor" && page ? (
          <>
            <div className="card">
              <div className="card-h">
                <div className="t-h3">
                  1 · <em>Doctor</em>
                </div>
              </div>
              {page.doctors.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={cn("opt", doctorId === entry.id && "on")}
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => {
                    setDoctorId(entry.id);
                    setStartsAt("");
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <b>{entry.name}</b>
                    <div className="t-cap">
                      {entry.speciality} · ₹{entry.feeInClinic} in clinic · ₹{entry.feeOnline} video
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="card">
              <div className="card-h">
                <div className="t-h3">
                  2 · <em>Time</em>
                </div>
                {page.nextFree ? <span className="t-cap">Next free: {page.nextFree}</span> : null}
              </div>
              <div className="slots">
                {page.slots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    disabled={!slot.free}
                    className={cn(startsAt === slot.startsAt && "on")}
                    onClick={() => setStartsAt(slot.startsAt)}
                  >
                    <b>{slot.label}</b>
                    <span>{slot.free ? "Free" : "Taken"}</span>
                  </button>
                ))}
              </div>
              {startsAt ? (
                <Button className="block" style={{ marginTop: 14 }} onClick={() => setStep("details")}>
                  Continue
                </Button>
              ) : null}
            </div>
          </>
        ) : null}

        {step === "details" ? (
          <div className="card">
            <div className="card-h">
              <div className="t-h3">
                3 · <em>Your details</em>
              </div>
              {doctor ? <span className="t-cap">{doctor.name}</span> : null}
            </div>

            <div className="field">
              <label htmlFor="book-name">Name</label>
              <Input
                id="book-name"
                value={name}
                placeholder="Your name"
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="book-phone">Mobile number</label>
              <Input
                id="book-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                placeholder="10-digit number"
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>

            <div className="grid2">
              <div className="field">
                <label htmlFor="book-age">Age</label>
                <Input
                  id="book-age"
                  type="number"
                  inputMode="numeric"
                  value={age}
                  placeholder="Years"
                  onChange={(event) => setAge(event.target.value.replace(/\D/g, "").slice(0, 3))}
                />
              </div>
              <div className="field">
                <label htmlFor="book-sex">Sex</label>
                <select
                  id="book-sex"
                  className="input"
                  value={sex}
                  onChange={(event) => setSex(event.target.value)}
                >
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="book-reason">What brings you in?</label>
              <TextArea
                id="book-reason"
                rows={3}
                value={reason}
                placeholder="A short line for the doctor."
                onChange={(event) => setReason(event.target.value)}
              />
            </div>

            <div className="kiosk-acts" style={{ marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setStep("doctor")}>
                Back
              </Button>
              <Button
                disabled={busy || name.trim().length === 0 || phone.length !== 10}
                onClick={() => void submit()}
              >
                {busy ? "Booking…" : "Book the visit"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === "confirmed" && booking ? (
          <div className="card center" style={{ textAlign: "center" }}>
            <span className="kiosk-ic ok">
              <Icon name="check" size={28} />
            </span>
            <div className="t-h2" style={{ marginTop: 12 }}>
              You are booked
            </div>
            <p className="t-cap" style={{ marginTop: 6 }}>
              {booking.clinic} · {booking.doctor}
            </p>
            <div className="kiosk-token" style={{ fontSize: 44 }}>
              {booking.queueToken}
            </div>
              <div className="kiosk-token-l">Your queue number</div>

            <div className="live-row" style={{ marginTop: 18, textAlign: "left" }}>
              <span>Keep this link to track your turn</span>
              <a className="btn sec sm" href={booking.liveUrl}>
                Open
              </a>
            </div>
            <div className="live-row" style={{ marginTop: 8, textAlign: "left" }}>
              <span>Fill in your symptoms before the visit</span>
              <a className="btn sec sm" href={booking.intakeUrl}>
                Open
              </a>
            </div>

            <div className="note mint" style={{ marginTop: 16, textAlign: "left" }}>
              <Icon name="check" size={18} />
              <div>
                Please arrive ten minutes early. We will call your token when the doctor is ready.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

