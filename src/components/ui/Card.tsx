import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";
import type { IconTone } from "@/lib/design/tokens";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...rest} />;
}

export type StationCardProps = HTMLAttributes<HTMLDivElement> & {
  icon: IconName;
  tone?: IconTone;
  title: string;
  description?: string;
  /** The count line under the description — "4 waiting". */
  count?: string;
  /** A count that needs attention turns gold. */
  countWarn?: boolean;
  tag?: string;
};

/**
 * The station card — 316×162, radius 18, padding 18, gap 6, min-height 150.
 * These numbers are fixed (fidelity rule 4). A different card is a new type,
 * not a bent `.st-card`.
 */
export function StationCard({
  icon,
  tone = "green",
  title,
  description,
  count,
  countWarn,
  tag,
  className,
  ...rest
}: StationCardProps) {
  return (
    <div className={cn("st-card", className)} {...rest}>
      <span className={cn("st-ico", tone)}>
        <Icon name={icon} size={24} />
      </span>
      <b>{title}</b>
      {description ? <p>{description}</p> : null}
      {count ? <span className={cn("st-count", countWarn && "warn")}>{count}</span> : null}
      {tag ? <span className="st-tag">{tag}</span> : null}
    </div>
  );
}

export type StatTileProps = HTMLAttributes<HTMLDivElement> & {
  value: ReactNode;
  label: string;
  hot?: boolean;
};

/** A queue stat: 22px/800 value over a 12px label. */
export function StatTile({ value, label, hot, className, ...rest }: StatTileProps) {
  return (
    <div className={cn("qstat", hot && "hot", className)} {...rest}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function StatTiles({ count, className, ...rest }: HTMLAttributes<HTMLDivElement> & { count?: 3 | 4 }) {
  return <div className={cn("qstats", count === 4 && "four", className)} {...rest} />;
}

export type KpiProps = HTMLAttributes<HTMLDivElement> & {
  value: ReactNode;
  label: string;
  icon?: IconName;
  detail?: string;
  dark?: boolean;
};

/** A KPI tile: 30px/800 value, 12.5px label with an icon tile, optional detail. */
export function Kpi({ value, label, icon, detail, dark, className, ...rest }: KpiProps) {
  return (
    <div className={cn("kpi", dark && "dark", className)} {...rest}>
      <span className="v">{value}</span>
      <span className="l">
        {icon ? (
          <span className="tile">
            <Icon name={icon} size={16} />
          </span>
        ) : null}
        {label}
      </span>
      {detail ? <span className="d">{detail}</span> : null}
    </div>
  );
}

export function Kpis({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("kpis", className)} {...rest} />;
}

export type NoteTone = "mint" | "gold" | "red" | "blue";

export type NoteProps = HTMLAttributes<HTMLDivElement> & {
  tone?: NoteTone;
  icon?: IconName;
  children?: ReactNode;
};

/** The inline message strip: a 12.5px line in a 12px-radius tinted box. */
export function Note({ tone = "mint", icon, className, children, ...rest }: NoteProps) {
  return (
    <div className={cn("note", tone, className)} {...rest}>
      {icon ? <Icon name={icon} size={18} /> : null}
      <div>{children}</div>
    </div>
  );
}

export type TitleProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: 1 | 2 | 3;
  emphasis?: string;
};

/**
 * The screen heading. `.t-h1`/`.t-h2`/`.t-h3`, with an emphasised span that
 * turns green — the product's way of naming a person inside a sentence.
 */
export function Title({ level = 1, emphasis, className, children, ...rest }: TitleProps) {
  const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1";
  return (
    <Tag className={cn(`t-h${level}`, className)} {...rest}>
      {children}
      {emphasis ? <em> {emphasis}</em> : null}
    </Tag>
  );
}
