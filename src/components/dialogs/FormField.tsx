import type { ReactNode } from "react";
import { Input, TextArea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

/**
 * The field.
 *
 * Every field in the product has a label that belongs to it, a hint under it
 * and, when something is wrong, the sentence that says what — so a person
 * never has to guess which box the message belongs to.
 */
export type FormFieldProps = {
  /** The id of the control the label points at. */
  id: string;
  /** The label. */
  label: string;
  /** A line under the field. */
  hint?: string;
  /** What is wrong, said in a sentence. */
  error?: string | null;
  /** The control. */
  children?: ReactNode;
};

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="t-cap" style={{ color: "var(--red)" }}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="t-cap">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number";
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal";
  disabled?: boolean;
};

/** A single-line field with its label, hint and error. */
export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  disabled,
}: TextFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        className={cn("input", error && "invalid")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}

export type TextAreaFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
};

/** A longer answer, for the things that need a sentence rather than a word. */
export function TextAreaField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  rows = 3,
  disabled,
}: TextAreaFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <TextArea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("input", error && "invalid")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
};

/** A choice, from a list the clinic can read. */
export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  hint,
  error,
  disabled,
}: SelectFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={cn("input", error && "invalid")}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
