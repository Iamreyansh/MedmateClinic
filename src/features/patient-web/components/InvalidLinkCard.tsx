import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * The card for a link the clinic has to replace.
 *
 * A patient follows a link from an SMS, and by the time they open it the
 * clinic may have closed the booking, called it off, or the link may have
 * been copied. None of that is the patient's fault, and none of it is
 * something a stack trace would explain — so the card says what happened and
 * what to do next.
 */
export function InvalidLinkCard({
  clinicSlug,
  onRetry,
}: {
  /** The clinic's slug, when the patient opened the link with one. */
  clinicSlug?: string;
  /** Whether the screen can try the link again. */
  onRetry?: () => void;
}) {
  return (
    <section className="card center" style={{ padding: 20, textAlign: "center" }}>
      <span className="kiosk-ic warn">
        <Icon name="alert" size={26} />
      </span>
      <b style={{ fontSize: 16, display: "block", marginTop: 10 }}>This link is no longer valid</b>
      <p className="t-cap" style={{ marginTop: 6 }}>
        Ask the clinic for a new link.
      </p>
      <div className="kiosk-acts" style={{ marginTop: 16, justifyContent: "center" }}>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        {clinicSlug ? (
          <a className="btn sec sm" href={`/book?clinic=${encodeURIComponent(clinicSlug)}`}>
            Book a new visit
          </a>
        ) : null}
      </div>
    </section>
  );
}
