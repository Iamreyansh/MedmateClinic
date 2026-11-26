/**
 * The till.
 *
 * What has been collected today, what is still to collect, and the bill of
 * supply that prints for the patient.
 */

import { mock } from "@/services/api/mock/router";
import { invoices, patients, visits } from "@/services/api/mock/state";
import { requireSession } from "@/services/api/mock/guard";
import { billCard } from "@/services/api/mock/deskRoutes";

/** The patient a visit belongs to. */
function patientByVisit(visitId: string) {
  const visit = visits.find((item) => item.id === visitId);
  if (!visit) return patients[0];
  return patients.find((person) => person.id === visit.patientId) ?? patients[0];
}

export function registerBillingRoutes() {
  mock.on("GET", "/clinic/billing", (_body, context) => {
    requireSession();
    const from = context.query.get("from");
    const to = context.query.get("to");
    const status = context.query.get("status");
    const mode = context.query.get("mode");
    const limit = Math.min(200, Math.max(1, Number(context.query.get("limit") ?? 50)));
    const offset = Math.max(0, Number(context.query.get("offset") ?? 0));

    const paid = invoices.filter((bill) => bill.status === "paid");
    const pending = invoices.filter((bill) => bill.status !== "paid" && bill.status !== "refunded");
    const refunded = invoices.filter((bill) => bill.status === "refunded");

    const collected = paid.reduce((sum, bill) => sum + bill.total, 0);
    const pendingAmount = pending.reduce((sum, bill) => sum + bill.total, 0);
    const refundAmount = refunded.reduce((sum, bill) => sum + bill.total, 0);

    const byMode = ["cash", "upi", "card"].map((mode) => {
      const bills = paid.filter((bill) => bill.payMode === mode);
      return {
        mode,
        label: mode === "upi" ? "UPI" : mode === "card" ? "Card" : "Cash",
        amount: bills.reduce((sum, bill) => sum + bill.total, 0),
        bills: bills.length,
      };
    });

    // The money still to collect is its own row — the till shows four bars,
    // the last one being what has not come in yet.
    byMode.push({
      mode: "pending",
      label: "Pending",
      amount: pendingAmount,
      bills: pending.length,
    });

    // The service filters and pages the bills: a range of days, a status, a
    // payment mode. No range at all means every bill the clinic has.
    const statusOf = (bill: (typeof invoices)[number]) =>
      bill.status === "paid" ? "paid" : bill.status === "refunded" ? "refunded" : "to_collect";
    const inRange = (bill: (typeof invoices)[number]) => {
      const created = bill.createdAt ?? "";
      if (from && !created.startsWith(from)) return false;
      if (to && !created.startsWith(to)) return false;
      return true;
    };
    const everyBill = [...paid, ...pending, ...refunded]
      .filter(inRange)
      .filter((bill) => (status ? statusOf(bill) === status : true))
      .filter((bill) => (mode ? bill.payMode === mode : true));
    const page = everyBill.slice(offset, offset + limit);
    const bills = page.map((bill) => {
      const person = patientByVisit(bill.visitId);
      return {
        invoiceId: bill.id,
        number: bill.number,
        amount: bill.total,
        status: bill.status,
        payMode: bill.payMode,
        paidAt: bill.paidAt,
        createdAt: bill.createdAt ?? null,
        description: "Consultation in-clinic",
        patient: {
          id: person.id,
          name: person.name,
          age: person.age,
          sex: person.sex,
          phone: person.phone,
        },
      };
    });

    const pendingItems = pending.map((bill) => {
      const person = patientByVisit(bill.visitId);
      return {
        invoiceId: bill.id,
        number: bill.number,
        amount: bill.total,
        createdAt: bill.createdAt ?? null,
        patient: {
          id: person.id,
          name: person.name,
          age: person.age,
          sex: person.sex,
          phone: person.phone,
        },
        description: "Consultation in-clinic",
      };
    });

    return {
      day: "2026-11-25",
      dayLabel: "25 November 2026",
      summary: {
        collected,
        bills: paid.length,
        pendingCount: pending.length,
        pendingAmount,
        refundCount: refunded.length,
        refundAmount,
        // The bills raised today — not every bill the clinic has ever raised.
        dayBills: invoices.filter((bill) => (bill.createdAt ?? "").startsWith("2026-11-25")).length,
      },
      byMode,
      pending: pendingItems,
      bills,
      meta: { total: everyBill.length, limit, offset },
      bill: billCard(invoices[0]),
      clinic: {
        name: "MedMate Clinic",
        address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
        phone: "080 4123 4567",
        gstin: "29AAJCM4821K1Z7",
        registration: "KPME/BLR/2024/01873",
        hfr: "IN2910000123",
      },
    };
  });

  mock.on("GET", "/clinic/billing/:id", (_body, context) => {
    requireSession();
    const bill = invoices.find((item) => item.id === context.params.id);
    if (!bill) throw new Error(`no bill ${context.params.id}`);
    return billCard(bill);
  });

  mock.on("POST", "/clinic/billing/:id/pay", (body, context) => {
    requireSession();
    const bill = invoices.find((item) => item.id === context.params.id);
    if (!bill) throw new Error(`no bill ${context.params.id}`);
    const request = body as { payMode?: string };
    bill.status = "paid";
    bill.payMode = request.payMode ?? "cash";
    bill.paidAt = new Date().toISOString();
    return {
      invoiceId: bill.id,
      status: bill.status,
      paidAt: bill.paidAt,
      payMode: bill.payMode,
      amount: bill.total,
    };
  });

  mock.on("POST", "/clinic/billing/:id/refund", (_body, context) => {
    requireSession();
    const bill = invoices.find((item) => item.id === context.params.id);
    if (!bill) throw new Error(`no bill ${context.params.id}`);
    bill.status = "refunded";
    return { invoiceId: bill.id, status: bill.status, amount: bill.total };
  });

  mock.on("POST", "/clinic/billing", (body) => {
    requireSession();
    const request = body as {
      patient?: string;
      lines?: Array<{ name: string; amount: number }>;
      discount?: number;
    };

    const name = (request.patient ?? "").trim();
    if (!name) throw new Error("the patient is needed");

    const lines = request.lines ?? [];
    if (lines.length === 0) throw new Error("a bill needs at least one charge");

    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const discount = request.discount ?? 0;
    const total = Math.max(0, subtotal - discount);

    // The bill hangs off the patient's visit of the day, when there is one.
    const visit =
      visits.find((item) => item.status === "waiting" || item.status === "in_consult") ?? visits[0];

    const bill = {
      id: `inv_${String(invoices.length + 151).padStart(4, "0")}`,
      visitId: visit?.id ?? "vs_kavya",
      prescriptionId: "rx_vs_kavya",
      prefix: "MMC/26-27",
      number: String(invoices.length + 151).padStart(4, "0"),
      total,
      status: "unpaid",
      payMode: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
      lines,
    };
    invoices.unshift(bill);

    return {
      invoiceId: bill.id,
      number: bill.number,
      total,
      status: bill.status,
      bill: billCard(bill),
    };
  });

  mock.on("POST", "/clinic/billing/close-day", (body) => {
    requireSession();
    const request = body as { cash?: number; expected?: number };

    const paid = invoices.filter((bill) => bill.status === "paid");
    const expected = paid.reduce((sum, bill) => sum + bill.total, 0);
    const counted = request.cash ?? 0;

    return {
      day: "2026-11-25",
      expected,
      counted,
      difference: counted - expected,
      collected: expected,
      bills: paid.length,
      closedAt: new Date().toISOString(),
    };
  });
}
