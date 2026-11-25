import { AppShell } from "@/components/layout/AppShell";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Link } from "react-router-dom";

/**
 * The screens that are not built yet.
 *
 * The nav links to all eighteen stations, so a link that leads nowhere is a
 * dead end the person can fall into. This screen says plainly that the screen
 * is not built yet, and sends them back to somewhere they can work — it never
 * pretends to be the real thing.
 */
export type PlaceholderScreenProps = {
  /** The path, so the sidebar knows where the person is. */
  activeHref?: string;
  title: string;
  icon: IconName;
  /** What this screen will do, in one line. */
  purpose: string;
  /** What has to be true before it can be built. */
  dependsOn?: string;
};

export function PlaceholderScreen({
  activeHref,
  title,
  icon,
  purpose,
  dependsOn,
}: PlaceholderScreenProps) {
  return (
    <AppShell activeHref={activeHref}>
      <div className="hello">
        <div>
          <h1 className="t-h1">
            {title} is <em>not built yet</em>
          </h1>
          <p>{purpose}</p>
        </div>
      </div>

      <section className="card" style={{ padding: 18, maxWidth: 560 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="st-ico blue">
            <Icon name={icon} size={24} />
          </span>
          <div>
            <b style={{ fontSize: 16 }}>{title}</b>
            <p className="t-cap" style={{ marginTop: 2 }}>
              {purpose}
            </p>
          </div>
        </div>

        <div className="note gold" style={{ marginTop: 16, alignItems: "center", gap: 10 }}>
          <Icon name="alert" size={18} />
          <span>
            This screen has not been built yet. Nothing here is real, and nothing here touches a
            patient&apos;s record.
          </span>
        </div>

        {dependsOn ? (
          <p className="t-cap" style={{ marginTop: 12 }}>
            It waits on {dependsOn}.
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Link to="/dashboard" className="btn sec">
            Back to the dashboard
          </Link>
          <Link to="/queue" className="btn ghost">
            Open the Doctor Console
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
