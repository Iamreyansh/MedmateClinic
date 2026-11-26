"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { fetchMessages, resendMessage, type MessagesPayload } from "@/features/messages/api/messages";

/** The kinds the log can be read by. */
const FILTERS = [
  { value: "all", label: "All" },
  { value: "token", label: "Token" },
  { value: "reminder", label: "Reminder" },
  { value: "prescription", label: "Prescription" },
  { value: "payment", label: "Payment" },
  { value: "failed", label: "Failed" },
];

/** How a kind is written on the card. */
const KIND_LABEL: Record<string, string> = {
  token: "Queue token",
  reminder: "Reminder",
  prescription: "Prescription",
  payment: "Payment",
};

/**
 * The patient messages.
 *
 * The log of everything the clinic has sent a patient, and the way to send it
 * again when it did not arrive.
 */
export function MessagesScreen() {
  const [payload, setPayload] = useState<MessagesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // a retry asks again — the counter is what changes
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    fetchMessages(filter)
      .then((data) => {
        if (!alive) return;
        setPayload(data);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Could not load the messages");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [filter, attempt]);

  const items = payload?.items ?? [];

  const sendAgain = async (id: string) => {
    setBusy(id);
    try {
      await resendMessage(id);
      setAttempt((value) => value + 1);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not send the message again");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell activeHref="/messages">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Patient <em>messages</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Every message the clinic has sent a patient, and a way to send it again.
          </p>
        </div>
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        />
      ) : null}

      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTERS.map((entry) => (
          <Chip
            key={entry.value}
            active={filter === entry.value}
            onClick={() => {
              setLoading(true);
              setFilter(entry.value);
            }}
          >
            {entry.label} <span className="count">{payload?.counts[entry.value] ?? 0}</span>
          </Chip>
        ))}
      </div>

      {loading && !payload ? <LoadingState title="Loading the messages…" /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Nothing sent yet"
          copy="The queue token, the reminder, the prescription and the receipt all land here."
          icon="send"
        />
      ) : null}

      <div className="ms-list">
        {items.map((message) => (
          <article className="card" key={message.id} style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Avatar initials={message.patient.initials || "—"} tone="reception" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontSize: 15 }}>{message.patient.name}</b>
                  <span className={message.failed ? "badge red" : "badge plain"}>
                    {KIND_LABEL[message.kind] ?? message.kind}
                  </span>
                  <span className="badge plain">{message.channel}</span>
                </div>
                <p className="t-cap" style={{ marginTop: 4 }}>
                  {message.body}
                </p>
                <p className="t-cap" style={{ marginTop: 6 }}>
                  {message.sentAt} · {message.failed ? "did not arrive" : message.status}
                </p>
              </div>
              {message.canResend ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy === message.id}
                  onClick={() => void sendAgain(message.id)}
                >
                  <Icon name="send" size={14} />
                  {message.failed ? "Send again" : "Send again"}
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
