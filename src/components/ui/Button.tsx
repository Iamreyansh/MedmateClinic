import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "forest" | "gold" | "danger";
export type ButtonSize = "md" | "sm" | "block";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "sec",
  ghost: "ghost",
  forest: "forest",
  gold: "gold",
  danger: "danger",
};

/**
 * The product's button. Height 44 (34 for `sm`), radius 12, weight 700.
 * The variants map to the stylesheet's own classes — no new class names.
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cn("btn", VARIANT[variant], size !== "md" && size, className)} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} /> : null}
    </button>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  pip?: boolean;
};

/**
 * A 44×44 bordered square button. The label is required: an icon-only control
 * needs an accessible name, and it belongs on the control, not the SVG.
 */
export function IconButton({ icon, label, pip, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button type={type} className={cn("iconbtn", className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
      {pip ? <span className="pip" /> : null}
    </button>
  );
}
