import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { cn } from "@/lib/cn";
import { bookVisit, fetchPublicBooking } from "@/features/patient-web/api/patientWeb";
import { rememberBooking, rememberClinic } from "@/features/patient-web/lib/bookingStore";
import { clinicTimeLine, formatServiceDay } from "@/features/patient-web/lib/clinicTime";
import { patientFailure, type PatientFailure } from "@/features/patient-web/lib/errors";
import type { BookResult, PublicBookingPage, PublicSlot } from "@/features/patient-web/types";

/** The three steps of the booking. */
type Step = "doctor" | "details" | "confirmed";

/**
 * A key for one booking attempt.
 *
 * The key belongs to the attempt, and it is kept for as long as the booking
 * lasts: the call-off sends it, so the service can answer a second tap with
 * the first result instead of a second failure.
 */
function newAttemptKey(): string {
  return `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The link, with the clinic carried along. */
function withClinic(url: string, slug: string): string {
  if (!slug || !url) return url;
  return url.includes("?") ? `${url}&clinic=${encodeURIComponent(slug)}` : `${url}?clinic=${encodeURIComponent(slug)}`;
}

/**
 * Book a doctor.
 *
 * The patient arrives here from the clinic's own link. One question a step:
 * who to see, then their details, then the confirmation.
 *
 * The times are the service's own — the page asks for the doctor the patient
 * picked and shows the slots that doctor is free for. It never works out a
 * time of its own.
 */
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<PatientFailure | null>(null);
  const [step, setStep] = useState<Step>("doctor");
  /** The doctor the patient picked. Empty is the service's first doctor. */
  const [doctorId, setDoctorId] = useState("");
  const [slot, setSlot] = useState<PublicSlot | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("F");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState<BookResult | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per attempt, so a double tap cannot make two visits.
  const attemptKey = useRef(newAttemptKey());
  // Bumped when the times have to be fetched again — after a time was taken.
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    fetchPublicBooking(slug, doctorId || undefined)
      .then((data) => {
        if (!alive) return;
        setPage(data);
        setFailure(null);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setFailure(patientFailure(reason, "Could not load the booking page", "booking"));
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, doctorId, refresh]);

  useEffect(() => {
    if (slug) rememberClinic(slug);
  }, [slug]);

  const doctor = page?.doctors.find((entry) => entry.id === doctorId) ?? page?.doctors[0] ?? null;
  const slots = page?.slots ?? [];
  const freeSlots = slots.filter((entry) => entry.free);
  const zone = clinicTimeLine(page?.clinic, slots);

  /**
   * What the patient is told.
   *
   * A link without a clinic has no clinic to book with, and the screen says
   * so in its own words rather than guessing a clinic.
   */
  const shownError = failure?.message ?? (slug ? null : "Open your clinic's own booking link to book a visit.");

  const chooseDoctor = (id: string) => {
    if (id === doctorId) return;
    setDoctorId(id);
    setSlot(null);
    setRefreshing(true);
  };

  const submit = async () => {
    if (!slot) return;
    setBusy(true);
    setFailure(null);
    const key = attemptKey.current;
    try {
      const result = await bookVisit(
        {
          clinic: slug,
          doctorId: doctor?.id ?? "",
          startsAt: slot.startsAt,
          name,
          phone,
          age,
          sex,
          reason,
        },
        key,
      );
      setBooking(result);
      setStep("confirmed");
      // The next attempt gets its own key; this one belongs to this booking.
      attemptKey.current = newAttemptKey();
      rememberBooking({
        linkKey: result.token,
        idempotencyKey: key,
        queueToken: result.queueToken,
        doctor: result.doctor,
        clinic: result.clinic,
        startsAt: result.startsAt,
      });
    } catch (reason: unknown) {
      const failed = patientFailure(reason, "Could not book the visit", "booking");
      setFailure(failed);
      if (failed.conflict) {
        // The time was taken while the patient was typing. Their details stay
        // where they are, and the times come back without it.
        setRefreshing(true);
        setRefresh((count) => count + 1);
      }
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
          failure?.invalidLink || !slug ? (
            <div className="note red" role="alert">
              <Icon name="alert" size={18} />
              <div style={{ flex: 1 }}>{shownError}</div>
            </div>
          ) : (
            <ErrorState
              message={shownError}
              title={failure?.unreachable ? "The clinic is not answering" : "Something went wrong"}
              onRetry={() => {
                setFailure(null);
                setLoading(true);
                setRefresh((count) => count + 1);
              }}
            />
          )
        ) : null}

        {loading && !page ? <LoadingState title="Loading the clinic's times…" /> : null}

        {step === "doctor" && page ? (
          <>
            <div className="card">
              <div className="card-h">
                <div className="t-h3">
                  1 · <em>Doctor</em>
                </div>
              </div>
              {page.doctors.length === 0 ? (
                <EmptyState
                  title="No doctors to book yet"
                  copy="Ask the clinic when a doctor is free."
                  icon="stetho"
                />
              ) : (
                page.doctors.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={cn("pw-doc", entry.id === doctor?.id && "on")}
                    style={{ width: "100%", textAlign: "left" }}
                    aria-pressed={entry.id === doctor?.id}
                    onClick={() => chooseDoctor(entry.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <b>{entry.name}</b>
                      <div className="t-cap">
                        {entry.speciality} · ₹{entry.feeInClinic} in clinic · ₹{entry.feeOnline} video
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="card">
              <div className="card-h">
                <div className="t-h3">
                  2 · <em>Time</em>
                </div>
                {page.nextFree ? <span className="t-cap">Next free: {page.nextFree}</span> : null}
              </div>
              {zone ? <p className="t-cap" style={{ marginBottom: 10 }}>Clinic time: {zone}</p> : null}

              {refreshing ? <LoadingState title="Loading the times…" /> : null}

              {!refreshing && freeSlots.length === 0 ? (
                <EmptyState
                  title="No free times on this day"
                  copy={
                    page.clinic.phone
                      ? `Ask the clinic for another day, or call ${page.clinic.phone}.`
                      : "Ask the clinic for another day."
                  }
                  icon="cal"
                />
              ) : null}

              {!refreshing && freeSlots.length > 0 ? (
                <div className="slots">
                  {slots.map((entry) => (
                    <button
                      key={entry.startsAt}
                      type="button"
                      disabled={!entry.free}
                      className={cn(entry.startsAt === slot?.startsAt && "on")}
                      aria-pressed={entry.startsAt === slot?.startsAt}
                      onClick={() => setSlot(entry)}
                    >
                      <b>{entry.label}</b>
                      <span>{entry.free ? "Free" : "Taken"}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {slot ? (
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
            {slot ? (
              <p className="t-cap" style={{ marginBottom: 12 }}>
                {slot.label} · {formatServiceDay(page?.day ?? "")}
                {zone ? ` · ${zone}` : ""}
              </p>
            ) : null}

            <div className="field">
              <label htmlFor="book-name">Name</label>
              <Input
                id="book-name"
                value={name}
                placeholder="Your full name"
                autoComplete="name"
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
                autoComplete="tel"
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
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
                  onChange={(event) => setAge(event.target.value)}
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
                placeholder="A sentence is enough"
                onChange={(event) => setReason(event.target.value)}
              />
            </div>

            <div className="kiosk-acts" style={{ marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setStep("doctor")}>
                Back
              </Button>
              <Button
                disabled={busy || !slot || name.trim().length === 0 || phone.length !== 10}
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
            {slot ? (
              <p className="t-cap" style={{ marginTop: 2 }}>
                {slot.label} · {formatServiceDay(page?.day ?? "")}
                {zone ? ` · ${zone}` : ""}
              </p>
            ) : null}
            <div className="kiosk-token" style={{ fontSize: 44 }}>
              {booking.queueToken}
            </div>
            <div className="kiosk-token-l">Your queue number</div>

            <div className="live-row" style={{ marginTop: 18, textAlign: "left" }}>
              <span>Keep this link to track your turn</span>
              <a className="btn sec sm" href={withClinic(booking.liveUrl, slug)}>
                Open
              </a>
            </div>
            <div className="live-row" style={{ marginTop: 8, textAlign: "left" }}>
              <span>Fill in your symptoms before the visit</span>
              <a className="btn sec sm" href={withClinic(booking.intakeUrl, slug)}>
                Open
              </a>
            </div>
            <div className="live-row" style={{ marginTop: 8, textAlign: "left" }}>
              <span>Manage this booking</span>
              <a
                className="btn sec sm"
                href={`/appt?token=${encodeURIComponent(booking.token)}&clinic=${encodeURIComponent(slug)}`}
              >
                Open
              </a>
            </div>

            <div className="note mint" style={{ marginTop: 16, textAlign: "left" }}>
              <Icon name="check" size={18} />
              <div>
                Please arrive ten minutes early. We will call your number when the doctor is ready.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
