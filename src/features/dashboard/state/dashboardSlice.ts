import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchDashboard } from "@/features/dashboard/api/dashboard";
import type { Dashboard } from "@/features/dashboard/types";

export type DashboardState = {
  status: "idle" | "loading" | "ready" | "error";
  dashboard: Dashboard | null;
  error: string | null;
};

const initialState: DashboardState = { status: "idle", dashboard: null, error: null };

/** Load the dashboard. */
export const loadDashboard = createAsyncThunk("dashboard/load", async () => fetchDashboard());

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.status = "ready";
        state.dashboard = action.payload;
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Could not load the dashboard";
      });
  },
});

export const dashboardReducer = dashboardSlice.reducer;
