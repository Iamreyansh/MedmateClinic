import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export type CheckInDetails = {
  name: string;
  age: string;
  sex: string;
  phone: string;
  reason: string;
  mode: string;
  doctor: string;
};

export type CheckInPatientDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with what the front desk typed. */
  onCheckIn: (details: CheckInDetails) => void;
  /** The doctors the patient can be sent to. */
  doctors: Array<{ id: string; name: string; speciality: string }>;
};

/** How the visit is going to happen. */
const MODES = [
  { value: "clinic", label: "In clinic" },
  { value: "online", label: "Online" },
];

/**
 * Check a patient in.
 *
 * The front desk does this at the counter, and the kiosk does it on the tablet.
 * A patient who walks in without an appointment gets a token here and goes
 * into the queue.
 */
export function CheckInPatientDialog({ open, onClose, onCheckIn, doctors }: CheckInPatientDialogProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("F");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState("clinic");
  const [doctor, setDoctor] = useState(doctors[0]?.id ?? "");

  const ready = name.trim().length > 1 && Number(age) > 0 && doctor !== "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Check in a patient"
      description="A walk-in gets a token and goes into the queue."
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
              onCheckIn({ name, age, sex, phone, reason, mode, doctor });
              onClose();
            }}
          >
            Check in
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="checkin-name">Name</label>
        <Input
          id="checkin-name"
          value={name}
          placeholder="Kavya Nair"
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="grid2" style={{ marginBottom: 12 }}>
        <div className="field">
          <label htmlFor="checkin-age">Age</label>
          <Input
            id="checkin-age"
            value={age}
            inputMode="numeric"
            placeholder="34"
            onChange={(event) => setAge(event.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="field">
          <label htmlFor="checkin-sex">Sex</label>
          <select
            id="checkin-sex"
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

      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="checkin-phone">Mobile</label>
        <Input
          id="checkin-phone"
          value={phone}
          inputMode="numeric"
          placeholder="98450 01122"
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
        />
        <p className="t-cap" style={{ marginTop: 4 }}>
          The mobile is masked in the patient list. It is used for reminders only.
        </p>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="checkin-reason">Reason for the visit</label>
        <Input
          id="checkin-reason"
          value={reason}
          placeholder="Sore throat 3 days"
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label>How is the visit?</label>
        <div className="chips" style={{ marginTop: 6 }}>
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("chip", mode === option.value && "on")}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="checkin-doctor">Which doctor?</label>
        <select
          id="checkin-doctor"
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
    </Dialog>
  );
}
