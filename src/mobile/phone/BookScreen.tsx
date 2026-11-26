"use client";

import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchPublicBookingFor } from "@/mobile/api";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAction, useRemote } from "@/mobile/hooks";
import { MobileCard, MobileEmpty, MobileError, MobileLoading } from "@/mobile/components";
import { PhoneTabBar } from "@/mobile/appShell";

/**
 * The booking page on a phone.
 *
 * The doctor and the time, both from the service: the free times are the
 * ones the API sent, never ones worked out on the phone.
 */
export function MobileBookScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const slug = params.get("clinic") ?? "";
  const action = useAction();

  const [doctorId, setDoctorId] = useState("");
  const [startsAt, setStartsAt] = useState("");

  /**
   * The times on show are the times of the doctor on show.
   *
   * Naming a doctor asks the service for that doctor's free times; naming
   * none leaves the service's default. Either way the patient books the
   * doctor whose times they were shown.
   */
  const load = useCallback(
    () =>
      slug
        ? fetchPublicBookingFor(slug, doctorId || undefined)
        : Promise.reject(new Error("Open your clinic's own booking link to book a visit.")),
    [slug, doctorId],
  );
  const { status, data, error, reload, unreachable } = useRemote(load, `${slug}|${doctorId}`);

  const chosen = data?.doctors.find((doctor) => doctor.id === doctorId) ?? null;
  const slots = data?.slots ?? [];

  /**
   * The doctor the booking goes to.
   *
   * It is the doctor whose free times are on show: the one the patient
   * named, or the service's default when they named none. The service
   * insists on a doctor, so one is always sent.
   */
  const bookedDoctor = doctorId || data?.doctors[0]?.id || "";

  const next = () => {
    const query = new URLSearchParams();
    if (slug) query.set("clinic", slug);
    if (bookedDoctor) query.set("doctor", bookedDoctor);
    if (startsAt) query.set("at", startsAt);
    navigate(`/m/book/details?${query.toString()}`);
  };

  return (
    <div className="mob-phone">
      <header className="mob-head pub">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Book a doctor</h1>
        <p>{data?.clinic.name ?? "Your clinic"}</p>
      </header>

      <div className="mob-body">
        {status === "loading" && !data ? <MobileLoading title="Loading the doctors…" /> : null}
        {status === "error" && error ? (
          <MobileError message={error} onRetry={reload} unreachable={unreachable} />
        ) : null}

        {data ? (
          <>
            <MobileCard title="1 · Doctor">
              <div className="mob-section">
                <button
                  type="button"
                  className="mob-row"
                  aria-pressed={doctorId === ""}
                  onClick={() => setDoctorId("")}
                >
                  <span className="txt">
                    <b>Any available doctor</b>
                    <small>The earliest free time with any doctor</small>
                  </span>
                  {doctorId === "" ? <span className="badge mint">Chosen</span> : null}
                </button>
                {data.doctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    type="button"
                    className="mob-row"
                    aria-pressed={doctorId === doctor.id}
                    onClick={() => {
                      setDoctorId(doctor.id);
                      setStartsAt("");
                    }}
                  >
                    <span className="ico">
                      <span style={{ fontWeight: 800, fontSize: 12 }}>
                        {doctor.name
                          .replace(/^Dr\.?\s+/i, "")
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part.charAt(0))
                          .join("")
                          .toUpperCase()}
                      </span>
                    </span>
                    <span className="txt" style={{ whiteSpace: "normal" }}>
                      <b style={{ whiteSpace: "normal" }}>{doctor.name}</b>
                      <small style={{ whiteSpace: "normal" }}>
                        {doctor.speciality} · ₹{doctor.feeInClinic} in clinic · ₹{doctor.feeOnline} video
                      </small>
                    </span>
                    {doctorId === doctor.id ? <span className="badge mint">Chosen</span> : null}
                  </button>
                ))}
              </div>
            </MobileCard>

            <MobileCard title="2 · Time">
              <p className="t-cap" style={{ marginBottom: 10 }}>
                {data.day}
                {data.nextFree ? ` · next free ${data.nextFree}` : ""}
              </p>
              {slots.length === 0 ? (
                <MobileEmpty
                  title="No times yet"
                  copy="There is nothing free to book for this day. Try another day, or call the clinic."
                />
              ) : (
                <div className="mob-slots">
                  {slots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      type="button"
                      className={`mob-slot${startsAt === slot.startsAt ? " on" : ""}`}
                      disabled={!slot.free}
                      aria-pressed={startsAt === slot.startsAt}
                      onClick={() => setStartsAt(slot.startsAt)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </MobileCard>

            {action.error ? (
              <div className="note red" role="alert">
                <Icon name="alert" size={18} />
                <div>{action.error}</div>
              </div>
            ) : null}

            <div className="mob-foot">
              <Button icon="chev" disabled={!startsAt || !bookedDoctor} onClick={next}>
                {chosen ? `Book ${chosen.name}` : "Book a doctor"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
      <PhoneTabBar activeHref="/m/book" />
    </div>
  );
}
