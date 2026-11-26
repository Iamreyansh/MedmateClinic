import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { checkInPatient, fetchDoctors, fetchQueue, type CheckInPayload } from "@/features/queue/api/queue";
import type { Queue } from "@/features/queue/types";

export type QueueState = {
  status: "idle" | "loading" | "ready" | "error";
  queue: Queue | null;
  /** The doctors a patient can be sent to. */
  doctors: Array<{ id: string; name: string; speciality: string }>;
  /**
   * Whether the clinic’s doctors have arrived.
   *
   * The console can be opened on one doctor, and the clinic’s own list is
   * what says whether the doctor asked for is one it has — so the queue waits
   * for this.
   */
  doctorsStatus: "idle" | "loading" | "ready" | "error";
  /** The token of the patient who was just checked in. */
  lastCheckedIn: string | null;
  error: string | null;
};

const initialState: QueueState = {
  status: "idle",
  queue: null,
  doctors: [],
  doctorsStatus: "idle",
  lastCheckedIn: null,
  error: null,
};

/**
 * Load the queue.
 *
 * The console can be scoped to one doctor, and the scope is the doctor’s id.
 */
export const loadQueue = createAsyncThunk("queue/load", async (doctorId?: string) =>
  fetchQueue(doctorId),
);

/** Load the doctors, so a patient can be sent to one. */
export const loadDoctors = createAsyncThunk("queue/doctors", async () => fetchDoctors());

/** Check a patient in, then put them at the front of the queue. */
export const checkIn = createAsyncThunk("queue/check-in", async (payload: CheckInPayload) =>
  checkInPatient(payload),
);

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
      })
      .addCase(loadDoctors.pending, (state) => {
        state.doctorsStatus = "loading";
      })
      .addCase(loadDoctors.fulfilled, (state, action) => {
        state.doctorsStatus = "ready";
        state.doctors = action.payload;
      })
      .addCase(loadDoctors.rejected, (state) => {
        state.doctorsStatus = "error";
      })
      .addCase(checkIn.pending, (state) => {
        state.error = null;
      })
      .addCase(checkIn.fulfilled, (state, action) => {
        state.lastCheckedIn = action.payload.token;
      })
      .addCase(checkIn.rejected, (state, action) => {
        state.error = action.error.message ?? "Could not check the patient in";
      });
  },
});

export const queueReducer = queueSlice.reducer;
