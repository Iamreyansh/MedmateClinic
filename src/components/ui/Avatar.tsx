import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export type AvatarTone = "doctor" | "reception" | "nurse" | "admin" | "lab" | "accounts" | "mint";

export type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  initials: string;
  tone?: AvatarTone;
  large?: boolean;
};

/**
 * The 38px gold initials tile. The tone classes are the product's own
 * (`av-doctor`, `av-nurse`, …) so an avatar always matches the person's role.
 */
export function Avatar({ initials, tone = "doctor", large, className, ...rest }: AvatarProps) {
  return (
    <div className={cn("avatar", `av-${tone}`, large && "lg", className)} {...rest}>
      {initials}
    </div>
  );
}

export type UserChipProps = HTMLAttributes<HTMLButtonElement> & {
  initials: string;
  name: string;
  detail?: string;
  tone?: AvatarTone;
};

/** The signed-in person, in the top bar. */
export function UserChip({ initials, name, detail, tone = "doctor", className, ...rest }: UserChipProps) {
  return (
    <button type="button" className={cn("userchip", className)} {...rest}>
      <Avatar initials={initials} tone={tone} />
      <span>
        <b>{name}</b>
        {detail ? <small>{detail}</small> : null}
      </span>
    </button>
  );
}

export type ClinicChipProps = HTMLAttributes<HTMLElement> & {
  initials: string;
  name: string;
  detail?: string;
  href?: string;
};

/** The clinic switcher, top-left of the top bar. */
export function ClinicChip({ initials, name, detail, href, className, ...rest }: ClinicChipProps) {
  return (
    <a className={cn("clinic-chip", className)} href={href} {...rest}>
      <span className="clinic-badge">{initials}</span>
      <span>
        <b>{name}</b>
        {detail ? <small>{detail}</small> : null}
      </span>
    </a>
  );
}

export type BadgeTone = "mint" | "gold" | "blue" | "plain" | "red" | "doc" | "purple";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  icon?: IconName;
  children?: ReactNode;
};

/** A 10.5px/800 badge. The product's smallest label — always uppercase-ish, always tracked. */
export function Badge({ tone = "mint", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn("badge", tone !== "mint" && tone, className)} {...rest}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export type TokenProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  kind?: "M" | "W";
};

/** The 56×44 token chip — the patient's place in the queue. */
export function Token({ label, kind, className, ...rest }: TokenProps) {
  return (
    <span className={cn("tk", kind, className)} {...rest}>
      {label}
    </span>
  );
}
