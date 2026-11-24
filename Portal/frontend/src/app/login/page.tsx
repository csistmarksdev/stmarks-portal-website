"use client";

import {
  ArrowRightIcon,
  CircleAlertIcon,
  LockKeyholeIcon,
  MailIcon,
} from "lucide-react";
import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";

import { ThemeCycleButton } from "@/components/admin/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface LoginForm {
  email: string;
  password: string;
}

/**
 * Sign in.
 *
 * One continuous field of the crest's magenta - light falling from above,
 * faint rays, a warm glow low down - with the form on a frosted card floating
 * over it. Desktop sets the church's name beside the card; a phone stacks the
 * crest above it, inside the safe area, so the keyboard never pushes the form
 * out of view.
 *
 * The field is the brand's in either theme; the card follows the theme.
 */
export default function LoginPage() {
  const { login } = useAuth();
  const [failure, setFailure] = useState<string | null>(null);
  const [capsLock, setCapsLock] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (values: LoginForm) => {
    setFailure(null);
    try {
      await login(values.email, values.password);
    } catch (error) {
      // On the card, where the eye already is - not a toast in a corner.
      setFailure(error instanceof Error ? error.message : "Sign-in failed");
    }
  };

  const watchCapsLock = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-brand-950 text-white">
      {/* ------------------------------ The field ----------------------------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Light falling from above, in the seal's own magenta: centred over
            the stacked crest on a phone, over the name on a wide screen. */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,var(--color-brand-600),transparent_60%)] lg:bg-[radial-gradient(120%_80%_at_30%_-10%,var(--color-brand-600),transparent_60%)]" />
        {/* A warm glow low on the right, the flame in the crest. */}
        <div className="login-glow absolute -bottom-1/4 -right-1/4 size-[70vmax] rounded-full bg-[radial-gradient(closest-side,var(--color-accent-600),transparent)] opacity-35" />
        <div className="login-glow absolute -left-1/3 top-1/3 size-[60vmax] rounded-full bg-[radial-gradient(closest-side,var(--color-brand-500),transparent)] opacity-25 [animation-delay:-9s]" />
        {/* Faint rays, echoing the crest's radiating field. */}
        <div className="absolute inset-0 opacity-[0.06] [background:repeating-conic-gradient(from_0deg_at_50%_0%,white_0deg_5deg,transparent_5deg_13deg)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] lg:[background:repeating-conic-gradient(from_0deg_at_30%_0%,white_0deg_5deg,transparent_5deg_13deg)]" />
        {/* Fine grain, so the gradients never band. */}
        <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay [background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)]" />
      </div>

      {/* Theme, small and out of the way: light, dark or the device's own. */}
      <ThemeCycleButton className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-10 size-9 rounded-full bg-white/10 text-white/80 ring-white/20 backdrop-blur-md hover:bg-white/20 hover:text-white lg:right-6 lg:top-6" />

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] lg:grid-cols-[1.1fr_minmax(0,26rem)] lg:gap-16 lg:px-10 lg:py-16">
        {/* ------------------------------- Name ------------------------------- */}
        <section className="login-rise text-center lg:text-left">
          {/* The parish crest and the diocesan arms, as the site pairs them. */}
          <div className="flex items-end justify-center gap-3 lg:justify-start lg:gap-4">
            <Image
              src="/Logo1.svg"
              alt=""
              aria-hidden
              width={940}
              height={940}
              priority
              unoptimized
              className="size-16 object-contain drop-shadow-2xl sm:size-20 lg:size-24"
            />
            <Image
              src="/Logo2.svg"
              alt=""
              aria-hidden
              width={523}
              height={860}
              priority
              unoptimized
              className="h-14 w-auto object-contain drop-shadow-2xl sm:h-[4.5rem] lg:h-[5.25rem]"
            />
          </div>

          <p className="label mt-6 text-accent-300 lg:mt-10">Church of South India</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            St. Mark&apos;s Church
            <span className="block text-white/60">Madipakkam</span>
          </h1>
          <p className="mx-auto mt-5 hidden max-w-md text-[15px] leading-relaxed text-white/70 sm:block lg:mx-0">
            The content portal. Everything published here (services, events,
            photographs and notices) is what the congregation sees on the
            church website.
          </p>
        </section>

        {/* ------------------------------- Card ------------------------------- */}
        <section
          aria-labelledby="sign-in-title"
          className="login-rise mx-auto w-full max-w-md rounded-[2rem] bg-card/90 p-6 text-card-foreground shadow-[0_40px_80px_-24px_rgb(0_0_0/0.55)] ring-1 ring-white/15 backdrop-blur-2xl [animation-delay:120ms] sm:p-8"
        >
          <div className="mb-6">
            <h2
              id="sign-in-title"
              className="font-[family-name:var(--font-display)] text-[1.625rem] font-semibold tracking-tight"
            >
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with the account the church office set up for you.
            </p>
          </div>

          {failure && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-2xl bg-destructive/10 px-3.5 py-3 text-sm text-destructive ring-1 ring-destructive/25"
            >
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>{failure}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.org"
                  className="h-12 rounded-2xl pl-11 max-lg:h-12"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email", { required: "Enter your email address" })}
                />
              </div>
              {errors.email && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyholeIcon className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="h-12 rounded-2xl pl-11 max-lg:h-12"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={capsLock ? "caps-lock" : undefined}
                  onKeyDown={watchCapsLock}
                  onKeyUp={watchCapsLock}
                  {...register("password", { required: "Enter your password" })}
                />
              </div>
              {errors.password && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
              {capsLock && (
                <p id="caps-lock" className="text-xs font-medium text-accent-fg">
                  Caps Lock is on.
                </p>
              )}
            </div>

            {/*
              While signing in, the button draws itself in to a circle with a
              ring spinning inside it - and opens back out if the sign-in
              fails. Width and corners are animated; the label fades out
              first so it never squeezes.
            */}
            <div className="mt-2 flex justify-center">
              <Button
                type="submit"
                size="lg"
                aria-busy={isSubmitting}
                style={{ width: isSubmitting ? "3rem" : "100%" }}
                className={cn(
                  "group h-12 overflow-hidden px-0 text-[15px] transition-[width,border-radius,box-shadow] duration-500 ease-[var(--ease-out-expo)] disabled:opacity-100",
                  isSubmitting ? "rounded-full shadow-lg" : "rounded-2xl",
                )}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span
                      aria-hidden
                      className="login-ring size-5 rounded-full border-2 border-current border-r-transparent"
                    />
                    <span className="sr-only" aria-live="polite">
                      Signing in
                    </span>
                  </>
                ) : (
                  <span className="login-label flex items-center gap-2 whitespace-nowrap">
                    Sign in
                    <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Forgotten your password? An administrator can reset it for you from
            the Users page.
          </p>
        </section>
      </div>
    </main>
  );
}
