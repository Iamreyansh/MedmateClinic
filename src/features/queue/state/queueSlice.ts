import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchQueue } from "@/features/queue/api/queue";
import type { Queue } from "@/features/queue/types";

export type QueueState = {
  status: "idle" | "loading" | "ready" | "error";
  queue: Queue | null;
  error: string | null;
};

const initialState: QueueState = { status: "idle", queue: null, error: null };

/** Load the queue. */
export const loadQueue = createAsyncThunk("queue/load", async () => fetchQueue());

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadQueue.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadQueue.fulfilled, (state, action) => {
        state.status = "ready";
        state.queue = action.payload;
      })
      .addCase(loadQueue.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Could not load the queue";
      });
  },
});

export const queueReducer = queueSlice.reducer;
