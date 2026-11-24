import { apiGet } from "@/services/api";
import type { Queue } from "@/features/queue/types";

/** The doctor’s queue for today. */
export const fetchQueue = () => apiGet<Queue>("/clinic/queue");
