import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { apiGet } from "@/services/api";
import { checkOut, fetchBookingLink, checkInPatient, fetchDoctors } from "@/features/desk/api/desk";
import { DeskRow } from "@/features/desk/components/DeskRow";
import { CheckOutDialog } from "@/features/desk/components/CheckOutDialog";
import { ShareBookingLinkDialog } from "@/features/desk/components/ShareBookingLinkDialog";
import { CheckInPatientDialog } from "@/components/ui/CheckInPatientDialog";
import type { DeskItem, DeskPayload } from "@/features/desk/types";

/** The three things the desk does with a patient. */
const FILTERS = [
  { value: "toHandOver", label: "To hand over" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done today" },
];

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
  const [filter, setFilter] = useState(FILTERS[0].value);
  const [busy, setBusy] = useState<string | null>(null);
  // the patient being handed over
  const [handingOver, setHandingOver] = useState<DeskItem | null>(null);
  // the booking link, when the desk shares it
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState("");
  // the patient being checked in at the counter
  const [checkingIn, setCheckingIn] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; speciality: string }>>([]);

  useEffect(() => {
    let alive = true;
    apiGet<DeskPayload>("/clinic/desk")
      .then((data) => {
        if (alive) setPayload(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the desk");
      });
    return () => {
      alive = false;
    };
  }, []);

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

  const items = payload?.items ?? [];
  const counts = payload?.counts;

  const visible = items.filter((item) => {
    if (filter === "toHandOver") return !item.checkedOut && item.prescription.status !== "none";
    if (filter === "waiting") return !item.checkedOut;
    return item.checkedOut;
  });

  const handOver = async (item: DeskItem) => {
    setBusy(item.id);
    try {
      await checkOut(item.visitId);
      const fresh = await apiGet<DeskPayload>("/clinic/desk");
      setPayload(fresh);
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
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {payload?.meta ?? "Loading the desk…"}
          </p>
        </div>
        <div className="nq-btns">
          <Button variant="secondary" icon="plus" onClick={() => setCheckingIn(true)}>
            Check in a patient
          </Button>
          <Button
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
        </div>
      </div>

      {error ? <div className="note red">{error}</div> : null}

      <div className="ap-counts" style={{ marginBottom: 14 }}>
        <span className="here">
          <b>{counts?.toHandOver ?? 0}</b> to hand over
        </span>
        <span>
          <b>{counts?.waiting ?? 0}</b> waiting
        </span>
        <span>
          <b>{counts?.doneToday ?? 0}</b> done today
        </span>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTERS.map((entry) => (
          <Chip key={entry.value} active={filter === entry.value} onClick={() => setFilter(entry.value)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      {visible.length === 0 && !error ? (
        <section className="card" style={{ padding: 18 }}>
          <b style={{ fontSize: 15 }}>Nobody is waiting</b>
          <p className="t-cap" style={{ marginTop: 4 }}>
            Patients appear here as the doctor signs their prescription.
          </p>
        </section>
      ) : null}

      <div className="qitem-list">
        {visible.map((item) => (
          <DeskRow
            key={item.id}
            item={item}
            busy={busy === item.id}
            onHandOver={() => setHandingOver(item)}
          />
        ))}
      </div>

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
        onCheckOut={(item) => void handOver(item)}
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
            void apiGet<DeskPayload>("/clinic/desk").then(setPayload);
          });
        }}
      />
    </AppShell>
  );
}
