import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  icon?: IconName;
  children?: ReactNode;
};

/** A 32px pill with a 1.5px border. The product's filter and choice unit. */
export function Chip({ active, icon, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button type={type} className={cn("chip", active && "on", className)} {...rest}>
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </button>
  );
}

export function Chips({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("chips", className)} {...rest} />;
}

export type PillsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  value?: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: ReactNode }>;
  fill?: boolean;
  yesNo?: boolean;
};

/** The segmented control. One selection, always visible, never a dropdown. */
export function Pills({ value, onChange, options, fill, yesNo, className, ...rest }: PillsProps) {
  return (
    <div className={cn("pills", fill && "fill", yesNo && "yn", className)} role="group" {...rest}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(value === option.value && "on")}
          aria-pressed={value === option.value}
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
