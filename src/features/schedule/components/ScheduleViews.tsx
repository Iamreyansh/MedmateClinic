import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Appointment } from "@/features/schedule/types";

/** The day's bookings, one row each. */
export function DayList({
  appointments,
  selected,
  onSelect,
}: {
  appointments: Appointment[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  if (appointments.length === 0) {
    return (
      <section className="card" style={{ padding: 18 }}>
        <b style={{ fontSize: 15 }}>Nothing booked</b>
        <p className="t-cap" style={{ marginTop: 4 }}>
          Nobody is booked for this day. A patient can still walk in and be checked in at the desk.
        </p>
      </section>
    );
  }

  return (
    <div className="ap-list">
      {appointments.map((appointment) => (
        <div
          className={cn("ap-row", appointment.id === selected && "sel", appointment.status === "no_show" && "late")}
          key={appointment.id}
        >
          <button type="button" className="ap-main" onClick={() => onSelect(appointment.id)}>
            <span className="ap-time">{appointment.time}</span>
            <span>
              <b className="t-title">
                {appointment.patient.name} · {appointment.patient.age} {appointment.patient.sex}
              </b>
              <span className="ap-sub t-cap">{appointment.reason}</span>
              <span className="ap-tags">
                <span className={cn("badge", appointment.mode === "online" ? "blue" : "plain")}>
                  {appointment.mode === "online" ? "Online" : "In clinic"}
                </span>
                <span className={cn("badge", statusTone(appointment.status))}>
                  {statusLabel(appointment.status)}
                </span>
              </span>
            </span>
          </button>
          <div className="ap-acts">
            <Button size="sm" variant="secondary">
              Call
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The week, a column a day. */
export function WeekGrid({
  days,
  selected,
  onSelect,
}: {
  days: Array<{ date: string; label: string; appointments: Appointment[] }>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  if (days.length === 0) {
    return (
      <section className="card" style={{ padding: 18 }}>
        <b style={{ fontSize: 15 }}>Nothing booked this week</b>
      </section>
    );
  }

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, gap: 12 }}
    >
      {days.map((day) => (
        <section className="card" key={day.date} style={{ padding: 14 }}>
          <div className="t-eyebrow">{day.label}</div>
          <div className="ap-list" style={{ marginTop: 8 }}>
            {day.appointments.length === 0 ? (
              <p className="t-cap">Nothing</p>
            ) : (
              day.appointments.map((appointment) => (
                <button
                  type="button"
                  key={appointment.id}
                  className={cn("ap-row", appointment.id === selected && "sel")}
                  onClick={() => onSelect(appointment.id)}
                >
                  <span className="ap-time">{appointment.time}</span>
                  <span>
                    <b className="t-title">{appointment.patient.name}</b>
                    <span className="ap-sub t-cap">{appointment.reason}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "booked") return "Booked";
  if (status === "checked_in") return "Checked in";
  if (status === "in_consult") return "In consult";
  if (status === "done") return "Done";
  if (status === "no_show") return "Did not come";
  return status;
}

function statusTone(status: string) {
  if (status === "done" || status === "in_consult") return "mint";
  if (status === "no_show") return "red";
  if (status === "checked_in") return "blue";
  return "gold";
}
