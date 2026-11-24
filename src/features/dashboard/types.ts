import type { Station, ManageLink } from "@/services/api/mock/dashboard";

export type Dashboard = {
  meta: string;
  trial: { message: string; action: string; href: string };
  stations: Station[];
  manage: ManageLink[];
};
