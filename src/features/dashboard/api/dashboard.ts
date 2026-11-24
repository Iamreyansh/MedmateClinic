import { apiGet } from "@/services/api";
import type { Dashboard } from "@/features/dashboard/types";

/** The owner’s dashboard: the trial, the stations and the manage links. */
export const fetchDashboard = () => apiGet<Dashboard>("/clinic/dashboard");
