import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchSession } from "@/features/session/api/session";
import type { Session } from "@/features/session/types";

export type SessionState = {
  status: "idle" | "loading" | "ready" | "error";
  session: Session | null;
  error: string | null;
};

const initialState: SessionState = { status: "idle", session: null, error: null };

/** Load the session: who is signed in, and what they may open. */
export const loadSession = createAsyncThunk("session/load", async () => fetchSession());

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadSession.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        state.status = "ready";
        state.session = action.payload;
      })
      .addCase(loadSession.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Could not load the session";
      });
  },
});

export const sessionReducer = sessionSlice.reducer;
