/**
 * The appointments, as the API sends them.
 *
 * The front desk sees the day; the owner sees the week. Both come from the
 * same endpoint, which takes a date and a view.
 */

export type AppointmentDoctor = {
  id: string;
  name: string;
  speciality: string;
  room?: string;
};

export type AppointmentPatient = {
  id: string;
  name: string;
  age: number;
  sex: string;
  phone?: string;
};

export type Appointment = {
  id: string;
  mode: string;
  status: string;
  reason: string;
  startsAt: string;
  time: string;
  endsAt?: string;
  label?: string;
  doctorId: string | null;
  patient: AppointmentPatient;
};

export type Slot = {
  time: string;
  label: string;
  minutes: number;
};

export type AppointmentSummary = {
  booked: number;
  toCome: number;
  done: number;
  noShow: number;
};

export type DayView = {
  view: "day";
  date: string;
  dateLabel: string;
  dayStart: string;
  dayEnd: string;
  slotMinutes: number;
  slots: Slot[];
  appointments: Appointment[];
  summary: AppointmentSummary;
};

export type WeekColumn = {
  date: string;
  label: string;
  appointments: Appointment[];
};

export type WeekView = {
  view: "week";
  days: WeekColumn[];
  summary: AppointmentSummary;
};

export type AppointmentsPayload = {
  /** Set when no appointment is asked for — the day is empty. */
  doctors?: AppointmentDoctor[];
  today?: string;
} & (Partial<DayView> & Partial<WeekView>);
