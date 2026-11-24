import { apiGet } from "@/services/api";
import type { Session } from "@/features/session/types";

/** The signed-in person's clinic, their role and what they may open. */
export const fetchSession = () => apiGet<Session>("/me");
