/**
 * The lab and diagnostics bench.
 *
 * A doctor signs a prescription with tests, and the samples land here. The
 * technician collects them, works them up, and sends the results back — a
 * result out of range is flagged before it goes, so the doctor sees it
 * flagged when it arrives.
 */

import { mock } from "@/services/api/mock/router";
import {
  doctors,
  labOrders,
  patient,
  type MockLabOrder,
} from "@/services/api/mock/state";
import { requireSession } from "@/services/api/mock/guard";

/** The partner labs the clinic sends samples to. */
const PARTNERS = ["Tenet Diagnostics", "MediDocs"];

/**
 * Is the value out of range?
 *
 * The technician's flag is a clinical judgement and the range is arithmetic,
 * so the range decides: a value outside it is abnormal whichever way the
 * flag was ticked. A result with no range keeps the flag it was given.
 */
function isAbnormal(value: string | null, reference: string | null, flagged: boolean): boolean {
  const reading = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(reading)) return flagged;
  const bounds = String(reference ?? "").match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (!bounds) return flagged;
  const low = Number(bounds[1]);
  const high = Number(bounds[2]);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return flagged;
  return reading < low || reading > high;
}

/** The order as the lab sends it. */
function orderPayload(order: MockLabOrder) {
  const person = patient(order.patientId);
  const doctor = doctors.find((entry) => entry.id === order.orderedBy) ?? null;
  const abnormal = isAbnormal(order.value, order.reference, order.abnormal);

  return {
    id: order.id,
    visitId: order.visitId,
    patient: {
      id: person.id,
      name: person.name,
      age: person.age,
      sex: person.sex,
      initials: person.initials,
      phone: person.phone,
    },
    test: order.testName,
    status: order.status,
    sampleNo: order.sampleNo,
    partner: order.partner,
    orderedBy: doctor
      ? { id: doctor.id, name: doctor.name, speciality: doctor.speciality }
      : null,
    collectedAt: order.collectedAt,
    reportedAt: order.reportedAt,
    value: order.value,
    reference: order.reference,
    abnormal,
    critical: order.critical,
    note: order.note,
  };
}

/** The next sample number, as the tubes are printed. */
function nextSampleNo(): string {
  const highest = labOrders.reduce((max, order) => {
    const number = Number((order.sampleNo ?? "").replace(/[^0-9]/g, ""));
    return Number.isFinite(number) && number > max ? number : max;
  }, 2040);
  return `S-${highest + 1}`;
}

export function registerLabRoutes() {
  mock.on("GET", "/clinic/lab", () => {
    requireSession();

    const open = labOrders.filter((order) => order.status !== "reported");
    const reported = labOrders.filter((order) => order.status === "reported");
    const openPayload = open.map(orderPayload);
    // Newest first, the way the service pages them: today's results sit at
    // the top of the "Reported today" tab, not at the bottom of three months.
    // A list that is ordered wrongly reads as a list that is missing.
    const reportedPayload = reported
      .slice()
      .sort((a, b) => String(b.reportedAt ?? "").localeCompare(String(a.reportedAt ?? "")))
      .map(orderPayload);

    return {
      counts: {
        toCollect: open.filter((order) => order.status === "to_collect").length,
        inLab: open.filter((order) => order.status === "in_lab").length,
        sentOut: open.filter((order) => order.status === "sent_out").length,
        reportedToday: reported.length,
        // The count is made over every reported result, not over the page in
        // front of the technician: the same rule the per-row flag uses, so
        // the two cannot drift apart.
        abnormalToday: reported.filter((order) => order.abnormal).length,
      },
      // An order that has been written but not collected is still on the
      // bench — it must not vanish between the doctor and the technician.
      open: openPayload,
      reported: reportedPayload,
      partners: PARTNERS,
      meta: `${open.length} on the bench · ${reported.length} reported today`,
    };
  });

  mock.on("POST", "/clinic/lab/results", (body) => {
    requireSession();
    const request = body as Record<string, unknown>;
    const orderId = String(request.orderId ?? "");
    const order = labOrders.find((entry) => entry.id === orderId);
    if (!order) throw new Error("That order is no longer on the bench.");

    const value = String(request.value ?? "");
    const reference = String(request.reference ?? "");
    const abnormal = Boolean(request.abnormal);
    const critical = Boolean(request.critical);
    const note = request.note ? String(request.note) : null;

    order.status = "reported";
    order.value = value;
    order.reference = reference;
    order.abnormal = abnormal;
    order.critical = critical;
    order.note = note;
    order.reportedAt = new Date("2026-11-25T11:35:00Z").toISOString();

    return {
      orderId,
      test: order.testName,
      patient: patient(order.patientId).name,
      value,
      reference,
      abnormal,
      critical,
      reportedAt: order.reportedAt,
    };
  });

  mock.on("POST", "/clinic/lab/orders/:orderId", (body, context) => {
    requireSession();
    const orderId = context.params.orderId;
    const order = labOrders.find((entry) => entry.id === orderId);
    if (!order) throw new Error("That order is no longer on the bench.");

    const request = (body ?? {}) as Record<string, unknown>;
    const status = String(request.status ?? order.status);
    const partner = request.partner ? String(request.partner) : null;

    order.status = status;
    if (partner) order.partner = partner;

    // A collected sample gets its tube number.
    if (status === "in_lab" && !order.sampleNo) {
      order.sampleNo = nextSampleNo();
      order.collectedAt = new Date("2026-11-25T11:30:00Z").toISOString();
    }

    return { orderId, status: order.status, partner: order.partner };
  });
}
