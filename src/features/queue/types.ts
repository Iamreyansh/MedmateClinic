import type { IconName } from "@/components/ui/Icon";

/**
 * The doctor's queue, as the API sends it.
 *
 * The shapes live here, in the feature that draws them — not in the mock. The
 * mock answers with these shapes; the type is the contract, not the fixture.
 */

export type QueuePatient = {
  id: string;
  name: string;
  age: number;
  sex: string;
  initials?: string;
  phone?: string;
  abha?: string;
  allergies?: string[];
  conditions?: string[];
  visits?: number;
  since?: string;
};

export type QueueItem = {
  token: string;
  kind: "A" | "B";
  patient: QueuePatient;
  reason: string | null;
  detail: string | null;
  wait: "Next for you" | "Waiting" | "Urgent" | "Online";
  waiting: number;
  vitals?: string;
  booked?: string;
};

export type Queue = {
  items: QueueItem[];
  next: QueueItem | null;
  room: string;
  meta: string;
};

/** The icon the queue card draws, by token. */
export const tokenIcon: Record<string, IconName> = {
  A: "stetho",
  B: "nurse",
};
