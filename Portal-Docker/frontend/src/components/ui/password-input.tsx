"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a reveal toggle.
 *
 * Typing a password blind is the usual cause of a failed sign-in, so being
 * able to check it is worth more than the shoulder-surfing risk — hidden is
 * still the default, and the field reverts to hidden when it loses focus so a
 * revealed password is never left on screen.
 *
 * Spreads onto the underlying input, so `{...register("password")}` works.
 */
function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        // Room for the toggle so a long password never runs under it.
        className={cn("pr-11", className)}
        onBlur={(event) => {
          setVisible(false);
          props.onBlur?.(event);
        }}
      />
      <button
        type="button"
        // Keeps focus in the field, so blur-to-hide isn't triggered by the
        // click that asked to reveal it.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
