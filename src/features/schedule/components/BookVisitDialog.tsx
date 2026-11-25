import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export type BookVisitDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the booking as it stands. */
  onBook: (booking: { patient: string; doctor: string; date: string; time: string; reason: string }) => void;
  /** The doctors a patient can be sent to. */
  doctors: Array<{ id: string; name: string; speciality: string }>;
  /** The days that can be picked. */
  days: Array<{ value: string; label: string }>;
  /** The free slots. */
  slots: Array<{ value: string; label: string }>;
};

/**
 * Book a visit.
 *
 * A walk-in or a phone call becomes a booking: the patient, the doctor, the
 * day and the slot. The token is issued when they arrive, not now.
 */
export function BookVisitDialog({
  open,
  onClose,
  onBook,
  doctors,
  days,
  slots,
}: BookVisitDialogProps) {
  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState(doctors[0]?.id ?? "");
  const [day, setDay] = useState(days[0]?.value ?? "");
  const [time, setTime] = useState(slots[0]?.value ?? "");
  const [reason, setReason] = useState("");

  const ready = patient.trim().length > 1 && doctor !== "" && day !== "" && time !== "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Book a visit"
      description="The token is issued when the patient arrives, not now."
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="check"
            disabled={!ready}
            onClick={() => {
              onBook({ patient, doctor, date: day, time, reason });
              onClose();
            }}
          >
            Book the visit
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="book-patient">Who is it for?</label>
        <Input
          id="book-patient"
          value={patient}
          placeholder="Kavya Nair"
          onChange={(event) => setPatient(event.target.value)}
        />
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="book-doctor">Which doctor?</label>
        <select
          id="book-doctor"
          className="input"
          value={doctor}
          onChange={(event) => setDoctor(event.target.value)}
        >
          {doctors.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} · {person.speciality}
            </option>
          ))}
        </select>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>Which day?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {days.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("chip", day === option.value && "on")}
              onClick={() => setDay(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>What time?</label>
        <div className="ff-slots">
          {slots.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("ff-slot", time === option.value && "on")}
              onClick={() => setTime(option.value)}
            >
              <b>{option.label}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="book-reason">Why are they coming?</label>
        <Input
          id="book-reason"
          value={reason}
          placeholder="Sore throat 3 days"
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </Dialog>
  );
}
