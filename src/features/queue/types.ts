import type { QueueItem } from "@/services/api/mock/clinic";

export type Queue = {
  items: QueueItem[];
  next: QueueItem | null;
  room: string;
  meta: string;
};
