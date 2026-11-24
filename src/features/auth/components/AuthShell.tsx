import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export type AuthTrust = {
  label: string;
  detail: string;
};

/**
 * The split layout the sign-in and the sign-up share: the promise on a forest
 * panel, the form on a card.
 */
export function AuthShell({ side, children }: { side: ReactNode; children: ReactNode }) {
  return (
    <div className="su">
      <aside className="su-side">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
          <div className="slogan">DOCTOR DASHBOARD</div>
        </div>
        <div className="su-pitch">{side}</div>
      </aside>
      <main className="su-main">
        <div className="su-card narrow">{children}</div>
      </main>
    </div>
  );
}

/** The four standards the panel lists under the headline. */
export function AuthTrustList({ items }: { items: AuthTrust[] }) {
  return (
    <ul className="su-trust">
      {items.map((item) => (
        <li key={item.label}>
          <Icon name="shield" size={18} />
          <span>
            <b>{item.label}</b>
            <span>{item.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
