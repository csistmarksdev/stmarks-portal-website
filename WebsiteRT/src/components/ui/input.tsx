import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared field surface. Rounded to the sanctuary radius with a soft inner
 * highlight; the border warms to azure on focus and lifts a faint ring, so a
 * field reads as an invited, premium input rather than a boxed control. The
 * label floats as a peer (see `Field`), so the control carries extra top
 * padding to make room for it.
 */
const fieldStyles =
  "peer w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 pb-2 pt-6 text-base text-[var(--foreground)] shadow-[inset_0_1px_0_oklch(1_0_0/0.6)] transition-all duration-300 placeholder:text-transparent hover:border-sand-300 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-crimson-400 aria-[invalid=true]:focus:ring-crimson-500/15";

/**
 * Floating-label field - the redesign's form control. The label rests inside
 * the field at full size, then rises and shrinks to a gilded cap as the field
 * gains focus or content, driven purely by `:placeholder-shown` so it needs no
 * JS state. Renders an `input` or a `textarea` via `multiline`.
 */
export function Field({
  id,
  label,
  required,
  error,
  multiline,
  rows = 6,
  className,
  ...props
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  rows?: number;
} & ComponentProps<"input"> &
  ComponentProps<"textarea">) {
  const invalid = Boolean(error);
  const errorId = `${id}-error`;
  const shared = {
    id,
    // A real (space) placeholder keeps `:placeholder-shown` valid while the
    // text itself is transparent, so the floating label is the only thing seen.
    placeholder: " ",
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? errorId : undefined,
    "aria-required": required || undefined,
  } as const;

  const labelEl = (
    <label
      htmlFor={id}
      className={cn(
        "pointer-events-none absolute left-4 top-4 origin-left text-base text-sand-500 transition-all duration-200 ease-[var(--ease-out-expo)]",
        // Floated state: focused, or holding content.
        "peer-focus:top-2 peer-focus:text-[0.7rem] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-[0.1em] peer-focus:text-brand-700",
        "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[0.7rem] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.1em]",
        invalid && "peer-focus:text-crimson-600",
      )}
    >
      {label}
      {required ? (
        <span aria-hidden className="ml-0.5 text-crimson-500">
          *
        </span>
      ) : null}
    </label>
  );

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          {...shared}
          rows={rows}
          className={cn(fieldStyles, "min-h-32 resize-y", className)}
          {...(props as ComponentProps<"textarea">)}
        />
      ) : (
        <input
          {...shared}
          className={cn(fieldStyles, className)}
          {...(props as ComponentProps<"input">)}
        />
      )}
      {labelEl}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

/** Inline validation message, wired to a field via `aria-describedby`. */
export function FieldError({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  if (!children) return null;

  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 pl-1 text-sm font-medium text-crimson-600"
    >
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------------------
 * Legacy primitives - kept for any bare inputs outside the floating-label
 * `Field`. They share the same surface language.
 * ------------------------------------------------------------------------- */

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input className={cn(fieldStyles, "pt-3", className)} {...props} />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldStyles, "min-h-32 resize-y pt-3", className)}
      {...props}
    />
  );
}

export function Label({
  className,
  required,
  children,
  ...props
}: ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden className="ml-0.5 text-crimson-500">
          *
        </span>
      ) : null}
    </label>
  );
}
