"use client";

import Image from "next/image";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (values: LoginForm) => {
    try {
      await login(values.email, values.password);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    }
  };

  return (
    /*
     * Two panels: the crest on its own field of azure, the form on white.
     * On a phone the artwork panel collapses to a compact band so the
     * keyboard never pushes the form out of view.
     */
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* ------------------------------- Crest ------------------------------ */}
      <section className="relative isolate overflow-hidden bg-brand-900 px-6 py-10 text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        {/* Light falling from above, in the crest's own blue and gold. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_-20%,var(--color-brand-600),transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_90%_110%,var(--color-accent-700),transparent_60%)] opacity-40"
        />
        {/* Faint rays, echoing the crest's radiating field. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background:repeating-conic-gradient(from_0deg_at_50%_0%,white_0deg_6deg,transparent_6deg_14deg)]"
        />

        <div className="flex items-center gap-4 lg:block">
          <Image
            src="/logo.png"
            alt=""
            width={96}
            height={108}
            priority
            className="h-14 w-auto drop-shadow-2xl lg:h-28"
          />
          <div className="lg:mt-8">
            <p className="label text-accent-300">Church of South India</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold leading-tight tracking-tight lg:mt-2 lg:text-4xl">
              St. Mark&apos;s Church
              <span className="block text-white/70">Madipakkam</span>
            </h1>
          </div>
        </div>

        <p className="mt-8 hidden max-w-sm text-sm leading-relaxed text-white/70 lg:block">
          The content portal. Everything published here — services, events,
          photographs and notices — is what the congregation sees on the
          church website.
        </p>
      </section>

      {/* -------------------------------- Form ------------------------------ */}
      <section className="flex items-center justify-center px-6 py-10 lg:px-14">
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use the account the church office set up for you.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                aria-invalid={Boolean(errors.email)}
                {...register("email", { required: "Enter your email address" })}
              />
              {errors.email && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password", { required: "Enter your password" })}
              />
              {errors.password && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
            Forgotten your password? An administrator can reset it for you from
            the Users page.
          </p>
        </div>
      </section>
    </main>
  );
}
