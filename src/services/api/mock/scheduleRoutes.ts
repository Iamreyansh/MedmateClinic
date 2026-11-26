/**
 * The appointment book.
 *
 * A day at a time for the front desk, a week for the owner. The same
 * endpoint serves both.
 */

import { mock } from "@/services/api/mock/router";
import { clinicInstant, clinicLocal, clinicTimeOf } from "@/services/api/mock/clinicClock";
import { appointments, doctors, patients } from "@/services/api/mock/state";
import { requireSession } from "@/services/api/mock/guard";

/** The doctor cards the screen offers. */
function doctorCards() {
  return doctors.map((person) => ({
    id: person.id,
    name: person.name,
    speciality: person.speciality,
    room: person.room,
  }));
}

/** The appointments on one day. */
function onDay(day: string) {
  return appointments
    // the day is the clinic's day: an instant at 04:30Z is ten o'clock on
    // the clinic's wall, and it belongs to that day
    .filter((item) => clinicLocal(item.startsAt).day === day)
    .map((item) => {
      const person = patients.find((entry) => entry.id === item.patientId) ?? patients[0];
      const doctor = doctors.find((entry) => entry.id === item.doctorId);
      return {
        id: item.id,
        mode: item.mode,
        status: item.status,
        reason: item.source === "booking" ? "Booked visit" : "Walk-in",
        startsAt: item.startsAt,
        // the label is the clinic's own clock, beside the instant
        time: clinicTimeOf(item.startsAt),
        doctorId: item.doctorId,
        doctor: doctor ? doctor.name : "Any doctor",
        patient: {
          id: person.id,
          name: person.name,
          age: person.age,
          sex: person.sex,
          phone: person.phone,
        },
      };
    });
}

type DayItem = ReturnType<typeof onDay>[number];

function summaryFor(list: DayItem[]) {
  return {
    booked: list.length,
    toCome: list.filter((item) => item.status === "booked").length,
    done: list.filter((item) => ["done", "checked_in", "in_consult"].includes(item.status)).length,
    noShow: list.filter((item) => item.status === "no_show").length,
  };
}

/** How many slots a doctor has in a day. */
const SLOTS_PER_DAY = 10;

/** The days of a range, as yyyy-mm-dd. */
function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

export function registerScheduleRoutes() {
  /**
   * The days ahead, and how free each doctor is on each of them.
   *
   * The strip of days at the top of the book reads this: a day, and what is
   * still free in each doctor's diary.
   */
  mock.on("GET", "/clinic/appointments/summary", (_body, context) => {
    requireSession();
    const from = context.query.get("from") ?? "2026-11-25";
    const to = context.query.get("to") ?? "2026-11-25";
    const days = daysBetween(from, to).map((date) => {
      const booked = appointments.filter((item) => clinicLocal(item.startsAt).day === date);
      return {
        date,
        freeByDoctor: doctors.map((doctor) => {
          const taken = booked.filter((item) => item.doctorId === doctor.id).length;
          return {
            doctorId: doctor.id,
            name: doctor.name,
            free: Math.max(0, SLOTS_PER_DAY - taken),
            booked: taken,
          };
        }),
      };
    });
    return { days };
  });

  mock.on("GET", "/clinic/appointments", (_body, context) => {
    requireSession();
    const query = context.query;
    const view = query.get("view") ?? "day";
    const date = query.get("date") ?? "2026-11-25";

    if (view === "week") {
      const start = new Date(`${date}T00:00:00Z`);
      const days = [];
      for (let offset = 0; offset < 7; offset += 1) {
        const day = new Date(start);
        day.setUTCDate(day.getUTCDate() + offset);
        const key = day.toISOString().slice(0, 10);
        const column = onDay(key);
        days.push({
          date: key,
          label: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", timeZone: "UTC" }),
          dayName: day.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
          booked: column.length,
          isToday: key === "2026-11-25",
          appointments: column,
          items: column,
        });
      }
      return {
        view: "week",
        from: days[0]?.date ?? "",
        to: days[days.length - 1]?.date ?? "",
        days,
        appointments: days,
        items: days,
        summary: summaryFor(days.flatMap((day) => day.appointments)),
        doctors: doctorCards(),
        today: "2026-11-25",
      };
    }

    const list = onDay(date);
    const slots = [];
    for (let hour = 9; hour < 20; hour += 1) {
      for (const minute of [0, 30]) {
        const label = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        // the slot's moment is the clinic's own: ten o'clock there is ten
        // o'clock there
        slots.push({ time: label, label, minutes: Date.parse(clinicInstant(date, label)) });
      }
    }

    return {
      view: "day",
      date,
      dateLabel: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      dayStart: "09:00",
      dayEnd: "20:00",
      slotMinutes: 30,
      slots,
      appointments: list,
      items: list,
      summary: summaryFor(list),
      doctors: doctorCards(),
      today: "2026-11-25",
    };
  });

  mock.on("POST", "/clinic/appointments", (body) => {
    requireSession();
    const request = body as {
      patient?: string;
      doctor?: string;
      date?: string;
      time?: string;
      reason?: string;
    };

    const name = (request.patient ?? "").trim();
    if (!name) throw new Error("the patient is needed");

    // A booking often comes before the first visit, so the patient is created
    // if the clinic has not met them yet.
    let person = patients.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
    if (!person) {
      const id = `pt_${name.toLowerCase().replace(/[^a-z]+/g, "_")}`;
      person = {
        id,
        name,
        age: 30,
        sex: "F",
        initials: name
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join(""),
        phone: "",
        abha: "",
        allergies: [],
        conditions: [],
        visits: 0,
        since: "2026",
      };
      patients.push(person);
    }

    const startsAt = clinicInstant(request.date ?? "2026-11-25", request.time ?? "10:00");
    const appointment = {
      id: `ap_${appointments.length + 1}`,
      visitId: null,
      patientId: person.id,
      doctorId: request.doctor ?? doctors[0].id,
      startsAt,
      mode: "in_clinic",
      status: "booked",
      source: "booking",
    };
    appointments.push(appointment);

    return {
      id: appointment.id,
      status: appointment.status,
      startsAt,
      patient: person.name,
      doctor: doctors.find((entry) => entry.id === appointment.doctorId)?.name ?? "Any doctor",
    };
  });
}
