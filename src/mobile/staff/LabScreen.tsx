"use client";

import { useCallback, useState } from "react";
import { fetchLab, moveLabOrder } from "@/features/lab/api/lab";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
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

/**
 * The lab bench on a phone.
 *
 * The work waiting to be done, the work reported today, and the one move a
 * technician makes on a phone: sending an order on to a partner lab.
 */
export function MobileLabScreen() {
  const load = useCallback(() => fetchLab(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);
  const action = useAction();
  const [view, setView] = useState<"open" | "reported">("open");

  const orders = view === "open" ? data?.open ?? [] : data?.reported ?? [];
  const counts = data?.counts;

  const sendOut = async (orderId: string) => {
    const done = await action.run(() => moveLabOrder(orderId, "sent_out"));
    if (done) reload();
  };

  return (
    <StaffShell activeHref="/m/lab">
      <MobileTitle title="Lab & diagnostics" line={data?.meta ?? "The bench"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {counts ? (
        <MobileStats
          items={[
            { value: counts.toCollect, label: "To collect" },
            { value: counts.inLab, label: "In the lab" },
            { value: counts.sentOut, label: "Sent out" },
          ]}
        />
      ) : null}

      {data ? (
        <div className="chips">
          <Chip active={view === "open"} onClick={() => setView("open")}>
            On the bench
          </Chip>
          <Chip active={view === "reported"} onClick={() => setView("reported")}>
            Reported today
          </Chip>
        </div>
      ) : null}

      {action.error ? (
        <div className="note red" role="alert">
          <Icon name="alert" size={18} />
          <div>{action.error}</div>
        </div>
      ) : null}

      {status === "ready" && orders.length === 0 ? (
        <MobileEmpty
          title={view === "open" ? "The bench is clear" : "Nothing reported today"}
          copy={
            view === "open"
              ? "No sample is waiting to be worked on."
              : "No result has been reported today."
          }
        />
      ) : null}

      {orders.length > 0 ? (
        <MobileCard title={view === "open" ? "On the bench" : "Reported"}>
          <div className="mob-section">
            {orders.map((order) => (
              <div key={order.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="ico">
                  <Icon name="lab" size={18} />
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{order.test}</b>
                  <small style={{ whiteSpace: "normal" }}>
                    {order.patient.name} · {order.patient.age} {order.patient.sex}
                  </small>
                  <small style={{ whiteSpace: "normal" }}>
                    {order.sampleNo ? `Sample ${order.sampleNo} · ` : ""}
                    {order.partner ? `Partner: ${order.partner}` : "In house"}
                  </small>
                  {order.value ? (
                    <small style={{ whiteSpace: "normal" }}>
                      {order.value}
                      {order.reference ? ` (ref ${order.reference})` : ""}
                    </small>
                  ) : null}
                </span>
                <span className="end">
                  {order.critical ? <span className="badge red">Critical</span> : null}
                  {order.abnormal ? <span className="badge gold">Abnormal</span> : null}
                  <span className="badge plain">{order.status.replace("_", " ")}</span>
                  {view === "open" && order.status !== "sent_out" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={action.busy}
                      onClick={() => void sendOut(order.id)}
                    >
                      Send out
                    </Button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {data && data.partners.length > 0 ? (
        <MobileCard title="Partner labs">
          <p className="t-cap">{data.partners.join(" · ")}</p>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
