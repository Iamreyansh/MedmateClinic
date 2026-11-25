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

export type DashboardDoctor = {
  initials: string;
  name: string;
  speciality: string;
  room: string;
  waiting: number;
  current?: boolean;
};

export type Dashboard = {
  meta: string;
  trial: { message: string; action: string; href: string };
  stations: Station[];
  doctors: DashboardDoctor[];
  manage: ManageLink[];
};
