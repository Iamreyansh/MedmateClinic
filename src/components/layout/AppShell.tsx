"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Avatar, ClinicChip, UserChip, type AvatarTone } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { nav, sideActions, type NavEntry, type Resource } from "@/constants/nav";
import { loadSession } from "@/features/session";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
  /** Resource → level, from the server. Filters the nav. */
  levels?: Partial<Record<Resource, "view" | "use">>;
};

function NavLink({ entry, active }: { entry: NavEntry; active: boolean }) {
  return (
    <Link to={entry.href} className={cn(active && "on")}>
      <Icon name={entry.icon} />
      <span className="lbl">{entry.label}</span>
      {entry.count ? <span className="count">{entry.count}</span> : null}
    </Link>
  );
}

export type SidebarProps = {
  activeHref?: string;
  /** Resource → level, from the server. Filters the nav. */
  access?: Access;
  /** Badge counts by href — how many people are waiting on each station. */
  counts?: Record<string, number>;
  onAccount?: () => void;
  onLock?: () => void;
};

export function Sidebar({ activeHref, access, counts, onAccount, onLock }: SidebarProps) {
  const navigate = useNavigate();
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
                <NavLink
                  key={entry.href}
                  entry={{ ...entry, count: entry.count ?? counts?.[entry.href] }}
                  active={activeHref === entry.href}
                />
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
        <button
          type="button"
          className="side-act"
          onClick={() => (onLock ? onLock() : navigate("/lock"))}
        >
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
  const navigate = useNavigate();
  const lock = () => (onLock ? onLock() : navigate("/lock"));

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
      <IconButton icon="lock" label="Lock this device" onClick={lock} />
      <IconButton icon="out" label="Sign out" onClick={onSignOut} />
    </div>
  );
}

export type AppShellProps = {
  children: ReactNode;
  activeHref?: string;
  onAccount?: () => void;
  onLock?: () => void;
  onSignOut?: () => void;
};

/**
 * The staff shell: a 248px dark forest sidebar beside a sticky top bar.
 *
 * The clinic, the person signed in and what they may open come from the
 * session — the server decides, the shell only draws. At ≤1180px the sidebar
 * collapses to an 84px icon rail; that is the stylesheet's job.
 */
export function AppShell({ children, activeHref, onAccount, onLock, onSignOut }: AppShellProps) {
  const dispatch = useAppDispatch();
  const { status, session } = useAppSelector((state) => state.session);

  useEffect(() => {
    if (status === "idle") void dispatch(loadSession());
  }, [dispatch, status]);

  return (
    <div id="app">
      <Sidebar
        activeHref={activeHref}
        access={{ levels: session?.capabilities }}
        counts={session?.navCounts}
        onAccount={onAccount}
        onLock={onLock}
      />
      <main className="content">
        <Topbar
          clinic={
            session
              ? {
                  name: session.clinic.name,
                  initials: session.clinic.initials,
                  detail: `${session.clinic.locations} locations · ${session.clinic.doctors} doctors`,
                }
              : undefined
          }
          user={
            session
              ? {
                  name: session.user.name,
                  initials: session.user.initials,
                  detail: session.user.detail,
                  tone: session.user.tone,
                }
              : undefined
          }
          location={session?.location}
          onLock={onLock}
          onSignOut={onSignOut}
        />
        <div className="page">{children}</div>
      </main>
    </div>
  );
}

export { Avatar, Icon };
