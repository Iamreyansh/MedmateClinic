import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer } from "@/features/session";
import { queueReducer } from "@/features/queue";
import { dashboardReducer } from "@/features/dashboard";
import { authReducer } from "@/features/auth";

/**
 * The store.
 *
 * One slice per feature; features are entered through their index, so the
 * store is the only place that knows about all of them.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    session: sessionReducer,
    queue: queueReducer,
    dashboard: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { useAppDispatch, useAppSelector } from "@/store/hooks";
