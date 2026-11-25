import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/Button";

export type DialogSize = "default" | "wide" | "full";

export type DialogProps = {
  /** The dialog is shown when this is true. */
  open: boolean;
  /** Called when the dialog should close — the close button, Escape, or the scrim. */
  onClose: () => void;
  /** The heading. It names what the dialog does. */
  title?: string;
  /** A line under the heading, in the product's voice. */
  description?: string;
  size?: DialogSize;
  /** The class the stylesheet knows this dialog by, e.g. `tp-editor`. */
  variant?: string;
  /** The body. */
  children: ReactNode;
  /** The footer — usually the actions. */
  footer?: ReactNode;
  /** The close button's accessible name. */
  closeLabel?: string;
  /** Hide the close button, for a dialog that must be answered. */
  hideClose?: boolean;
  className?: string;
};

/**
 * The dialog.
 *
 * The stylesheet already draws one: `.scrim` is the dimmed backdrop, `.modal`
 * is the sheet on top of it. This component puts those two together and gives
 * them the behaviour the stylesheet cannot — the scrim closes on a click, Escape
 * closes, and the focus moves into the dialog and comes back when it closes.
 *
 * It is a portal, so a dialog inside a scrolling page is still centred on the
 * screen, and it is not clipped by an ancestor with `overflow:hidden`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "default",
  variant,
  children,
  footer,
  closeLabel = "Close",
  hideClose,
  className,
}: DialogProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  // Escape closes, and Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = sheet.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Move the focus in when it opens, and back where it was when it closes.
  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const target = sheet.current?.querySelector<HTMLElement>(
      'input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled])',
    );
    target?.focus();

    return () => restoreTo.current?.focus?.();
  }, [open]);

  // The page behind must not scroll while the dialog is up.
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
        // Only a click on the backdrop itself closes it — a click that started
        // inside the sheet and ended outside must not throw the work away.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cn("modal", size === "wide" && "wide", size === "full" && "full", variant, className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={sheet}
      >
        {title || description || !hideClose ? (
          <div className="dlg-head">
            <div>
              {title ? <h2 className="t-h2">{title}</h2> : null}
              {description ? <p className="t-cap">{description}</p> : null}
            </div>
            {hideClose ? null : (
              <IconButton icon="x" label={closeLabel} onClick={onClose} />
            )}
          </div>
        ) : null}

        <div className="dlg-body">{children}</div>

        {footer ? <div className="dlg-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
