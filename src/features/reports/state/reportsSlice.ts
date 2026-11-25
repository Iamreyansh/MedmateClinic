import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchReport } from "@/features/reports/api/reports";
import type { ConsultRow, ReportPayload, ReportQuery } from "@/features/reports/types/reports";

export type ReportsState = {
  status: "idle" | "loading" | "ready" | "error";
  report: ReportPayload | null;
  /** The consultation list, kept whole while the list is being paged through. */
  consultRows: ConsultRow[];
  error: string | null;
};

const initialState: ReportsState = { status: "idle", report: null, consultRows: [], error: null };

/** Load one view of the reports. */
export const loadReport = createAsyncThunk("reports/load", async (query: ReportQuery) =>
  fetchReport(query),
);

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadReport.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadReport.fulfilled, (state, action) => {
        state.status = "ready";
        state.report = action.payload;
        const page = action.payload.consults?.rows ?? [];
        const offset = action.meta.arg.offset ?? 0;
        state.consultRows = offset > 0 ? [...state.consultRows, ...page] : page;
      })
      .addCase(loadReport.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Could not load the reports";
      });
  },
});

export const reportsReducer = reportsSlice.reducer;
