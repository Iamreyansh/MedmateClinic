"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { loadReport } from "@/features/reports/state/reportsSlice";
import type {
  BookingsReport,
  ReportPayload,
  ClinicalReport,
  ConsultRow,
  ConsultsReport,
  ReportKpi,
  ReportTab,
  SummaryReport,
} from "@/features/reports/types/reports";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type Preset = "today" | "week" | "month" | "custom";

const TAB_LABELS: Record<ReportTab, string> = {
  summary: "Summary",
  bookings: "Bookings & waiting",
  clinical: "Clinical",
  consults: "Consult list",
};

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

const PAGE = 20;

function iso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The dates a preset means. */
function rangeFor(preset: Preset, custom: { from: string; to: string }) {
  const today = new Date();
  switch (preset) {
    case "today":
      return { from: iso(today), to: iso(today) };
    case "week": {
      const start = new Date(today);
      const day = (today.getDay() + 6) % 7;
      start.setDate(today.getDate() - day);
      return { from: iso(start), to: iso(today) };
    }
    case "month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: iso(start), to: iso(today) };
    }
    case "custom":
      return custom;
  }
}

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function money(value: number) {
  return `₹${rupees.format(Math.round(value))}`;
}

function formatKpi(kpi: ReportKpi) {
  if (kpi.key === "money") return money(kpi.value);
  if (kpi.suffix === "%") return `${kpi.value}%`;
  if (kpi.suffix === " min") return `${rupees.format(kpi.value)} min`;
  return rupees.format(kpi.value);
}

/** A number that may have a fraction, without a trailing ".0". */
function plain(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

/**
 * The numbers that are better when they go down.
 *
 * A shorter wait and fewer no-shows are good news; everything else is good
 * news when it goes up. The pill turns red or mint on this, not on the sign.
 */
const LOWER_IS_BETTER = new Set(["averageWait", "noShows"]);

export function ReportsScreen() {
  const dispatch = useAppDispatch();
  const { status, report, consultRows, error } = useAppSelector((state) => state.reports);

  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [tab, setTab] = useState<ReportTab>("summary");
  const [doctor, setDoctor] = useState("");
  const [search, setSearch] = useState("");
  const [queried, setQueried] = useState("");
  const [offset, setOffset] = useState(0);

  const range = useMemo(() => rangeFor(preset, custom), [preset, custom]);

  // the search box talks to the server, but not on every keystroke
  useEffect(() => {
    const timer = window.setTimeout(() => setQueried(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!range.from || !range.to) return;
    void dispatch(
      loadReport({
        tab,
        from: range.from,
        to: range.to,
        doctor: doctor || undefined,
        q: tab === "consults" ? queried || undefined : undefined,
        limit: tab === "consults" ? PAGE : undefined,
        offset: tab === "consults" ? offset : undefined,
      }),
    );
  }, [dispatch, tab, range.from, range.to, doctor, queried, offset]);

  const tabs = report?.tabs ?? (["summary"] as ReportTab[]);
  const busy = status === "loading";

  function changeTab(next: ReportTab) {
    setTab(next);
    setOffset(0);
  }

  function exportCsv() {
    const rows = csvRows(report, tab, consultRows);
    if (!rows.length) return;
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medmate-reports-${tab}-${range.from}-to-${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell activeHref="/reports">
      <div className="hello">
        <div>
          <h1 className="t-h1">
            Reports &amp; <em>analytics</em>
          </h1>
          <p>
            {report
              ? `${report.range.label} · compared with ${report.range.previousLabel}`
              : "Counting the clinic’s work…"}
          </p>
        </div>
      </div>

      <div className="rp-filters">
        <div className="rp-presets">
          {PRESETS.map((option) => (
            <Chip
              key={option.value}
              active={preset === option.value}
              onClick={() => setPreset(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <select
          className="input rp-doc"
          value={doctor}
          onChange={(event) => setDoctor(event.target.value)}
          aria-label="One doctor, or the whole clinic"
        >
          <option value="">All doctors</option>
          {(report?.doctors ?? []).map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" icon="chart" onClick={exportCsv}>
          Excel
        </Button>
      </div>

      {preset === "custom" ? (
        <div className="rp-custom">
          <label>
            From
            <input
              className="input"
              type="date"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(event) => setCustom((previous) => ({ ...previous, from: event.target.value }))}
            />
          </label>
          <label>
            To
            <input
              className="input"
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(event) => setCustom((previous) => ({ ...previous, to: event.target.value }))}
            />
          </label>
        </div>
      ) : null}

      <div className={cn("seg tabs", tabs.length === 2 && "two")} role="tablist">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={cn(tab === name && "on")}
            onClick={() => changeTab(name)}
          >
            {TAB_LABELS[name]}
          </button>
        ))}
      </div>

      {error ? <div className="note red">{error}</div> : null}

      <div className={cn(busy && "rp-busy")}>
        {tab === "summary" && report?.summary ? (
          <SummaryTab
            summary={report.summary}
            previousLabel={report.range.previousLabel}
            period={preset === "month" ? "this month" : "this period"}
          />
        ) : null}
        {tab === "bookings" && report?.bookings ? (
          <BookingsTab bookings={report.bookings} previousLabel={report.range.previousLabel} />
        ) : null}
        {tab === "clinical" && report?.clinical ? (
          <ClinicalTab clinical={report.clinical} previousLabel={report.range.previousLabel} />
        ) : null}
        {tab === "consults" && report?.consults ? (
          <ConsultsTab
            consults={report.consults}
            rows={consultRows}
            search={search}
            onSearch={setSearch}
            onMore={() => setOffset(report.consults?.nextOffset ?? 0)}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function KpiRow({ kpis, previousLabel }: { kpis: ReportKpi[]; previousLabel: string }) {
  return (
    <div className="kpis five">
      {kpis.map((kpi) => {
        const lowerIsBetter = LOWER_IS_BETTER.has(kpi.key);
        const good = lowerIsBetter ? kpi.delta < 0 : kpi.delta > 0;
        const tone = kpi.delta === 0 ? undefined : good ? "good" : "bad";
        const sign = kpi.delta > 0 ? "+" : "";

        // a wait is measured in minutes, not in percent; the rest compare
        // against the period before, when there is one to compare against
        const text =
          kpi.suffix === " min"
            ? `${sign}${plain(kpi.delta)} min`
            : kpi.deltaShare != null
              ? `${sign}${kpi.deltaShare}% vs ${previousLabel}`
              : `${sign}${plain(kpi.delta)} vs ${previousLabel}`;

        return (
          <div className="kpi" key={kpi.key}>
            <div className="t-eyebrow">{kpi.label}</div>
            <div className="v">{formatKpi(kpi)}</div>
            <div className="rp-kpi-d">
              <span className={cn("rp-delta", tone)}>{text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A row of bars, with the ends of the axis under them.
 *
 * The tallest bar is the day worth reading twice, so it is the one in the
 * darker green. A day with nothing on it stays in the frame as a hairline.
 */
function Bars({
  values,
  labels,
  note,
}: {
  values: number[];
  labels: string[];
  note?: string;
}) {
  const max = Math.max(...values, 1);
  const peak = values.length ? values.indexOf(Math.max(...values)) : -1;

  return (
    <div className="rp-chart">
      <div className="rbars">
        {values.map((value, index) => (
          <div
            key={index}
            className={cn(value === 0 && "flat", index === peak && value > 0 && "peak")}
            style={{ height: value === 0 ? "2px" : `${Math.max(4, Math.round((value / max) * 100))}%` }}
            title={`${labels[index]}: ${value}`}
          />
        ))}
      </div>
      <div className="rbars-axis">
        <span>{labels[0] ?? ""}</span>
        <span>{note ?? ""}</span>
      </div>
    </div>
  );
}

/** One labelled bar: a name, a number, and the bar between them. */
function Bar({
  label,
  value,
  text,
  tone,
}: {
  label: string;
  value: number;
  text: string;
  tone?: "bad" | "warn";
}) {
  return (
    <div className="hbar">
      <div className="hbar-l">
        <span>{label}</span>
        <span>{text}</span>
      </div>
      <div className="hbar-track">
        <div
          className={cn(tone && tone)}
          style={{
            width: `${Math.max(2, Math.min(100, value))}%`,
            background: tone === "bad" ? "var(--red)" : tone === "warn" ? "var(--gold)" : undefined,
          }}
        />
      </div>
    </div>
  );
}

function SummaryTab({
  summary,
  previousLabel,
  period,
}: {
  summary: SummaryReport;
  previousLabel: string;
  period: string;
}) {
  const days = summary.moneyByDay;
  const maxDoctor = Math.max(...summary.byDoctor.map((row) => row.consultations), 1);

  // the day the clinic earned the most, named under the chart
  const best = days.reduce<{ amount: number; label: string } | null>((top, day) => {
    if (!top || day.amount > top.amount) return { amount: day.amount, label: day.label };
    return top;
  }, null);
  const note = best
    ? `${days[days.length - 1]?.label ?? ""} · best day ${money(best.amount)} on ${best.label}`
    : "";

  return (
    <>
      <KpiRow kpis={summary.kpis} previousLabel={previousLabel} />

      <div className="grid2 rp-sum">
        <section className="card rp-money">
          <div className="card-h">
            <h2 className="t-h3">Money collected by day</h2>
          </div>
          {days.length ? (
            <Bars
              values={days.map((day) => day.amount)}
              labels={days.map((day) => day.label)}
              note={note}
            />
          ) : (
            <p className="rp-note-empty">No money came in this period.</p>
          )}
        </section>

        <div className="rp-stack">
          <section className="card">
            <div className="card-h">
              <h2 className="t-h3">By doctor</h2>
            </div>
            {summary.byDoctor.map((row) => (
              <div className="hbar rp-doc-row" key={row.doctorId ?? "none"}>
                <div className="hbar-l">
                  <span>{row.name}</span>
                  <span>{money(row.amount)}</span>
                </div>
                <div className="hbar-track">
                  <div style={{ width: `${Math.max(2, (row.consultations / maxDoctor) * 100)}%` }} />
                </div>
                <div className="hbar-sub">{row.consultations} consults</div>
              </div>
            ))}
            {summary.byDoctor.length === 0 ? (
              <p className="rp-note-empty">No consultations yet.</p>
            ) : null}
          </section>

          <section className="card">
            <div className="card-h">
              <h2 className="t-h3">By payment mode</h2>
            </div>
            <div className="rp-modes">
              {summary.byPayMode.map((mode) => (
                <div className="hbar-l" key={mode.mode}>
                  <span>{mode.label}</span>
                  <span>
                    {money(mode.amount)} · {mode.share}%
                  </span>
                </div>
              ))}
            </div>
            {summary.byPayMode.length === 0 ? (
              <p className="rp-note-empty">Nothing has been paid yet.</p>
            ) : null}
          </section>
        </div>
      </div>

      <section className="card rp-common">
        <div className="card-h">
          <h2 className="t-h3">Most common {period}</h2>
        </div>
        <div className="rp-two">
          <div>
            <h3 className="t-eyebrow">Diagnoses</h3>
            {summary.topDiagnoses.map((row, index) => (
              <div className="rp-rank" key={`${row.code ?? row.label}`}>
                <span className="rp-rank-n">{index + 1}</span>
                <span className="rp-rank-t">
                  {row.code ? `${row.code} ${row.label}` : row.label} · {row.count}
                </span>
              </div>
            ))}
            {summary.topDiagnoses.length === 0 ? (
              <p className="rp-note-empty">Nothing written yet.</p>
            ) : null}
          </div>
          <div>
            <h3 className="t-eyebrow">Medicines</h3>
            {summary.topMedicines.map((row, index) => (
              <div className="rp-rank" key={row.name}>
                <span className="rp-rank-n">{index + 1}</span>
                <span className="rp-rank-t">
                  {row.name} · {row.count}
                </span>
              </div>
            ))}
            {summary.topMedicines.length === 0 ? (
              <p className="rp-note-empty">Nothing prescribed yet.</p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

function BookingsTab({
  bookings,
  previousLabel,
}: {
  bookings: BookingsReport;
  previousLabel: string;
}) {
  const maxWait = Math.max(...bookings.waitByDoctor.map((row) => row.minutes ?? 0), 1);

  return (
    <>
      <KpiRow kpis={bookings.kpis} previousLabel={previousLabel} />

      <div className="grid2 rp-sum">
        <section className="card">
          <div className="card-h">
            <h2 className="t-h3">Busiest hours</h2>
          </div>
          {bookings.busiestHours.length ? (
            <Bars
              values={bookings.busiestHours.map((hour) => hour.count)}
              labels={bookings.busiestHours.map((hour) => hour.label)}
            />
          ) : (
            <p className="rp-note-empty">No bookings in this period.</p>
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <h2 className="t-h3">Wait by doctor</h2>
          </div>
          {bookings.waitByDoctor.map((row) => (
            <Bar
              key={row.name}
              label={row.name}
              value={((row.minutes ?? 0) / maxWait) * 100}
              text={`${row.minutes ?? 0} min`}
              tone={(row.minutes ?? 0) > maxWait * 0.8 ? "warn" : undefined}
            />
          ))}
          {bookings.waitByDoctor.length === 0 ? <p className="rp-note-empty">No waits recorded.</p> : null}
        </section>
      </div>

      <section className="card">
        <div className="card-h">
          <h2 className="t-h3">Follow-ups the doctor asked for</h2>
        </div>
        <div className="qstats four">
          <div className="qstat">
            <b>{bookings.followUps.due}</b>
            <span>due this period</span>
          </div>
          <div className="qstat">
            <b>{bookings.followUps.came}</b>
            <span>came back · {bookings.followUps.cameShare}</span>
          </div>
          <div className="qstat">
            <b>{bookings.followUps.upcoming}</b>
            <span>booked, still to come</span>
          </div>
          <div className={cn("qstat", bookings.followUps.missed > 0 && "hot")}>
            <b>{bookings.followUps.missed}</b>
            <span>missed — not booked</span>
          </div>
        </div>
        {bookings.followUps.missedPatients.length ? (
          <ul className="rp-notes">
            <li className="warn">
              <Icon name="alert" size={18} />
              <span>
                {bookings.followUps.missedPatients.map((patient) => patient.name).join(", ")} did not book
                their follow-up.
              </span>
              <Button variant="secondary" size="sm" icon="send">
                Message the {bookings.followUps.missed}
              </Button>
            </li>
          </ul>
        ) : null}
      </section>
    </>
  );
}

function ClinicalTab({
  clinical,
  previousLabel,
}: {
  clinical: ClinicalReport;
  previousLabel: string;
}) {
  const maxDiagnosis = Math.max(...clinical.topDiagnoses.map((row) => row.count), 1);
  const maxMedicine = Math.max(...clinical.topMedicines.map((row) => row.count), 1);
  const maxAlert = Math.max(...clinical.alerts.map((row) => row.count), 1);

  return (
    <>
      <KpiRow kpis={clinical.kpis} previousLabel={previousLabel} />

      <div className="grid2 rp-sum">
        <section className="card">
          <div className="card-h">
            <h2 className="t-h3">Top diagnoses</h2>
          </div>
          {clinical.topDiagnoses.map((row) => (
            <Bar
              key={`${row.code ?? row.label}`}
              label={row.label}
              value={(row.count / maxDiagnosis) * 100}
              text={`${row.count}`}
            />
          ))}
          {clinical.topDiagnoses.length === 0 ? <p className="rp-note-empty">Nothing written yet.</p> : null}
        </section>

        <section className="card">
          <div className="card-h">
            <h2 className="t-h3">Top medicines</h2>
          </div>
          {clinical.topMedicines.map((row) => (
            <Bar
              key={row.name}
              label={row.name}
              value={(row.count / maxMedicine) * 100}
              text={`${row.count}`}
            />
          ))}
          {clinical.topMedicines.length === 0 ? <p className="rp-note-empty">Nothing prescribed yet.</p> : null}
        </section>
      </div>

      <section className="card">
        <div className="card-h">
          <h2 className="t-h3">Safety alerts this period</h2>
        </div>
        {clinical.alerts.map((alert) => (
          <Bar
            key={alert.kind}
            label={alert.label}
            value={(alert.count / maxAlert) * 100}
            text={`${alert.count}`}
            tone="warn"
          />
        ))}
        {clinical.alerts.length === 0 ? (
          <p className="rp-note-empty">The doctor was not warned about anything.</p>
        ) : null}
        {clinical.overrideReasons.length ? (
          <ul className="rp-notes">
            {clinical.overrideReasons.map((row) => (
              <li className="good" key={row.reason}>
                <Icon name="check" size={18} />
                <span>
                  {row.count} prescription{row.count === 1 ? "" : "s"} went ahead anyway — {row.reason}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="rp-notes">
          <li className="info">
            <Icon name="alert" size={18} />
            <span>
              Only doctors see this tab. The clinic administrator sees the money and the bookings, never
              the diagnoses or the medicines.
            </span>
          </li>
        </ul>
      </section>
    </>
  );
}

function ConsultsTab({
  consults,
  rows,
  search,
  onSearch,
  onMore,
}: {
  consults: ConsultsReport;
  rows: ConsultRow[];
  search: string;
  onSearch: (value: string) => void;
  onMore: () => void;
}) {
  return (
    <section className="card">
      <div className="rp-search">
        <Icon name="search" size={16} />
        <input
          className="input"
          value={search}
          placeholder="Search patient, token, diagnosis or medicine"
          onChange={(event) => onSearch(event.target.value)}
          aria-label="Search the consultations"
        />
      </div>

      <div className="rp-scroll">
        <table className="tbl wide">
          <thead>
            <tr>
              <th>Date</th>
              <th>Token</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Diagnosis</th>
              <th className="num">Waited</th>
              <th className="num">Consult</th>
              <th className="num">Bill</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.token}-${index}`}>
                <td>{row.date ?? "—"}</td>
                <td>{row.token}</td>
                <td>{row.patient}</td>
                <td>{row.doctor ?? "—"}</td>
                <td>{row.diagnosis ?? "—"}</td>
                <td className="num">{row.waitedMinutes != null ? `${row.waitedMinutes} min` : "—"}</td>
                <td className="num">{row.consultMinutes != null ? `${row.consultMinutes} min` : "—"}</td>
                <td className="num">
                  <span
                    className={cn(
                      "rp-tag",
                      row.billStatus === "paid" ? "ok" : row.billStatus === "refunded" ? "bad" : "info",
                    )}
                  >
                    {row.billStatus === "paid"
                      ? `Paid ${money(row.billAmount)}`
                      : row.billStatus === "refunded"
                        ? "Refunded"
                        : `${money(row.billAmount)} due`}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>No consultations match.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rp-foot">
        <span>
          {consults.total} consultation{consults.total === 1 ? "" : "s"} · showing {rows.length}
        </span>
        {consults.hasMore ? (
          <Button variant="secondary" size="sm" onClick={onMore}>
            Load more
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** The current view as a spreadsheet, for Excel. */
function csvRows(report: ReportPayload | null, tab: ReportTab, rows: ConsultRow[]) {
  if (!report) return [];
  if (tab === "consults") {
    return [
      ["Date", "Token", "Patient", "Doctor", "Diagnosis", "Waited (min)", "Consult (min)", "Bill"].join(","),
      ...rows.map((row) =>
        [
          row.date ?? "",
          row.token,
          row.patient,
          row.doctor ?? "",
          row.diagnosis ?? "",
          row.waitedMinutes ?? "",
          row.consultMinutes ?? "",
          row.billLabel,
        ]
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ];
  }
  if (tab === "summary" && report.summary) {
    return [
      ["Measure", "Value"].join(","),
      ...report.summary.kpis.map((kpi) => `"${kpi.label}","${formatKpi(kpi)}"`),
    ];
  }
  if (tab === "bookings" && report.bookings) {
    return [
      ["Measure", "Value"].join(","),
      ...report.bookings.kpis.map((kpi) => `"${kpi.label}","${formatKpi(kpi)}"`),
      "",
      ["Hour", "Bookings"].join(","),
      ...report.bookings.busiestHours.map((hour) => `"${hour.label}",${hour.count}`),
    ];
  }
  if (tab === "clinical" && report.clinical) {
    return [
      ["Measure", "Value"].join(","),
      ...report.clinical.kpis.map((kpi) => `"${kpi.label}","${formatKpi(kpi)}"`),
      "",
      ["Safety alert", "Times shown"].join(","),
      ...report.clinical.alerts.map((alert) => `"${alert.label}",${alert.count}`),
    ];
  }
  return [];
}
