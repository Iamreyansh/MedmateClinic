"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Avatar, ClinicChip, UserChip, type AvatarTone } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { builtRoutes, nav, sideActions, type NavEntry, type Resource } from "@/lib/nav";

export type ShellUser = {
  name: string;
  initials: string;
  detail?: string;
  tone?: AvatarTone;
};

export type ShellClinic = {
  name: string;
  initials: string;
  detail?: string;
};

export type Access = {
  /** Resource → "view" | "use". A missing resource means no access. */
  levels?: Partial<Record<Resource, "view" | "use">>;
};

function NavLink({ entry, active, onNavigate }: { entry: NavEntry; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={entry.href}
      className={cn(active && "on")}
      onClick={onNavigate}
      prefetch={builtRoutes.has(entry.href)}
    >
      <Icon name={entry.icon} />
      <span className="lbl">{entry.label}</span>
      {entry.count ? <span className="count">{entry.count}</span> : null}
    </Link>
  );
}

export type SidebarProps = {
  clinic?: ShellClinic;
  activeHref?: string;
  /** Resource → level, from the server. Filters the nav. */
  access?: Access;
  onAccount?: () => void;
  onLock?: () => void;
};

export function Sidebar({ activeHref, access, onAccount, onLock }: SidebarProps) {
  const allowed = (entry: NavEntry) => {
    if (!entry.resource || !access?.levels) return true;
    return Boolean(access.levels[entry.resource]);
  };

  return (
    <aside className="side">
      <div className="lockup" style={{ padding: "0 8px 18px" }}>
        <div className="lockup">
          <div className="wordmark" style={{ fontSize: 28 }}>
            Med<span className="m">Mate</span>
          </div>
          <div className="slogan" style={{ fontSize: 7.28, marginTop: 5.6 }}>
            DOCTOR DASHBOARD
          </div>
        </div>
      </div>

      <nav className="nav" aria-label="Main">
        {nav.map((group, index) => {
          const items = group.items.filter(allowed);
          if (!items.length) return null;
          return (
            <div key={group.heading ?? index}>
              {group.heading ? <div className="nav-h">{group.heading}</div> : null}
              {items.map((entry) => (
                <NavLink key={entry.href} entry={entry} active={activeHref === entry.href} />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="side-foot">
        <button type="button" className="side-act" onClick={onAccount}>
          <Icon name={sideActions[0].icon} />
          <span className="lbl">{sideActions[0].label}</span>
        </button>
        <button type="button" className="side-act" onClick={onLock}>
          <Icon name={sideActions[1].icon} />
          <span className="lbl">{sideActions[1].label}</span>
        </button>
      </div>
    </aside>
  );
}

export type TopbarProps = {
  clinic?: ShellClinic;
  user?: ShellUser;
  /** The location the clinic is working from — "Indiranagar". */
  location?: string;
  onLock?: () => void;
  onSignOut?: () => void;
};

export function Topbar({ clinic, user, location, onLock, onSignOut }: TopbarProps) {
  return (
    <div className="topbar">
      {clinic ? (
        <ClinicChip initials={clinic.initials} name={clinic.name} detail={clinic.detail} href="/dashboard" />
      ) : null}
      <div className="grow" />
      {location ? (
        <span className="avail">
          <Icon name="pin" size={18} style={{ color: "var(--green-700)" }} />
          <span className="lbl">{location}</span>
        </span>
      ) : null}
      {user ? (
        <UserChip initials={user.initials} name={user.name} detail={user.detail} tone={user.tone} />
      ) : null}
      <IconButton icon="lock" label="Lock this device" onClick={onLock} />
      <IconButton icon="out" label="Sign out" onClick={onSignOut} />
    </div>
  );
}

export type AppShellProps = {
  children: ReactNode;
  clinic?: ShellClinic;
  user?: ShellUser;
  location?: string;
  activeHref?: string;
  access?: Access;
  onAccount?: () => void;
  onLock?: () => void;
  onSignOut?: () => void;
};

/**
 * The staff shell: a 248px dark forest sidebar beside a sticky top bar.
 * At ≤1180px the sidebar collapses to an 84px icon rail — that is the
 * stylesheet's job, not the component's.
 */
export function AppShell({
  children,
  clinic,
  user,
  location,
  activeHref,
  access,
  onAccount,
  onLock,
  onSignOut,
}: AppShellProps) {
  return (
    <div id="app">
      <Sidebar clinic={clinic} activeHref={activeHref} access={access} onAccount={onAccount} onLock={onLock} />
      <div>
        <Topbar clinic={clinic} user={user} location={location} onLock={onLock} onSignOut={onSignOut} />
        <div className="page">{children}</div>
      </div>
    </div>
  );
}

export { Avatar, Icon };
