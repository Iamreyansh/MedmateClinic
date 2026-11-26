"use client";

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { bookVisit } from "@/features/patient-web/api/patientWeb";
import type { BookResult } from "@/features/patient-web/types";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { useAction } from "@/mobile/hooks";
import { MobileCard, MobileError, MobileTitle } from "@/mobile/components";
import { clockTime } from "@/mobile/time";

/**
 * The patient's details, on a phone.
 *
 * The one write in the patient's own hands: the booking. The idempotency
 * key means a double tap cannot make two visits.
 */
export function MobileBookDetailsScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const action = useAction();

  const clinic = params.get("clinic") ?? "";
  const doctorId = params.get("doctor") ?? "";
  const startsAt = params.get("at") ?? "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("F");
  const [reason, setReason] = useState("");

  const valid =
    name.trim().length > 1 &&
    phone.replace(/\D/g, "").length >= 10 &&
    doctorId !== "" &&
    startsAt !== "";

  const submit = async () => {
    const key = `book-${clinic}-${doctorId}-${startsAt}-${phone}`;
    const booking = await action.run(() =>
      bookVisit(
        {
          clinic,
          doctorId,
          startsAt,
          name,
          phone,
          age,
          sex,
          reason,
        },
        key,
      ),
    );
    if (booking) {
      // The link key goes in the URL. It is never drawn.
      navigate(`/m/book/confirmed?key=${encodeURIComponent(booking.token)}`, {
        state: { booking },
      });
    }
  };

  if (!clinic || !doctorId || !startsAt) {
    return (
      <div className="mob-phone">
        <header className="mob-head pub">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>Your details</h1>
          <p>The visit to book</p>
        </header>
        <div className="mob-body">
          <MobileError
            message="There is no visit to book here. Open the clinic's booking link and pick a time."
            onRetry={() => navigate("/m/book")}
          />
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
        <h1>Your details</h1>
        <p>At {clockTime(startsAt)}</p>
      </header>

      <div className="mob-body">
        <MobileTitle title="Who is coming" line="The doctor reads this before you arrive." />

        <MobileCard>
          <div className="field">
            <label htmlFor="bd-name">Your name</label>
            <Input
              id="bd-name"
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="bd-phone">Mobile number</label>
            <Input
              id="bd-phone"
              value={phone}
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile"
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="mob-2" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="bd-age">Age</label>
              <Input
                id="bd-age"
                value={age}
                inputMode="numeric"
                maxLength={3}
                onChange={(event) => setAge(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="field">
              <label htmlFor="bd-sex">Sex</label>
              <Input
                id="bd-sex"
                value={sex}
                maxLength={1}
                onChange={(event) => setSex(event.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="bd-reason">What is it about?</label>
            <TextArea
              id="bd-reason"
              rows={3}
              value={reason}
              placeholder="A sentence is enough"
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </MobileCard>

        {action.error ? (
          <MobileError message={action.error} onRetry={() => action.clear()} />
        ) : null}

        <div className="mob-foot">
          <Button
            icon="check"
            disabled={!valid || action.busy}
            onClick={() => void submit()}
          >
            {action.busy ? "Booking…" : "Book the visit"}
          </Button>
          <p className="t-cap" style={{ textAlign: "center" }}>
            <Icon name="shield" size={14} /> Your details go to the clinic and nowhere else.
          </p>
        </div>
      </div>
    </div>
  );
}

/** The booking the patient has just made, when the page knows it. */
export type BookingState = { booking?: BookResult };
