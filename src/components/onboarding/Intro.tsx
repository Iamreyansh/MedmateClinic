import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { HANDY } from "@/components/onboarding/types";

/**
 * The screen before the flow: what the clinic gets, and what to keep handy.
 */
export function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="su-intro-wrap">
      <div className="su-intro">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>
          Run your clinic on MedMate, <em>ready in 10 minutes</em>
        </h1>
        <p>14 days free with the full Clinic plan. Nothing is charged during set-up.</p>

        <div className="su-handy">
          <b>Keep these handy</b>
          <ul>
            {HANDY.map((item) => (
              <li key={item}>
                <Icon name="check" size={16} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="su-actions">
          <Button icon="spark" onClick={onStart}>
            Start
          </Button>
          <span className="su-signin">
            Already on MedMate? <Link href="/login">Sign in</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
