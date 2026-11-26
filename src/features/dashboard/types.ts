import type { IconName } from "@/components/ui/Icon";
import type { IconTone } from "@/lib/design/tokens";

/**
 * The owner's dashboard, as the API sends it.
 *
 * The shapes live here, in the feature that draws them. The mock answers with
 * these shapes; the type is the contract, not the fixture.
 */

export type Station = {
  icon: IconName;
  tone: IconTone;
  title: string;
  description: string;
  tag: string;
  /** The green line under the description — how much is waiting here. */
  count?: string;
  countWarn?: boolean;
};

export type ManageLink = {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  count?: number;
};

/**
 * A doctor the clinic's dashboard lists.
 *
 * The shape is the service's: the id of the staff row, the person's name, the
 * speciality they work in, the room they work in, how many patients are
 * waiting for them, and when their next appointment is. Nothing here is
 * worked out on the client.
 */
export type DashboardDoctor = {
  /** The staff id of the doctor. */
  id: string;
  initials: string;
  name: string;
  speciality: string;
  /** The room the doctor works in. */
  room: string;
  /** How many patients are waiting for this doctor. */
  waiting: number;
  /** The doctor's next appointment, as an instant, when there is one. */
  nextAppointmentAt: string | null;
  /** Who the next appointment is with, when there is one. */
  nextAppointmentPatient: string | null;
};

export type Dashboard = {
  meta: string;
  trial: { message: string; action: string; href: string };
  stations: Station[];
  doctors: DashboardDoctor[];
  manage: ManageLink[];
};
