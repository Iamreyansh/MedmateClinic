"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MobileShell, type MobileTabItem } from "@/mobile/chrome";
import { loadSession } from "@/features/session";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * The two shells the phone app has.
 *
 * The staff app is one shell with five tabs and a sheet for the rest; the
 * patient app is one shell with its own five tabs. Both draw the same
 * chrome the reference pixels show: the forest header, the white pill of
 * tabs, and the room at the bottom for the home indicator.
 */

/** The staff app's five tabs, and the sheet behind "More". */
const STAFF_TABS: Array<{ label: string; icon: IconName; href: string }> = [
  { label: "Dashboard", icon: "home", href: "/m/dashboard" },
  { label: "Console", icon: "stetho", href: "/m/console" },
  { label: "Inbox", icon: "inbox", href: "/m/inbox" },
  { label: "Patients", icon: "folder", href: "/m/patients" },
];

/** The rest of the staff app, one sheet away. */
const STAFF_MORE: Array<{ label: string; icon: IconName; href: string; note: string }> = [
  { label: "Reception Desk", icon: "print", href: "/m/desk", note: "Who is waiting to be handed over" },
  { label: "Billing & POS", icon: "rupee", href: "/m/billing", note: "The till for the day" },
  { label: "Appointments", icon: "cal", href: "/m/schedule", note: "The day's book" },
  { label: "Patient messages", icon: "send", href: "/m/messages", note: "What has been sent" },
  { label: "Nurse Station", icon: "nurse", href: "/m/nurse", note: "Vitals and who is ready" },
  { label: "Lab & Diagnostics", icon: "lab", href: "/m/lab", note: "The bench" },
  { label: "Teleconsult", icon: "video", href: "/m/teleconsult", note: "The waiting room" },
  { label: "My templates", icon: "rx", href: "/m/templates", note: "Saved prescriptions" },
  { label: "Reports", icon: "chart", href: "/m/reports", note: "Bookings, money and clinical" },
  { label: "Doctors", icon: "stetho", href: "/m/doctors", note: "The clinic's doctors" },
  { label: "Locations", icon: "pin", href: "/m/locations", note: "The branches" },
  { label: "Staff & roles", icon: "users", href: "/m/staff", note: "Who may open what" },
  { label: "Subscription", icon: "spark", href: "/m/subscription", note: "The plan and the trial" },
  { label: "Settings", icon: "gear", href: "/m/settings", note: "The clinic's card" },
];

export type StaffShellProps = {
  /** The path of the screen on show, so the right tab is the lit one. */
  activeHref: string;
  children: ReactNode;
};

/**
 * The staff app on a phone.
 *
 * The clinic, the person signed in and the badge counts come from the
 * session — the server decides, the shell only draws.
 */
export function StaffShell({ activeHref, children }: StaffShellProps) {
  const dispatch = useAppDispatch();
  const { status, session } = useAppSelector((state) => state.session);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (status === "idle") void dispatch(loadSession());
  }, [dispatch, status]);

  const inboxCount = session?.navCounts?.["/inbox"] ?? 0;

  const tabs: MobileTabItem[] = [
    ...STAFF_TABS.map((tab) => ({
      label: tab.label,
      icon: tab.icon,
      href: tab.href,
      active: activeHref === tab.href,
      count: tab.href === "/m/inbox" ? inboxCount : undefined,
    })),
    { label: "More", icon: "more", active: more, onPress: () => setMore(true) },
  ];

  return (
    <>
      <MobileShell
        clinicName={session?.clinic.name ?? "MedMate Clinic"}
        detail={
          session
            ? `${session.location} · ${session.clinic.doctors} doctors`
            : "Loading the clinic…"
        }
        initials={session?.user.initials}
        tone={session?.user.tone}
        tabs={tabs}
      >
        {children}
      </MobileShell>
      {more ? <MoreSheet onClose={() => setMore(false)} /> : null}
    </>
  );
}

/**
 * The rest of the staff app, one sheet away.
 *
 * It is a real dialog: it takes the focus, Escape closes it, and the links
 * inside it are ordinary links.
 */
function MoreSheet({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="mob-sheet">
      <button type="button" className="scrim" aria-label="Close" onClick={onClose} />
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label="More"
        tabIndex={-1}
        ref={panel}
      >
        <h3>More</h3>
        <div className="grid">
          {STAFF_MORE.map((entry) => (
            <Link key={entry.href} to={entry.href} className="mob-row" onClick={onClose}>
              <span className="ico">
                <Icon name={entry.icon} size={18} />
              </span>
              <span className="txt">
                <b>{entry.label}</b>
                <small>{entry.note}</small>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The patient app's five tabs. */
const PHONE_TABS: Array<{ label: string; icon: IconName; href: string }> = [
  { label: "Visit", icon: "queue", href: "/m/visit" },
  { label: "Book", icon: "cal", href: "/m/book" },
  { label: "Symptoms", icon: "pen", href: "/m/symptoms" },
  { label: "Verify", icon: "shield", href: "/m/verify" },
];

export type PhoneTabBarProps = {
  /** The link key, when the screen has one. It is never shown. */
  linkKey?: string;
  /** The path of the screen on show, so the right tab is the lit one. */
  activeHref: string;
};

/**
 * The patient app's bottom tabs.
 *
 * A patient app has the same five tabs the staff app has, carrying the link
 * key on so that going from the queue to the symptoms form does not lose
 * their place. The key stays in the URL and is never drawn.
 */
export function PhoneTabBar({ linkKey, activeHref }: PhoneTabBarProps) {
  const [more, setMore] = useState(false);

  const withKey = (href: string) => (linkKey ? `${href}/${linkKey}` : href);

  const tabs: Array<MobileTabItem & { href: string }> = [
    ...PHONE_TABS.map((tab) => ({
      label: tab.label,
      icon: tab.icon,
      href: withKey(tab.href),
      active: activeHref === tab.href,
    })),
    { label: "More", icon: "more", href: "/m/legal", active: more, onPress: () => setMore(true) },
  ];

  return (
    <>
      <nav className="bnav" aria-label="Main">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.href}
            className={tab.active ? "on" : undefined}
            aria-current={tab.active ? "page" : undefined}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
      {more ? <PhoneMoreSheet onClose={() => setMore(false)} linkKey={linkKey} /> : null}
    </>
  );
}

export type PhoneShellProps = {
  /** The link key, when the screen has one. It is never shown. */
  linkKey?: string;
  activeHref: string;
  children: ReactNode;
};

/**
 * The patient app on a phone.
 *
 * The tabs carry the link key on, so a patient who opens the queue can go
 * to the symptoms form without losing their place. The key stays in the
 * URL and is never drawn.
 */
export function PhoneShell({ linkKey, activeHref, children }: PhoneShellProps) {
  return (
    <div className="mob-phone">
      <div className="mob-body">{children}</div>
      <PhoneTabBar linkKey={linkKey} activeHref={activeHref} />
    </div>
  );
}

/** The rest of the patient app. */
function PhoneMoreSheet({
  onClose,
  linkKey,
}: {
  onClose: () => void;
  linkKey?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const entries: Array<{ label: string; icon: IconName; href: string; note: string }> = [
    {
      label: "Check in at the clinic",
      icon: "kiosk",
      href: "/m/checkin",
      note: "For the phone at the front desk",
    },
    {
      label: "Legal documents",
      icon: "cert",
      href: "/m/legal",
      note: "Terms, privacy and the clinic declaration",
    },
    {
      label: "Verify a certificate",
      icon: "cert",
      href: "/m/verify/certificate",
      note: "Check a medical certificate is genuine",
    },
    {
      label: "Manage a booking",
      icon: "cal",
      href: linkKey ? `/m/manage/${linkKey}` : "/m/manage",
      note: "See or move your visit",
    },
  ];

  return (
    <div className="mob-sheet">
      <button type="button" className="scrim" aria-label="Close" onClick={onClose} />
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label="More"
        tabIndex={-1}
        ref={panel}
      >
        <h3>More</h3>
        <div className="grid">
          {entries.map((entry) => (
            <Link key={entry.href} to={entry.href} className="mob-row" onClick={onClose}>
              <span className="ico">
                <Icon name={entry.icon} size={18} />
              </span>
              <span className="txt">
                <b>{entry.label}</b>
                <small>{entry.note}</small>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
