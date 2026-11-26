"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar, type AvatarTone } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";

export type MobileHeaderProps = {
  clinicName: string;
  detail?: string;
  initials?: string;
  tone?: AvatarTone;
  onLock?: () => void;
  children?: ReactNode;
};

/**
 * The mobile header: the forest gradient, the wordmark, the lock button, the
 * avatar, and the clinic name underneath. The bottom radius is 32px.
 */
export function MobileHeader({
  clinicName,
  detail,
  initials,
  tone = "doctor",
  onLock,
  children,
}: MobileHeaderProps) {
  return (
    <header className="mob-head">
      <div className="row">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
          <div className="slogan">DOCTOR DASHBOARD</div>
        </div>
        <div className="icons">
          <IconButton icon="lock" label="Lock this device" onClick={onLock} />
          {initials ? <Avatar initials={initials} tone={tone} /> : null}
        </div>
      </div>
      <h1>{clinicName}</h1>
      {detail ? <p>{detail}</p> : null}
      {children}
    </header>
  );
}

export type MobileTabItem = {
  label: string;
  href?: string;
  icon: IconName;
  active?: boolean;
  count?: number;
  /** Run when the tab is pressed. A tab with a handler opens something. */
  onPress?: () => void;
};

export type MobileTabBarProps = HTMLAttributes<HTMLElement> & {
  items: MobileTabItem[];
};

/**
 * The mobile tab bar: a fixed white pill with a shadow. The active tab is a
 * forest tile with a gold icon; the others are muted.
 */
export function MobileTabBar({ items, className, ...rest }: MobileTabBarProps) {
  return (
    <nav className={cn("bnav", className)} {...rest}>
      {items.map((item) => {
        const content = (
          <>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.count ? <span className="count">{item.count}</span> : null}
          </>
        );
        if (item.onPress) {
          return (
            <button
              key={item.label}
              type="button"
              className={cn(item.active && "on")}
              aria-current={item.active ? "page" : undefined}
              onClick={item.onPress}
            >
              {content}
            </button>
          );
        }
        return item.href ? (
          <Link
            key={item.label}
            to={item.href}
            className={cn(item.active && "on")}
            aria-current={item.active ? "page" : undefined}
          >
            {content}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            className={cn(item.active && "on")}
            aria-current={item.active ? "page" : undefined}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}

export type MobileShellProps = {
  /** The clinic's name, in the header. */
  clinicName: string;
  /** The line under the clinic's name — "Indiranagar · 3 doctors". */
  detail?: string;
  initials?: string;
  tone?: AvatarTone;
  /** The tabs along the bottom. */
  tabs: MobileTabItem[];
  onLock?: () => void;
  children: ReactNode;
};

/**
 * The staff app on a phone: the header, the screen, and the tab bar.
 *
 * The tab bar is fixed to the bottom of the phone and the body leaves room
 * for it, so the last row of a screen is never hidden behind it.
 */
export function MobileShell({
  clinicName,
  detail,
  initials,
  tone = "doctor",
  tabs,
  onLock,
  children,
}: MobileShellProps) {
  return (
    <div className="mob-app">
      <MobileHeader
        clinicName={clinicName}
        detail={detail}
        initials={initials}
        tone={tone}
        onLock={onLock}
      />
      <div className="mob-body">{children}</div>
      <MobileTabBar items={tabs} />
    </div>
  );
}
