"use client";

import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "@/services/api";
import type { PatientRecord } from "@/types/patient";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileKeyValue,
  MobileLoading,
  MobileTitle,
} from "@/mobile/components";

/**
 * The patient's record on a phone.
 *
 * The same record the desktop draws: the patient, their own visits first,
 * the readings over time, the lab results and who has opened the record.
 */
export function MobilePatientRecordScreen() {
  const { id = "" } = useParams();
  const load = useCallback(() => apiGet<PatientRecord>(`/clinic/patients/${encodeURIComponent(id)}`), [id]);
  const { status, data, error, reload, unreachable } = useRemote(load, id);

  return (
    <StaffShell activeHref="/m/patients">
      <MobileTitle
        title={data?.patient.name ?? "Patient"}
        line={
          data
            ? `${data.patient.age} ${data.patient.sex} · ${data.patient.visits} visits · since ${data.patient.since}`
            : "The patient's record"
        }
      />

      {status === "loading" && !data ? <MobileLoading title="Opening the record…" /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <>
          <MobileCard title="Who this is">
            <MobileKeyValue label="ABHA" value={data.patient.abha} />
            <MobileKeyValue label="Mobile" value={data.patient.phone} />
            <MobileKeyValue
              label="Allergies"
              value={data.patient.allergies.length ? data.patient.allergies.join(", ") : "None known"}
            />
            <MobileKeyValue
              label="Conditions"
              value={data.patient.conditions.length ? data.patient.conditions.join(", ") : "None known"}
            />
          </MobileCard>

          <MobileCard title="Visits">
            {data.visits.length === 0 ? (
              <MobileEmpty title="No visits yet" copy="This patient has not been seen here." />
            ) : (
              <div className="mob-section">
                {data.visits.map((visit) => (
                  <div key={visit.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                    <span className="txt" style={{ whiteSpace: "normal" }}>
                      <b style={{ whiteSpace: "normal" }}>{visit.diagnosis}</b>
                      <small style={{ whiteSpace: "normal" }}>
                        {visit.date} · {visit.doctor}
                        {visit.code ? ` · ${visit.code}` : ""}
                      </small>
                      {visit.medicines ? (
                        <small style={{ whiteSpace: "normal" }}>{visit.medicines}</small>
                      ) : null}
                      {visit.extra ? <small style={{ whiteSpace: "normal" }}>{visit.extra}</small> : null}
                    </span>
                    <span className="end">
                      <span className="badge mint">{visit.signed}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>

          {data.readings.length > 0 ? (
            <MobileCard title="Readings over time">
              {data.readings.map((reading) => (
                <MobileKeyValue
                  key={`${reading.label}-${reading.value}`}
                  label={reading.label}
                  value={`${reading.value} · ${reading.state}`}
                />
              ))}
            </MobileCard>
          ) : null}

          {data.labResults.length > 0 ? (
            <MobileCard title="Lab results">
              {data.labResults.map((result) => (
                <MobileKeyValue
                  key={`${result.name}-${result.when}`}
                  label={`${result.name} · ${result.when}`}
                  value={result.value}
                />
              ))}
            </MobileCard>
          ) : null}

          {data.recordAccess.length > 0 ? (
            <MobileCard title="Who has opened this record">
              {data.recordAccess.map((entry) => (
                <MobileKeyValue
                  key={`${entry.who}-${entry.when}`}
                  label={`${entry.who} · ${entry.when}`}
                  value={entry.what}
                />
              ))}
            </MobileCard>
          ) : null}
        </>
      ) : null}
    </StaffShell>
  );
}
