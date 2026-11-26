"use client";

import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { clinicTime } from "@/lib/format";
import type { DashboardDoctor } from "@/features/dashboard/types";

/**
 * One doctor's console.
 *
 * The row carries what the service knows about the doctor: the name, the
 * speciality, the room, how many patients are waiting, and when the next
 * appointment is. A field the service has not sent is shown as a dash — it is
 * never worked out here.
 */
export function DoctorConsoleCard({
  doctor,
  current,
}: {
  doctor: DashboardDoctor;
  /** The doctor whose console the signed-in person lands in. */
  current: boolean;
}) {
  /**
   * The room, when the service has one.
   *
   * The service was filling this field with the doctor's speciality until the
   * room became a column of its own, and a room that is the speciality is not
   * a room — so it is not shown as one.
   */
  const room = doctor.room && doctor.room !== doctor.speciality ? doctor.room : null;

  const next = doctor.nextAppointmentAt
    ? clinicTime(doctor.nextAppointmentAt, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";
  const patient = doctor.nextAppointmentPatient ?? null;

  const row = (
    <>
      <Avatar initials={doctor.initials} tone="doctor" />
      <div className="db-doc-who">
        <b>{doctor.name}</b>
        <small>
          {doctor.speciality}
          {room ? ` · ${room}` : " · —"}
        </small>
        <small>{next ? `Next: ${patient ? `${patient} · ` : ""}${next}` : "No appointment booked"}</small>
      </div>
      {doctor.waiting > 0 ? <div className="db-doc-count">{doctor.waiting}</div> : null}
    </>
  );

  const className = cn("db-doc", current && "current");

  // the console is opened on the doctor, so the row is a link to that console
  if (!doctor.id) {
    return <div className={className}>{row}</div>;
  }

  return (
    <Link
      to={`/queue?doctor=${encodeURIComponent(doctor.id)}`}
      className={className}
      style={{ color: "inherit", textDecoration: "none" }}
    >
      {row}
    </Link>
  );
}
