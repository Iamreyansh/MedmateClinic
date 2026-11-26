import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api/client";

/**
 * How a screen's data behaves.
 *
 * Every mobile screen asks for its data the same way, so that a screen
 * cannot forget one of the four states: still loading, loaded, loaded but
 * empty, and failed with a way to try again.
 */

export type RemoteStatus = "loading" | "ready" | "error";

export type Remote<T> = {
  status: RemoteStatus;
  data: T | null;
  /** The message to show when it could not be loaded. */
  error: string | null;
  /** Whether the service could not be reached at all. */
  unreachable: boolean;
  /** The status the service answered with, when it answered at all. */
  code: number | null;
  /** Ask for the data again. */
  reload: () => void;
};

type State<T> = {
  status: RemoteStatus;
  data: T | null;
  error: string | null;
  unreachable: boolean;
  code: number | null;
  /** The request this state belongs to. */
  key: string;
  attempt: number;
};

/**
 * The message a person may read for a failure.
 *
 * The API's own client has already refused to pass on a server's internals,
 * so anything that reaches here is a message written for a person. A
 * rejection that carries no message at all gets a plain one.
 */
export function messageOf(reason: unknown): string {
  if (reason instanceof Error && reason.message.trim()) return reason.message;
  if (typeof reason === "object" && reason !== null) {
    const message = (reason as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Something went wrong. Try again.";
}

/**
 * Was this the service not answering, rather than the service saying no?
 *
 * The client keeps the two apart: a 404 from a route the service does not
 * have is an answer, and a body that was not the API's own is not. The
 * second is the "we could not reach the clinic" state, and it is shown
 * differently — there is nothing wrong with the screen, only with the way
 * to it.
 */
export function isUnreachable(reason: unknown): boolean {
  return reason instanceof ApiError && reason.kind === "service";
}

/**
 * Load a screen's data, and let it be asked for again.
 *
 * `load` is called once, and again whenever `reload` is pressed or `key`
 * changes — the key is what a screen that follows another one passes, so
 * opening a different patient loads that patient.
 */
export function useRemote<T>(load: () => Promise<T>, key = ""): Remote<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State<T>>({
    status: "loading",
    data: null,
    error: null,
    unreachable: false,
    code: null,
    key,
    attempt,
  });

  /**
   * The loader, held so that a screen may write `load` afresh on every
   * render without the request being repeated. It is written in an effect,
   * which runs before the request effect below.
   */
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  }, [load]);

  useEffect(() => {
    let alive = true;
    loader.current().then(
      (data) => {
        if (!alive) return;
        setState({
          status: "ready",
          data,
          error: null,
          unreachable: false,
          code: null,
          key,
          attempt,
        });
      },
      (reason: unknown) => {
        if (!alive) return;
        setState({
          status: "error",
          data: null,
          error: messageOf(reason),
          unreachable: isUnreachable(reason),
          code: reason instanceof ApiError ? reason.status : null,
          key,
          attempt,
        });
      },
    );
    return () => {
      alive = false;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  // A request that has been asked for but has not answered yet is still
  // loading, whatever the last answer said.
  if (state.key !== key || state.attempt !== attempt) {
    return { status: "loading", data: null, error: null, unreachable: false, code: null, reload };
  }

  return { ...state, reload };
}

/**
 * A countdown, for the code step's resend wait.
 *
 * The wait is thirty seconds, and the screen shows it going down rather
 * than locking the button and saying nothing.
 */
export function useCountdown(seconds: number): {
  left: number;
  start: () => void;
  stop: () => void;
} {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const timer = window.setTimeout(() => setLeft((count) => count - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  const start = useCallback(() => setLeft(seconds), [seconds]);
  const stop = useCallback(() => setLeft(0), []);

  return { left, start, stop };
}

/**
 * A button's own work: whether it is running, and what went wrong.
 *
 * A screen that writes — a check-in, a payment, a code — uses this so the
 * button shows its own progress and the failure lands on the screen.
 */
export function useAction(): {
  busy: boolean;
  error: string | null;
  run: <T>(work: () => Promise<T>) => Promise<T | null>;
  clear: () => void;
} {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(work: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      return await work();
    } catch (reason: unknown) {
      setError(messageOf(reason));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const clear = useCallback(() => setError(null), []);

  return { busy, error, run, clear };
}
