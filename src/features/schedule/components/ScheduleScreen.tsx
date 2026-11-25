import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { fetchAppointments } from "@/features/schedule/api/schedule";
import { DayList, WeekGrid } from "@/features/schedule/components/ScheduleViews";
import { BookVisitDialog } from "@/features/schedule/components/BookVisitDialog";
import { bookAppointment } from "@/features/schedule/api/schedule";
import type { AppointmentsPayload } from "@/features/schedule/types";

function iso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays(date: Date, by: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + by);
  return next;
}

/**
 * The appointment book.
 *
 * The front desk works a day at a time; the owner looks at the week. The same
 * endpoint serves both, so the screen only changes which one it asks for.
 */
export function ScheduleScreen() {
  const [payload, setPayload] = useState<AppointmentsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState(() => iso(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  // the booking being made
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAppointments({ view, date })
      .then((data) => {
        if (alive) setPayload(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the appointments");
      });
    return () => {
      alive = false;
    };
  }, [view, date]);

  const summary = payload?.summary;
  const appointments = payload?.appointments ?? [];
  const days = payload?.days ?? [];

  const move = (by: number) => {
    setDate(iso(shiftDays(new Date(date), by)));
  };

  return (
    <AppShell activeHref="/schedule">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">Appointments</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {payload?.dateLabel ?? "The day's bookings, the working hours and the follow-ups."}
          </p>
        </div>
        <div className="nq-btns">
          <Button variant="secondary" icon="plus" onClick={() => setBooking(true)}>
            Book a visit
          </Button>
          <Button icon="print">Print the list</Button>
        </div>
      </div>

      {error ? <div className="note red">{error}</div> : null}

      <div className="bl-bar">
        <div className="bl-day">
          <Button size="sm" variant="secondary" icon="back" onClick={() => move(view === "week" ? -7 : -1)}>
            <span style={{ position: "absolute", overflow: "hidden", clip: "rect(0 0 0 0)" }}>Back</span>
          </Button>
          <b>{payload?.dateLabel ?? date}</b>
          <Button size="sm" variant="secondary" icon="chev" onClick={() => move(view === "week" ? 7 : 1)}>
            <span style={{ position: "absolute", overflow: "hidden", clip: "rect(0 0 0 0)" }}>Forward</span>
          </Button>
        </div>

        <div className="seg tabs" style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 240 }}>
          <button type="button" className={cn(view === "day" && "on")} onClick={() => setView("day")}>
            Day
          </button>
          <button type="button" className={cn(view === "week" && "on")} onClick={() => setView("week")}>
            Week
          </button>
        </div>
      </div>

      <div className="ap-counts">
        <span>
          <b>{summary?.booked ?? 0}</b> booked
        </span>
        <span className="here">
          <b>{summary?.toCome ?? 0}</b> still to come
        </span>
        <span>
          <b>{summary?.done ?? 0}</b> done
        </span>
        <span className="late">
          <b>{summary?.noShow ?? 0}</b> did not come
        </span>
      </div>

      {view === "day" ? (
        <DayList appointments={appointments} selected={selected} onSelect={setSelected} />
      ) : (
        <WeekGrid days={days} selected={selected} onSelect={setSelected} />
      )}

      <BookVisitDialog
        open={booking}
        onClose={() => setBooking(false)}
        doctors={payload?.doctors ?? []}
        days={dayChoices()}
        slots={slotChoices()}
        onBook={(entry) => {
          void bookAppointment(entry).then(() => {
            void fetchAppointments({ view, date }).then(setPayload);
          });
        }}
      />
    </AppShell>
  );
}

/** The next seven days, for the booking dialog. */
function dayChoices() {
  const choices: Array<{ value: string; label: string }> = [];
  const start = new Date();
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(start);
    day.setDate(day.getDate() + offset);
    choices.push({
      value: iso(day),
      label:
        offset === 0
          ? "Today"
          : day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
    });
  }
  return choices;
}

/** The morning slots the clinic runs. */
function slotChoices() {
  const slots: Array<{ value: string; label: string }> = [];
  for (const hour of [9, 10, 11, 12, 16, 17, 18]) {
    for (const minute of [0, 30]) {
      if (hour === 12 && minute === 30) continue;
      const label = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push({ value: label, label });
    }
  }
  return slots;
}
