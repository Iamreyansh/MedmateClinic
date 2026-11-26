"use client";

import { useCallback } from "react";
import { fetchDesk, checkOut } from "@/features/desk/api/desk";
import type { DeskItem, DeskPayload } from "@/features/desk/types";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StaffShell } from "@/mobile/appShell";
import { useAction, useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileStats,
  MobileTitle,
} from "@/mobile/components";

/** The line under the title, whichever shape the service sent it in. */
function metaLine(meta: DeskPayload["meta"]): string {
  if (!meta) return "";
  if (typeof meta === "string") return meta;
  return meta.label ?? meta.text ?? meta.note ?? "";
}

/**
 * The reception desk on a phone.
 *
 * Who is waiting to be handed over, what each patient still owes, and the
 * one action the desk takes: handing them over.
 */
export function MobileDeskScreen() {
  const load = useCallback(() => fetchDesk(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);
  const action = useAction();

  const visits = data?.visits ?? [];

  const handOver = async (item: DeskItem) => {
    const done = await action.run(() => checkOut(item.visitId));
    if (done) reload();
  };

  return (
    <StaffShell activeHref="/m/desk">
      <MobileTitle title="Reception desk" line={metaLine(data?.meta) || "Who is waiting"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <MobileStats
          three
          items={[
            { value: data.counts.toHandOver, label: "To hand over" },
            { value: data.counts.waiting, label: "Waiting" },
            { value: data.counts.doneToday, label: "Done today" },
          ]}
        />
      ) : null}

      {action.error ? (
        <div className="note red" role="alert">
          <Icon name="alert" size={18} />
          <div>{action.error}</div>
        </div>
      ) : null}

      {status === "ready" && visits.length === 0 ? (
        <MobileEmpty
          title="Nobody to hand over"
          copy="Patients appear here as they check in at the kiosk or the desk."
        />
      ) : null}

      {visits.length > 0 ? (
        <MobileCard title="At the desk">
          <div className="mob-section">
            {visits.map((item) => (
              <div key={item.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="tk">{item.token}</span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>
                    {item.patient.name} · {item.patient.age} {item.patient.sex}
                  </b>
                  <small style={{ whiteSpace: "normal" }}>{item.reason ?? "No complaint recorded"}</small>
                  <small style={{ whiteSpace: "normal" }}>
                    {item.payment.status === "none"
                      ? "Nothing to pay"
                      : `${item.payment.status === "paid" ? "Paid" : "To pay"} ${money(item.payment.amount)}`}
                    {item.waitedMinutes !== null ? ` · waited ${item.waitedMinutes} min` : ""}
                  </small>
                  {item.prescription.status !== "none" ? (
                    <small style={{ whiteSpace: "normal" }}>
                      Prescription {item.prescription.status}
                    </small>
                  ) : null}
                  {item.lab ? (
                    <small style={{ whiteSpace: "normal" }}>
                      {item.lab.name} · {item.lab.label}
                    </small>
                  ) : null}
                  {item.followUp ? (
                    <small style={{ whiteSpace: "normal" }}>Follow-up {item.followUp.label}</small>
                  ) : null}
                </span>
                <span className="end">
                  {item.checkedOut ? (
                    <span className="badge mint">Handed over</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={action.busy}
                      onClick={() => void handOver(item)}
                    >
                      Hand over
                    </Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
