import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * The three states every screen has.
 *
 * A screen that is loading, a screen with nothing in it, and a screen whose
 * data could not be loaded are all states the product has to say something
 * about. They are here so that every screen says it the same way — and so
 * that a failure always offers a way to try again.
 */

/** The screen is still asking for its data. */
export function LoadingState({ title = "Loading…", copy }: { title?: string; copy?: string }) {
  return (
    <section className="card" style={{ padding: 18 }}>
      <b style={{ fontSize: 15 }}>{title}</b>
      {copy ? (
        <p className="t-cap" style={{ marginTop: 4 }}>
          {copy}
        </p>
      ) : null}
    </section>
  );
}

/** The screen has nothing to show. */
export function EmptyState({
  title,
  copy,
  icon = "folder",
  action,
}: {
  title: string;
  copy?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <section className="card" style={{ padding: 18 }}>
      <div className="empty-card">
        <Icon name={icon} size={22} />
        <div>
          <b style={{ fontSize: 15 }}>{title}</b>
          {copy ? <p>{copy}</p> : null}
          {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
        </div>
      </div>
    </section>
  );
}

/**
 * The screen could not load its data.
 *
 * The message is the one the API gave, and the API only ever gives a message
 * written for a person. A server's own words never reach here.
 */
export function ErrorState({
  message,
  onRetry,
  title = "That did not load",
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="note red">
      <Icon name="alert" size={18} />
      <div style={{ flex: 1 }}>
        <b>{title}</b>
        <p style={{ marginTop: 4 }}>{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The state of a screen that fetches its data.
 *
 * One component decides between loading, empty, error and the content, so a
 * screen cannot forget one of them.
 */
export function ScreenState({
  status,
  error,
  empty,
  loadingTitle,
  emptyTitle,
  emptyCopy,
  emptyIcon,
  onRetry,
  children,
}: {
  /** `loading`, `error`, `empty` or `ready`. */
  status: "loading" | "error" | "empty" | "ready";
  error?: string | null;
  empty?: boolean;
  loadingTitle?: string;
  emptyTitle?: string;
  emptyCopy?: string;
  emptyIcon?: IconName;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (status === "loading") return <LoadingState title={loadingTitle} />;
  if (status === "error") {
    return <ErrorState message={error ?? "Something went wrong. Try again."} onRetry={onRetry} />;
  }
  if (status === "empty" || empty) {
    return (
      <EmptyState title={emptyTitle ?? "Nothing here yet"} copy={emptyCopy} icon={emptyIcon} />
    );
  }
  return <>{children}</>;
}

/** The class a panel takes when it is being refreshed. */
export function BusyPanel({ busy, className, children }: { busy: boolean; className?: string; children: ReactNode }) {
  return <div className={cn(busy && "rp-busy", className)}>{children}</div>;
}
