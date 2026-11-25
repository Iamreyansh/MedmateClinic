import { apiGet } from "@/services/api";
import type { ReportPayload, ReportQuery } from "@/features/reports/types/reports";

/**
 * The reports.
 *
 * One endpoint, four views. Which views a person may open comes back with the
 * payload, so the screen and the API can never disagree about it.
 */
export function fetchReport(query: ReportQuery) {
  const params = new URLSearchParams({ tab: query.tab, from: query.from, to: query.to });
  if (query.doctor) params.set("doctor", query.doctor);
  if (query.q) params.set("q", query.q);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));
  return apiGet<ReportPayload>(`/clinic/reports?${params.toString()}`);
}
