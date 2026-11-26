/**
 * The desk and the till.
 *
 * They are together because they are the same thing seen from two sides: the
 * desk hands the patient over, and the till takes the money for it.
 */

import { mock } from "@/services/api/mock/router";
import {
  invoices,
  labOrders,
  patients,
  prescriptions,
  visits,
  type MockInvoice,
} from "@/services/api/mock/state";
import { requireSession } from "@/services/api/mock/guard";

/** The patient a visit belongs to. */
function patientByVisit(visitId: string) {
  const visit = visits.find((item) => item.id === visitId);
  if (!visit) return patients[0];
  return patients.find((person) => person.id === visit.patientId) ?? patients[0];
}

/** The visit with this id. */
function visitFor(visitId: string) {
  return visits.find((item) => item.id === visitId);
}

/** The bill of supply, as it prints. */
export function billCard(bill: MockInvoice | undefined) {
  if (!bill) return null;
  const person = patientByVisit(bill.visitId);

  return {
    id: bill.id,
    number: bill.number,
    prefix: bill.prefix,
    fy: "2026-27",
    status: bill.status,
    payMode: bill.payMode,
    paidAt: bill.paidAt,
    createdAt: bill.createdAt ?? "2026-11-25T11:05:00Z",
    patient: {
      id: person.id,
      name: person.name,
      age: person.age,
      sex: person.sex,
      phone: person.phone,
    },
    doctor: {
      name: "Dr. Ananya Rao",
      registration: "Reg. KMC 84213",
      speciality: "General Medicine",
    },
    token: visitFor(bill.visitId)?.token ?? null,
    clinic: {
      name: "MedMate Clinic",
      address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
      phone: "080 4123 4567",
      gstin: "29AAJCM4821K1Z7",
      registration: "KPME/BLR/2024/01873",
      hfr: "IN2910000123",
    },
    placeOfSupply: "Karnataka (29)",
    lines: bill.lines && bill.lines.length > 0
      ? bill.lines.map((line) => ({
          name: line.name,
          description: line.description ?? line.name,
          sac: "992312",
          gstRate: "0%",
          gstAmount: 0,
          amount: line.amount,
        }))
      : [
          {
            name: "Consultation in-clinic",
            description: "Consultation fee",
            sac: "999313",
            gstRate: "0%",
            gstAmount: 0,
            amount: bill.total,
          },
        ],
    subtotal: bill.total + (bill.discount ?? 0),
    discount: bill.discount ?? 0,
    gst: 0,
    total: bill.total,
    totalInWords: "Five hundred rupees only",
    exemptNote: "Healthcare services are exempt from GST.",
    timeline: [
      { text: "Bill created", at: "2026-11-25T11:05:00Z" },
      ...(bill.paidAt ? [{ text: "Paid", at: bill.paidAt }] : []),
    ],
  };
}

/** The reception desk: who is waiting to be handed over. */
export function registerDeskRoutes() {
  mock.on("GET", "/clinic/desk", () => {
    requireSession();
    // Every visit of today — including the ones already handed over, so the
    // desk can say how many are done.
    const todays = visits.filter(
      (item) =>
        item.status === "waiting" ||
        item.status === "in_consult" ||
        item.status === "done",
    );

    const items = todays.map((item) => {
      const person = patientByVisit(item.id);
      const invoice = invoices.find((bill) => bill.visitId === item.id) ?? null;
      const prescription = prescriptions.find((row) => row.visitId === item.id) ?? null;
      const lab = labOrders.filter((order) => order.visitId === item.id);

      return {
        id: item.id,
        visitId: item.id,
        token: item.token,
        kind: item.token.startsWith("A") ? "A" : "B",
        state: prescription ? "toHandOver" : "waiting",
        status: item.status,
        reason: item.reason,
        waitedMinutes: item.waitedMinutes,
        checkedOut: item.status === "done",
        patient: {
          id: person.id,
          name: person.name,
          age: person.age,
          sex: person.sex,
          initials: person.initials,
          phone: person.phone,
        },
        prescription: prescription
          ? { id: prescription.id, status: prescription.status, signedAt: prescription.signedAt }
          : { status: "none" },
        payment: invoice
          ? {
              invoiceId: invoice.id,
              number: invoice.number,
              status: invoice.status,
              amount: invoice.total,
              payMode: invoice.payMode,
            }
          : { status: "none", amount: 0 },
        followUp: item.id === "vs_kavya"
          ? {
              id: `fu_${item.id}`,
              startsAt: "2026-11-30T10:00:00Z",
              mode: "in_clinic",
              status: "booked",
              label: "Mon, 30 Nov",
            }
          : null,
        lab: lab.length
          ? {
              id: lab[0].id,
              name: lab[0].testName,
              status: lab[0].status,
              count: lab.length,
              label: lab[0].testName + (lab.length > 1 ? ` +${lab.length - 1} sample` : " sample"),
            }
          : null,
      };
    });

    return {
      counts: {
        toHandOver: items.filter((item) => item.state === "toHandOver").length,
        waiting: items.filter((item) => item.state === "waiting").length,
        doneToday: items.filter((item) => item.checkedOut).length,
      },
      invoice: null,
      lines: [],
      gst: 0,
      visits: items,
      // the line under the title: a label to show, and the note itself
      meta: {
        label: `${items.length} in the clinic · ${items.filter((item) => item.state === "toHandOver").length} to hand over`,
        note: "Oldest first. Each patient is handed over with the prescription, the bill and the follow-up.",
      },
    };
  });

  mock.on("POST", "/clinic/desk/:visitId/checkout", (_body, context) => {
    requireSession();
    const visitId = context.params.visitId;
    const visit = visits.find((item) => item.id === visitId);
    if (!visit) throw new Error(`no visit ${visitId}`);

    visit.status = "done";
    const invoice = invoices.find((bill) => bill.visitId === visitId) ?? null;

    return {
      visitId,
      checkedOut: true,
      invoice: invoice
        ? { id: invoice.id, number: invoice.number, total: invoice.total }
        : undefined,
    };
  });

  mock.on("GET", "/clinic/desk/booking-link", () => {
    requireSession();
    return {
      link: "https://medmate.in/book?clinic=medmate-clinic",
      slug: "medmate-clinic",
      clinic: "MedMate Clinic",
      channels: ["sms", "whatsapp", "copy"],
    };
  });
}
