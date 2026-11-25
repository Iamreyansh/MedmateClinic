import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchVisit,
  saveConsultation,
  signPrescription,
  type ConsultationPayload,
  type DiagnosisLine,
  type MedicineLine,
  type SignedResult,
  type TestLine,
  type Visit,
  type VisitPatient,
  type Vitals,
} from "@/features/consult/api/consult";

export type ConsultState = {
  status: "idle" | "loading" | "ready" | "error";
  visit: Visit | null;
  patient: VisitPatient | null;
  vitals: Vitals | null;
  /** The draft, as the doctor left it. */
  diagnoses: DiagnosisLine[];
  medicines: MedicineLine[];
  tests: TestLine[];
  prescriptionId: string | null;
  signed: SignedResult | null;
  error: string | null;
};

const initialState: ConsultState = {
  status: "idle",
  visit: null,
  patient: null,
  vitals: null,
  diagnoses: [],
  medicines: [],
  tests: [],
  prescriptionId: null,
  signed: null,
  error: null,
};

/** Load the visit: who is in the room, and what is already written. */
export const loadVisit = createAsyncThunk("consult/load", async (visitId: string) => {
  const data = await fetchVisit(visitId);
  return { ...data, visitId };
});

/** Save the draft. */
export const saveConsult = createAsyncThunk(
  "consult/save",
  async ({ visitId, payload }: { visitId: string; payload: ConsultationPayload }) =>
    saveConsultation(visitId, payload),
);

/** Sign it. */
export const signConsult = createAsyncThunk(
  "consult/sign",
  async ({ prescriptionId }: { prescriptionId: string }) => signPrescription(prescriptionId),
);

/** The message the doctor sees when something goes wrong. */
function messageFor(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const consultSlice = createSlice({
  name: "consult",
  initialState,
  reducers: {
    /** The doctor edited a line of the draft. */
    lineAdded: (
      state,
      action: { payload: { kind: "diagnosis" | "medicine" | "test"; line: never } },
    ) => {
      const { kind, line } = action.payload;
      if (kind === "diagnosis") state.diagnoses.push(line as DiagnosisLine);
      if (kind === "medicine") state.medicines.push(line as MedicineLine);
      if (kind === "test") state.tests.push(line as TestLine);
    },
    /** The doctor took a line back out. */
    lineRemoved: (
      state,
      action: { payload: { kind: "diagnosis" | "medicine" | "test"; index: number } },
    ) => {
      const { kind, index } = action.payload;
      if (kind === "diagnosis") state.diagnoses.splice(index, 1);
      if (kind === "medicine") state.medicines.splice(index, 1);
      if (kind === "test") state.tests.splice(index, 1);
    },
    /** The doctor edited a field of the draft. */
    draftChanged: (state, action: { payload: Partial<ConsultState> }) => {
      Object.assign(state, action.payload);
    },
    /** Back to the start of the consult. */
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadVisit.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadVisit.fulfilled, (state, action) => {
        state.status = "ready";
        state.visit = action.payload.visit;
        state.patient = action.payload.patient;
        state.vitals = action.payload.vitals;
        state.diagnoses = action.payload.diagnoses ?? [];
        state.medicines = action.payload.medicines ?? [];
        state.tests = action.payload.tests ?? [];
        state.prescriptionId = action.payload.prescriptions[0]?.id ?? null;
      })
      .addCase(loadVisit.rejected, (state, action) => {
        state.status = "error";
        state.error = messageFor(action.error, "Could not load the visit");
      })
      .addCase(saveConsult.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(saveConsult.fulfilled, (state, action) => {
        state.status = "ready";
        state.prescriptionId = action.payload.prescriptionId;
      })
      .addCase(saveConsult.rejected, (state, action) => {
        state.status = "error";
        state.error = messageFor(action.error, "Could not save the consultation");
      })
      .addCase(signConsult.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signConsult.fulfilled, (state, action) => {
        state.status = "ready";
        state.signed = action.payload;
      })
      .addCase(signConsult.rejected, (state, action) => {
        state.status = "error";
        state.error = messageFor(action.error, "Could not sign the prescription");
      });
  },
});

export const consultReducer = consultSlice.reducer;
export const { lineAdded, lineRemoved, draftChanged, reset } = consultSlice.actions;
