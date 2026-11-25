import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/Button";

export type DrawerProps = {
  /** The drawer is shown when this is true. */
  open: boolean;
  /** Called when the drawer should close. */
  onClose: () => void;
  /** The heading. */
  title?: string;
  /** A line under the heading. */
  description?: string;
  /** The body. */
  children: ReactNode;
  /** The footer — usually the actions. */
  footer?: ReactNode;
  /** The close button's accessible name. */
  closeLabel?: string;
  className?: string;
};

/**
 * The side drawer — the patient's full history, opened over the page.
 *
 * The stylesheet has no drawer, so this is one of ours: it rides on the same
 * `.scrim` backdrop as the dialog, and comes in from the right.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = "Close",
  className,
}: DrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();

    return () => restoreTo.current?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cn("drawer", className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panel}
      >
        <div className="drawer-head">
          <div>
            {title ? <h2 className="t-h2">{title}</h2> : null}
            {description ? <p className="t-cap">{description}</p> : null}
          </div>
          <IconButton icon="x" label={closeLabel} onClick={onClose} />
        </div>

        <div className="drawer-body">{children}</div>

        {footer ? <div className="drawer-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
