"use client";

import { Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSimpleMode } from "@/hooks/use-reduced-motion";
import { setSimpleMode } from "@/lib/motion-preference";
import { cn } from "@/lib/utils";

/**
 * The Simple mode switch: the whole site, still and plain, for a reader whose
 * phone finds the cinematic sections heavy.
 *
 * Two shapes. `icon` is a compact round button for the desktop header, beside
 * the language switcher. `row` is a full-width labelled switch for the mobile
 * menu - which is where a reader on a struggling phone will look, and where
 * there is room to say what the switch does.
 *
 * Either way it is a real switch to assistive technology (`role="switch"`,
 * `aria-checked`), and pressing it reloads the page in the other mode - see
 * `setSimpleMode` for why a reload rather than a live change.
 */
export function MotionToggle({
  variant,
  tone = "default",
  className,
}: {
  variant: "icon" | "row";
  tone?: "default" | "onDark";
  className?: string;
}) {
  const t = useTranslations("common");
  const simple = useSimpleMode();
  const onDark = tone === "onDark";
  // Bolt while the site is animated, sparkle once Simple mode is on.
  const Icon = simple ? Sparkles : Zap;

  const toggle = () =>
    setSimpleMode(
      !simple,
      simple ? t("switchingToAnimated") : t("switchingToSimple"),
    );

  if (variant === "icon") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={simple}
        aria-label={t("simpleMode")}
        title={simple ? t("simpleModeOn") : t("simpleModeHint")}
        onClick={toggle}
        data-motion-toggle
        className={cn(
          // A 32px target, the same height as the language pill beside it.
          "grid size-8 shrink-0 place-items-center rounded-full border transition-colors",
          onDark
            ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
            : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-sand-100",
          simple &&
            (onDark
              ? "bg-white text-sand-900 hover:bg-white"
              : "border-transparent bg-[var(--primary)] text-white hover:bg-[var(--primary)]"),
          className,
        )}
      >
        <Icon aria-hidden className="size-3.5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={simple}
      onClick={toggle}
      data-motion-toggle
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
        onDark ? "hover:bg-white/10" : "hover:bg-sand-100",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          onDark ? "text-white/80" : "text-[var(--muted-foreground)]",
        )}
      />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-medium",
            onDark ? "text-white" : "text-[var(--foreground)]",
          )}
        >
          {t("simpleMode")}
        </span>
        <span
          className={cn(
            "block text-xs",
            onDark ? "text-white/70" : "text-[var(--muted-foreground)]",
          )}
        >
          {simple ? t("simpleModeOn") : t("simpleModeHint")}
        </span>
      </span>

      {/* The switch itself - purely visual; the button carries the state. */}
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          simple
            ? "bg-[var(--primary)]"
            : onDark
              ? "bg-white/25"
              : "bg-sand-200",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]",
            simple ? "left-[1.125rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
