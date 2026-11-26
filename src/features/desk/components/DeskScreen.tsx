"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/Input";
import { apiGet } from "@/services/api";
import { checkOut, fetchBookingLink, checkInPatient, fetchDoctors } from "@/features/desk/api/desk";
import { DeskRow } from "@/features/desk/components/DeskRow";
import { CheckOutDialog } from "@/features/desk/components/CheckOutDialog";
import { ShareBookingLinkDialog } from "@/features/desk/components/ShareBookingLinkDialog";
import { CheckInPatientDialog } from "@/components/ui/CheckInPatientDialog";
import type { DeskItem, DeskPayload } from "@/features/desk/types";
import { money } from "@/lib/format";

/** The three things the desk does with a patient. */
const FILTERS = [
  { value: "toHandOver", label: "To hand over" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done today" },
];

/** The line under the title. */
const SUBTITLE =
  "Check each patient out in one place: prescription, payment, follow-up and lab sample. Oldest first.";

/**
 * The reception desk.
 *
 * Each patient in the clinic is here to be handed over: the prescription to
 * print, the bill to collect, the follow-up to book. The list shows what is
 * still missing for each one, so the desk knows what to ask for.
 */
export function DeskScreen() {
  const [payload, setPayload] = useState<DeskPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("waiting");
  const [busy, setBusy] = useState<string | null>(null);
  const [find, setFind] = useState("");
  // the patient being handed over
  const [handingOver, setHandingOver] = useState<DeskItem | null>(null);
  // the booking link, when the desk shares it
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState("");
  // the patient being checked in at the counter
  const [checkingIn, setCheckingIn] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; speciality: string }>>([]);

  // A retry asks for the desk again — the counter is what changes.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    apiGet<DeskPayload>("/clinic/desk", { signal: controller.signal })
      .then((data) => {
        if (!alive) return;
        setPayload(data);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Could not load the desk");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [attempt]);

  // The doctors, so a patient can be sent to one.
  useEffect(() => {
    let alive = true;
    fetchDoctors()
      .then((list) => {
        if (alive) setDoctors(list);
      })
      .catch(() => {
        // The desk still works without the list — the doctor is picked later.
      });
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(() => payload?.visits ?? [], [payload]);

  /**
   * The line under the title.
   *
   * The service sends it as an object with a label and a note; an older build
   * sent it as a plain sentence. Both are read, and neither is printed raw.
   */
  const line = useMemo(() => {
    const meta = payload?.meta;
    if (typeof meta === "string") return meta;
    if (meta && typeof meta === "object") {
      return meta.label ?? meta.text ?? meta.note ?? "";
    }
    return payload?.note ?? "";
  }, [payload]);
  const counts = payload?.counts;

  const visible = useMemo(() => {
    const wanted = find.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "toHandOver" && (item.checkedOut || item.prescription.status === "none")) {
        return false;
      }
      if (filter === "waiting" && item.checkedOut) return false;
      if (filter === "done" && !item.checkedOut) return false;
      if (!wanted) return true;
      return [item.token, item.patient.name]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(wanted));
    });
  }, [items, filter, find]);

  /**
   * The four tiles the desk reads the day by.
   *
   * The money still to collect and the follow-ups still to book are not in
   * the counts the service sends, so they are counted from the rows — which
   * is where they are true anyway.
   */
  const tiles = useMemo(() => {
    const toCollect = items
      .filter((item) => item.payment.status !== "paid" && item.payment.status !== "none")
      .reduce((sum, item) => sum + (item.payment.amount ?? 0), 0);
    const followUps = items.filter((item) => item.followUp !== null).length;
    return {
      waiting: counts?.toHandOver ?? 0,
      toCollect,
      followUps,
      doneToday: counts?.doneToday ?? 0,
    };
  }, [items, counts]);

  const handOver = async (item: DeskItem) => {
    setBusy(item.id);
    try {
      await checkOut(item.visitId);
      setAttempt((value) => value + 1);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not hand the patient over");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell activeHref="/desk">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Reception <em>desk</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{SUBTITLE}</p>
        </div>
        <div className="nq-btns">
          <Link to="/billing" className="btn sec">
            <Icon name="rupee" size={16} />
            Billing
          </Link>
          <Button
            variant="secondary"
            icon="send"
            onClick={() => {
              setSharing(true);
              void fetchBookingLink()
                .then((entry) => setLink(entry.link))
                .catch((reason: unknown) =>
                  setError(reason instanceof Error ? reason.message : "Could not get the link"),
                );
            }}
          >
            Share the booking link
          </Button>
          <Button variant="secondary" icon="plus" onClick={() => setCheckingIn(true)}>
            Check in a patient
          </Button>
        </div>
      </div>

      {error ? (
        <div className="note red">
          <Icon name="alert" size={18} />
          <div style={{ flex: 1 }}>
            <b>{error}</b>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      <div className="kpis">
        <div className="kpi">
          <div className="v">{tiles.waiting}</div>
          <div className="l">Waiting at the desk</div>
        </div>
        <div className="kpi">
          <div className="v">{money(tiles.toCollect)}</div>
          <div className="l">To collect</div>
        </div>
        <div className="kpi">
          <div className="v">{tiles.followUps}</div>
          <div className="l">Follow-ups to book</div>
        </div>
        <div className="kpi">
          <div className="v">{tiles.doneToday}</div>
          <div className="l">Done today</div>
        </div>
      </div>

      <section className="card" style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div>
            <b style={{ fontSize: 16 }}>Patients checking out</b>
            {line ? (
              <p className="t-cap" style={{ marginTop: 2 }}>
                {line}
              </p>
            ) : null}
          </div>
          <div style={{ maxWidth: 260, minWidth: 200, flex: 1 }}>
            <SearchInput
              value={find}
              placeholder="Find a token or name"
              aria-label="Find a token or name"
              onChange={(event) => setFind(event.target.value)}
            />
          </div>
        </div>

        <div className="chips" style={{ margin: "14px 0" }}>
          {FILTERS.map((entry) => (
            <Chip key={entry.value} active={filter === entry.value} onClick={() => setFilter(entry.value)}>
              {entry.label}
            </Chip>
          ))}
        </div>

        {loading && !payload ? (
          <b style={{ fontSize: 15 }}>Loading the desk…</b>
        ) : null}

        {visible.length === 0 && !error && !loading ? (
          <div className="empty-card">
            <Icon name="print" size={22} />
            <div>
              <b style={{ fontSize: 15 }}>Nobody is waiting</b>
              <p>Patients appear here as the doctor signs their prescription.</p>
            </div>
          </div>
        ) : null}

        <div className="qitem-list">
          {visible.map((item) => (
            <DeskRow
              key={item.id}
              item={item}
              busy={busy === item.id}
              onHandOver={() => {
                void handOver(item);
              }}
            />
          ))}
        </div>
      </section>

      <div className="note gold" style={{ marginTop: 16 }}>
        <Icon name="send" size={18} />
        <span>
          Patients also get the prescription by SMS, and in their ABHA app if linked. Controlled medicines
          are printed only.
        </span>
      </div>

      <CheckOutDialog
        open={handingOver !== null}
        onClose={() => setHandingOver(null)}
        item={handingOver}
        onCheckOut={() => {
          void handOver(handingOver!);
        }}
      />

      <ShareBookingLinkDialog
        open={sharing}
        onClose={() => setSharing(false)}
        link={link}
        onShare={() => {
          // The link goes out by SMS, WhatsApp or the clipboard.
        }}
      />

      <CheckInPatientDialog
        open={checkingIn}
        onClose={() => setCheckingIn(false)}
        doctors={doctors}
        onCheckIn={(details) => {
          void checkInPatient(details).then(() => {
            setAttempt((value) => value + 1);
          });
        }}
      />
    </AppShell>
  );
}
