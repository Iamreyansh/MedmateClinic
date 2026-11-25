import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiPost } from "@/services/api";
import { auth } from "@/services/api/client";

export type AuthState = {
  status: "idle" | "sending" | "sent" | "verifying" | "unlocking" | "signed-in" | "error";
  /** The code the API returned in test mode, so a developer can sign in. */
  testCode: string | null;
  error: string | null;
};

const initialState: AuthState = { status: "idle", testCode: null, error: null };

/** Send the code to a mobile number. */
export const requestCode = createAsyncThunk(
  "auth/requestCode",
  async (phone: string) => apiPost<{ sent: boolean; code?: string }>("/auth/otp", { phone }),
);

/** Check the code and open the session. */
export const verifyCode = createAsyncThunk(
  "auth/verifyCode",
  async ({ phone, code }: { phone: string; code: string }) => {
    const result = await apiPost<{ accessToken: string }>("/auth/verify", { phone, code });
    auth.set(result.accessToken);
    return result.accessToken;
  },
);

/** Unlock a device with the PIN. */
export const unlockDevice = createAsyncThunk(
  "auth/unlock",
  async ({ clinicId, pin }: { clinicId: string; pin: string }) => {
    const result = await apiPost<{ accessToken: string }>("/auth/unlock", { clinicId, pin });
    auth.set(result.accessToken);
    return result.accessToken;
  },
);

/** The message the person sees when something goes wrong. */
function messageFor(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signedOut: (state) => {
      state.status = "idle";
      state.error = null;
      state.testCode = null;
      auth.set(null);
    },
    /** The person asked for a new code, so the old one is no longer useful. */
    codeCleared: (state) => {
      state.testCode = null;
      state.error = null;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestCode.pending, (state) => {
        state.status = "sending";
        state.error = null;
      })
      .addCase(requestCode.fulfilled, (state, action) => {
        state.status = "sent";
        state.testCode = action.payload.code ?? null;
      })
      .addCase(requestCode.rejected, (state, action) => {
        state.status = "error";
        state.error = messageFor(action.error, "Could not send the code");
      })
      .addCase(verifyCode.pending, (state) => {
        state.status = "verifying";
        state.error = null;
      })
      .addCase(verifyCode.fulfilled, (state) => {
        state.status = "signed-in";
        state.error = null;
      })
      .addCase(verifyCode.rejected, (state, action) => {
        state.status = "error";
        state.error = messageFor(action.error, "That code is not right");
      })
      .addCase(unlockDevice.pending, (state) => {
        state.status = "unlocking";
        state.error = null;
      })
      .addCase(unlockDevice.fulfilled, (state) => {
        state.status = "signed-in";
        state.error = null;
      })
      .addCase(unlockDevice.rejected, (state, action) => {
        state.status = "error";
        state.error = messageFor(action.error, "That PIN is not right");
      });
  },
});

export const authReducer = authSlice.reducer;
export const { signedOut, codeCleared } = authSlice.actions;
