import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { recordVitals } from "@/features/nurse/api/nurse";
import {
  readVital,
  VITAL_RANGES,
  type NurseDoctor,
  type NurseItem,
  type NursePriority,
} from "@/features/nurse/types";

export type TakeVitalsDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The patient the nurse is taking the vitals of. */
  item: NurseItem | null;
  /** The doctors the patient can be sent to. */
  doctors: NurseDoctor[];
  /** Called after the vitals are saved. */
  onSaved: () => void;
};

/** One reading the nurse types. */
type Field = {
  key: string;
  label: string;
  unit: string;
  placeholder: string;
};

const FIELDS: Field[] = [
  { key: "tempF", label: "Temperature", unit: "°F", placeholder: "98.6" },
  { key: "pulse", label: "Pulse", unit: "/min", placeholder: "72" },
  { key: "spo2", label: "SpO₂", unit: "%", placeholder: "98" },
  { key: "bpSystolic", label: "BP systolic", unit: "mmHg", placeholder: "120" },
  { key: "bpDiastolic", label: "BP diastolic", unit: "mmHg", placeholder: "80" },
  { key: "breathRate", label: "Breathing rate", unit: "/min", placeholder: "16" },
  { key: "weightKg", label: "Weight", unit: "kg", placeholder: "62" },
  { key: "heightCm", label: "Height", unit: "cm", placeholder: "158" },
  { key: "sugarMg", label: "Random sugar", unit: "mg/dL", placeholder: "92" },
];

const PRIORITIES: Array<{ value: NursePriority; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

/**
 * Take the vitals.
 *
 * Every field prints the range it is read against, so the nurse sees a number
 * out of range while typing rather than after saving. Saving marks the patient
 * ready for the doctor and sends them to one.
 */
export function TakeVitalsDialog({ open, onClose, item, doctors, onSaved }: TakeVitalsDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState<NursePriority>("normal");
  const [sentTo, setSentTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open || !item) return null;

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  /** The number in a field, read against its range. */
  const reading = (key: string) => {
    const raw = values[key];
    if (raw === undefined || raw.trim() === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  /** The fields the nurse has filled in. */
  const filled = FIELDS.filter((field) => values[field.key]?.trim());

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await recordVitals({
        visitId: item.visitId,
        tempF: values.tempF ?? "",
        pulse: values.pulse ?? "",
        spo2: values.spo2 ?? "",
        bpSystolic: values.bpSystolic ?? "",
        bpDiastolic: values.bpDiastolic ?? "",
        breathRate: values.breathRate ?? "",
        weightKg: values.weightKg ?? "",
        heightCm: values.heightCm ?? "",
        sugarMg: values.sugarMg ?? "",
        priority,
        sentTo,
        note,
      });
      setValues({});
      setPriority("normal");
      setSentTo("");
      setNote("");
      onSaved();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not save the vitals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Take vitals"
      description={`${item.patient.name} · ${item.patient.age} ${item.patient.sex} · ${item.token}`}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="check" disabled={saving || filled.length === 0} onClick={() => void save()}>
            {saving ? "Saving…" : "Save and send to the doctor"}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="note red" style={{ marginBottom: 14 }}>
          <Icon name="alert" size={18} />
          <div>{error}</div>
        </div>
      ) : null}

      <div className="grid2">
        <div>
          {FIELDS.map((field) => {
            const state = readVital(field.key, reading(field.key));
            return (
              <div className="field" key={field.key}>
                <label htmlFor={`vital-${field.key}`}>
                  {field.label} ({field.unit})
                </label>
                <Input
                  id={`vital-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  placeholder={field.placeholder}
                  invalid={state === "danger"}
                  value={values[field.key] ?? ""}
                  onChange={(event) => set(field.key, event.target.value)}
                />
                <span
                  className={cn(
                    "t-cap",
                    (state === "high" || state === "low") && "lv high",
                    state === "danger" && "lv danger",
                  )}
                  style={{ fontSize: 11.5 }}
                >
                  {state === "danger"
                    ? `Outside the safe range · ${VITAL_RANGES[field.key]}`
                    : state === "high"
                      ? `Above the range · ${VITAL_RANGES[field.key]}`
                      : state === "low"
                        ? `Below the range · ${VITAL_RANGES[field.key]}`
                        : VITAL_RANGES[field.key]}
                </span>
              </div>
            );
          })}
        </div>

        <div>
          <div className="field">
            <label htmlFor="vital-priority">Priority</label>
            <div className="seg prio" role="group" aria-label="Priority" style={{ marginTop: 0 }}>
              {PRIORITIES.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  aria-pressed={priority === entry.value}
                  className={cn(priority === entry.value && "on", "prio-sel", entry.value)}
                  onClick={() => setPriority(entry.value)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="vital-doctor">Send to</label>
            <select
              id="vital-doctor"
              className="input"
              value={sentTo}
              onChange={(event) => setSentTo(event.target.value)}
            >
              <option value="">The next doctor available</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} · {doctor.room}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="vital-note">Note for the doctor</label>
            <TextArea
              id="vital-note"
              rows={4}
              placeholder="Anything the doctor should know."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <div className="note mint" style={{ marginTop: 14 }}>
            <Icon name="check" size={18} />
            <div>
              Saving marks {item.patient.name} ready for the doctor, and they leave the nurse&rsquo;s list.
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
