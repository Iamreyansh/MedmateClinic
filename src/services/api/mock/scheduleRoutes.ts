/**
 * The appointment book.
 *
 * A day at a time for the front desk, a week for the owner. The same
 * endpoint serves both.
 */

import { mock } from "@/services/api/mock/router";
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
    .filter((item) => item.startsAt.startsWith(day))
    .map((item) => {
      const person = patients.find((entry) => entry.id === item.patientId) ?? patients[0];
      const doctor = doctors.find((entry) => entry.id === item.doctorId);
      return {
        id: item.id,
        mode: item.mode,
        status: item.status,
        reason: item.source === "booking" ? "Booked visit" : "Walk-in",
        startsAt: item.startsAt,
        time: item.startsAt.slice(11, 16),
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

export function registerScheduleRoutes() {
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
        days.push({
          date: key,
          label: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", timeZone: "UTC" }),
          appointments: onDay(key),
        });
      }
      return {
        view: "week",
        days,
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
        slots.push({ time: label, label, minutes: Date.parse(`${date}T${label}:00Z`) });
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

    const startsAt = `${request.date ?? "2026-11-25"}T${request.time ?? "10:00"}:00Z`;
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
