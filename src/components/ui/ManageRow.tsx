import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/Icon";

export type ManageRowProps = Omit<HTMLAttributes<HTMLAnchorElement>, "href"> & {
  icon: IconName;
  title: string;
  description?: string;
  /** A trailing number on the right — the row's own count, not a badge. */
  value?: ReactNode;
  href?: string;
};

/**
 * A manage row: the "Reports & analytics" line on the dashboard.
 * One tile, a title, a line of detail, a chevron.
 */
export function ManageRow({ icon, title, description, value, className, ...rest }: ManageRowProps) {
  return (
    <a className={cn("mg-row", className)} {...rest}>
      <span className="tile">
        <Icon name={icon} size={20} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b>{title}</b>
        {description ? <small style={{ display: "block" }}>{description}</small> : null}
      </span>
      {value ? <span className="n">{value}</span> : null}
      <Icon name="chev" size={18} className="muted-icon" />
    </a>
  );
}
