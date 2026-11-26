import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "@/store";
import { AppErrorBoundary } from "@/components/ui/AppErrorBoundary";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    </AppErrorBoundary>
  );
}
