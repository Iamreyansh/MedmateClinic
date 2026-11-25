/**
 * The nurse station.
 *
 * The nurse is the one station that reads the whole clinic's queue rather
 * than one doctor's, so the nurse sees every patient who needs them. The
 * vitals the nurse records move the patient on — they appear in the doctor's
 * queue as ready.
 */

import { mock } from "@/services/api/mock/router";
import {
  doctors,
  patient,
  patients,
  visits,
  vitals,
  vitalsFor,
  type MockVisit,
  type MockVitals,
} from "@/services/api/mock/state";
import { requireSession } from "@/services/api/mock/guard";

/** The visit's priority, as the nurse station shows it. */
function priorityOf(visit: MockVisit): "normal" | "urgent" | "emergency" {
  if (visit.priority === "emergency") return "emergency";
  if (visit.priority === "urgent") return "urgent";
  return "normal";
}

/** How long the patient has been waiting, in minutes. */
function waitedMinutes(visit: MockVisit): number {
  if (visit.waitedMinutes !== null && visit.waitedMinutes !== undefined) return visit.waitedMinutes;
  const created = new Date(visit.createdAt).getTime();
  const now = new Date("2026-11-25T11:20:00Z").getTime();
  return Math.max(0, Math.round((now - created) / 60000));
}

/** The vitals as the nurse station sends them. */
function vitalsPayload(record: MockVitals | undefined) {
  if (!record) return null;
  const [systolic, diastolic] = (record.bp ?? "").split("/");
  return {
    id: record.id,
    visitId: record.visitId,
    recordedAt: record.recordedAt,
    tempF: record.tempF,
    bp: record.bp,
    bpSystolic: systolic ? Number(systolic) : null,
    bpDiastolic: diastolic ? Number(diastolic) : null,
    pulse: record.pulse,
    spo2: record.spo2,
    breathRate: record.breathRate,
    weightKg: record.weightKg,
    heightCm: record.heightCm,
    sugarMg: record.sugarMg,
    note: record.note,
    priority: (record.priority ?? "normal") as "normal" | "urgent" | "emergency",
    sentTo: record.sentTo,
    recordedBy: record.recordedBy,
  };
}

/** The number the nurse types, as a number. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function registerNurseRoutes() {
  mock.on("GET", "/clinic/nurse", () => {
    requireSession();

    // Everyone in the clinic today, not one doctor's queue.
    const todays = visits.filter((item) => item.status === "waiting" || item.status === "in_consult");

    const items = todays.map((item) => {
      const person = patient(item.patientId);
      const record = vitalsFor(item.id);
      const priority = priorityOf(item);

      return {
        id: item.id,
        visitId: item.id,
        token: item.token,
        reason: item.reason,
        detail: item.detail,
        priority,
        waitedMinutes: waitedMinutes(item),
        doctor: null,
        nextDoctor: doctors[0]
          ? {
              id: doctors[0].id,
              name: doctors[0].name,
              speciality: doctors[0].speciality,
              room: doctors[0].room,
            }
          : null,
        patient: {
          id: person.id,
          name: person.name,
          age: person.age,
          sex: person.sex,
          initials: person.initials,
          phone: person.phone,
        },
        vitals: vitalsPayload(record),
        ready: Boolean(record),
      };
    });

    const needVitals = items.filter((item) => !item.vitals).length;
    const urgent = items.filter((item) => item.priority !== "normal").length;
    const ready = items.filter((item) => item.ready).length;
    const waits = items.filter((item) => !item.vitals).map((item) => item.waitedMinutes);

    return {
      counts: {
        needVitals,
        urgent,
        ready,
        longestWait: waits.length ? Math.max(...waits) : null,
      },
      items,
      doctors: doctors.map((person) => ({
        id: person.id,
        name: person.name,
        speciality: person.speciality,
        room: person.room,
      })),
      meta: `${needVitals} waiting for vitals · ${ready} ready for the doctor`,
    };
  });

  mock.on("GET", "/clinic/nurse/doctors", () => {
    requireSession();
    return doctors.map((person) => ({
      id: person.id,
      name: person.name,
      speciality: person.speciality,
      room: person.room,
    }));
  });

  mock.on("POST", "/clinic/nurse/vitals", (body) => {
    requireSession();
    const request = body as Record<string, unknown>;
    const visitId = String(request.visitId ?? "");
    const visit = visits.find((item) => item.id === visitId);
    if (!visit) throw new Error("That patient is no longer waiting.");

    const systolic = toNumber(request.bpSystolic);
    const diastolic = toNumber(request.bpDiastolic);
    const priority = (request.priority ?? "normal") as "normal" | "urgent" | "emergency";

    const record: MockVitals = {
      id: `vt_${visitId}_${vitals.length + 1}`,
      visitId,
      recordedAt: new Date("2026-11-25T11:20:00Z").toISOString(),
      tempF: toNumber(request.tempF),
      bp: systolic !== null && diastolic !== null ? `${systolic}/${diastolic}` : null,
      pulse: toNumber(request.pulse),
      spo2: toNumber(request.spo2),
      weightKg: toNumber(request.weightKg),
      heightCm: toNumber(request.heightCm),
      sugarMg: toNumber(request.sugarMg),
      note: request.note ? String(request.note) : null,
      priority,
      breathRate: toNumber(request.breathRate),
      sentTo: request.sentTo ? String(request.sentTo) : null,
      recordedBy: "Mary Joseph",
    };

    // One set of vitals per visit — the newest reading replaces the old one.
    const existing = vitals.findIndex((item) => item.visitId === visitId);
    if (existing === -1) {
      vitals.push(record);
    } else {
      vitals[existing] = record;
    }

    // The patient is ready for the doctor now.
    visit.priority = priority;
    visit.detail =
      record.tempF !== null ? `Temp ${record.tempF} °F · SpO₂ ${record.spo2}%` : visit.detail;

    return {
      visitId,
      token: visit.token,
      patient: patient(visit.patientId).name,
      vitals: vitalsPayload(record),
      ready: true,
    };
  });

  // The nurse's patients, for the consult's own list.
  mock.on("GET", "/clinic/nurse/patients", () => {
    requireSession();
    return patients.map((person) => ({
      id: person.id,
      name: person.name,
      age: person.age,
      sex: person.sex,
      initials: person.initials,
      phone: person.phone,
    }));
  });
}
