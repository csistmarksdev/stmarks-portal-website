"use client";

import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { submitContactForm } from "@/services";
import type { ContactFormValues } from "@/types/content";

type FieldErrors = Partial<Record<keyof ContactFormValues, string>>;

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "done"; success: boolean; messageKey: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const t = useTranslations("contact.form");

  const [values, setValues] = useState<ContactFormValues>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });

  function update<K extends keyof ContactFormValues>(
    field: K,
    value: ContactFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear the error as soon as the user starts correcting the field.
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};

    if (!values.name.trim()) next.name = t("errors.name");
    if (!EMAIL_PATTERN.test(values.email.trim())) next.email = t("errors.email");
    if (!values.subject.trim()) next.subject = t("errors.subject");
    if (values.message.trim().length < 10) next.message = t("errors.message");

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setStatus({ state: "submitting" });

    const result = await submitContactForm(values);

    setStatus({
      state: "done",
      success: result.success,
      messageKey: result.messageKey,
    });

    if (result.success) {
      setValues({ name: "", email: "", phone: "", subject: "", message: "" });
    }
  }

  const isSubmitting = status.state === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="contact-name"
          name="name"
          label={t("name")}
          required
          autoComplete="name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
        />

        <Field
          id="contact-email"
          name="email"
          type="email"
          label={t("email")}
          required
          autoComplete="email"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="contact-phone"
          name="phone"
          type="tel"
          label={t("phone")}
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => update("phone", e.target.value)}
        />

        <Field
          id="contact-subject"
          name="subject"
          label={t("subject")}
          required
          value={values.subject}
          onChange={(e) => update("subject", e.target.value)}
          error={errors.subject}
        />
      </div>

      <Field
        id="contact-message"
        name="message"
        label={t("message")}
        required
        multiline
        rows={6}
        value={values.message}
        onChange={(e) => update("message", e.target.value)}
        error={errors.message}
      />

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          <Send aria-hidden />
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>

        <p className="text-sm text-[var(--muted-foreground)]">{t("subtitle")}</p>
      </div>

      {status.state === "done" ? (
        <div
          role="status"
          aria-live="polite"
          className={
            status.success
              ? "flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900"
              : "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          }
        >
          {status.success ? (
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          )}
          <p>
            {status.messageKey === "notConnected"
              ? t("notConnected")
              : status.success
                ? t("success")
                : t("error")}
          </p>
        </div>
      ) : null}
    </form>
  );
}
