import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { cn } from "@/lib/cn";

/**
 * The pieces every mobile screen is built from.
 *
 * The product's own state components — the loading card, the empty card and
 * the error with a way to try again — are used as they are, so a phone
 * screen says the same thing a desktop screen does.
 */

/** The heading under the header, and the line under it. */
export function MobileTitle({
  title,
  line,
  emphasis,
}: {
  title: string;
  line?: string;
  emphasis?: string;
}) {
  return (
    <div className="mob-title">
      <h2>
        {title}
        {emphasis ? <em style={{ color: "var(--green)", fontStyle: "normal" }}> {emphasis}</em> : null}
      </h2>
      {line ? <p>{line}</p> : null}
    </div>
  );
}

/** A card, with a heading row. */
export function MobileCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mob-card", className)}>
      {title || action ? (
        <div className="mob-card-h">
          {title ? <b>{title}</b> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A row of counters. */
export function MobileStats({
  items,
  three,
  four,
}: {
  items: Array<{ value: ReactNode; label: string; hot?: boolean }>;
  three?: boolean;
  four?: boolean;
}) {
  return (
    <div className={cn("mob-stats", three && "three", four && "four")}>
      {items.map((item) => (
        <div key={item.label} className={cn("mob-stat", item.hot && "hot")}>
          <b>{item.value}</b>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/** A row: an icon, the words, and what is at the end of it. */
export function MobileRow({
  icon,
  title,
  body,
  end,
  href,
  onPress,
  count,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  end?: ReactNode;
  href?: string;
  onPress?: () => void;
  count?: number;
}) {
  const inside = (
    <>
      {icon ? (
        <span className="ico">
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <span className="txt">
        <b>{title}</b>
        {body ? <small>{body}</small> : null}
      </span>
      <span className="end">
        {count ? <span className="badge mint">{count}</span> : null}
        {end}
      </span>
    </>
  );

  if (href) {
    return (
      <Link to={href} className="mob-row">
        {inside}
      </Link>
    );
  }
  if (onPress) {
    return (
      <button type="button" className="mob-row" onClick={onPress}>
        {inside}
      </button>
    );
  }
  return <div className="mob-row">{inside}</div>;
}

/** A key and its value, the way the patient pages read out a booking. */
export function MobileKeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mob-kv">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

/** The screen is still asking for its data. */
export function MobileLoading({ title = "Loading…" }: { title?: string }) {
  return <LoadingState title={title} />;
}

/** The screen has nothing to show. */
export function MobileEmpty({
  title,
  copy,
  action,
}: {
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return <EmptyState title={title} copy={copy} action={action} />;
}

/**
 * The screen could not load its data, and offers a way to try again.
 *
 * When the service itself could not be reached, that is said plainly: the
 * screen is fine, the way to it is not, and the way to try again is the
 * same one.
 */
export function MobileError({
  message,
  onRetry,
  unreachable,
}: {
  message: string;
  onRetry: () => void;
  unreachable?: boolean;
}) {
  if (unreachable) {
    return (
      <div className="note red" role="alert">
        <Icon name="alert" size={18} />
        <div style={{ flex: 1 }}>
          <b>The clinic service cannot be reached</b>
          <p style={{ marginTop: 4 }}>{message}</p>
        </div>
        <button type="button" className="btn sec sm" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  return <ErrorState message={message} onRetry={onRetry} />;
}

/**
 * The queue slip — the number the desk reads out.
 *
 * It is the patient's number, not the link key, and it never travels in a
 * link a patient can see.
 */
export function QueueSlip({ label, note }: { label: string; note?: string }) {
  return (
    <div className="mob-slip">
      <b>{label}</b>
      {note ? <span>{note}</span> : null}
    </div>
  );
}
