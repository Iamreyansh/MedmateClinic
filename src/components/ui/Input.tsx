import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

/** 46px field, 1.5px border, radius 12. Focus ring is mint-200 at 3px. */
export function Input({ className, invalid, ...rest }: InputProps) {
  return <input className={cn("input", invalid && "invalid", className)} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input", className)} {...rest} />;
}

export type SearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: IconName;
};

/** A search field with the magnifier set into the field, as the MVP does it. */
export function SearchInput({ icon = "search", className, ...rest }: SearchInputProps) {
  return (
    <span className="search-in">
      <Icon name={icon} />
      <input className={cn("input", className)} {...rest} />
    </span>
  );
}
