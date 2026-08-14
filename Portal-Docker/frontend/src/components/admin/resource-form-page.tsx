"use client";

import type { ImageAsset, LocalizedText, PublishStatus } from "@portal/shared";
import { PUBLISH_STATUSES } from "@portal/shared";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LocalizedField } from "@/components/admin/localized-field";
import { ErrorState } from "@/components/admin/error-state";
import { PageHeader } from "@/components/admin/page-header";
import { ParagraphsField } from "@/components/admin/paragraphs-field";
import { ImagePicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useResourceItem, useResourceMutations } from "@/hooks/use-resource";
import { toDateInput, toDatetimeLocal } from "@/lib/utils";

/* ---------------------------- Field definitions ---------------------------- */

export type FieldDef =
  | { kind: "localized"; name: string; label: string; multiline?: boolean; required?: boolean }
  | { kind: "paragraphs"; name: string; label: string }
  | { kind: "text"; name: string; label: string; required?: boolean; placeholder?: string }
  | { kind: "email"; name: string; label: string; required?: boolean }
  | { kind: "number"; name: string; label: string; required?: boolean }
  | { kind: "date"; name: string; label: string; required?: boolean; withTime?: boolean }
  | { kind: "checkbox"; name: string; label: string; help?: string }
  | {
      kind: "select";
      name: string;
      label: string;
      options: Array<{ value: string; label: string }>;
      allowEmpty?: boolean;
      required?: boolean;
    }
  | { kind: "image"; name: string; label: string; required?: boolean };

type FormValues = Record<string, unknown>;

function isEmptyLocalized(value: unknown): boolean {
  const localized = value as LocalizedText | undefined;
  return !localized || (!localized.en?.trim() && !localized.ta?.trim());
}

/** Server record → editable form values (ISO dates become input values). */
function toFormValues(fields: FieldDef[], record: FormValues): FormValues {
  const values: FormValues = { ...record };
  for (const field of fields) {
    const raw = record[field.name];
    if (field.kind === "date") {
      values[field.name] = field.withTime
        ? toDatetimeLocal(raw as string | undefined)
        : toDateInput(raw as string | undefined);
    }
  }
  return values;
}

/**
 * Editable form values → API payload.
 *
 * An emptied optional field becomes an explicit `null`, which the API reads as
 * "remove this". Omitting the key instead — which this did — means "leave it
 * alone", so clearing a cover image or a fellowship saved cleanly and changed
 * nothing: the field came back on the next load, and the only clue was that the
 * record had quietly disagreed with the form all along.
 *
 * Nulls are stripped again for a create (see `submit`), where there is no prior
 * value to remove and an explicit null would only write one.
 */
function toPayload(fields: FieldDef[], values: FormValues): FormValues {
  const payload: FormValues = {};
  for (const field of fields) {
    const raw = values[field.name];
    switch (field.kind) {
      case "localized":
        // A required field is never nulled — `validate` has already refused an
        // empty one, so reaching here with no text is not a clearing.
        if (!field.required && isEmptyLocalized(raw)) {
          payload[field.name] = null;
          break;
        }
        payload[field.name] = raw ?? { en: "", ta: "" };
        break;
      case "paragraphs":
        payload[field.name] = raw ?? [];
        break;
      case "date": {
        const text = (raw as string) ?? "";
        if (!text) {
          if (!field.required) payload[field.name] = null;
          break;
        }
        payload[field.name] = new Date(text).toISOString();
        break;
      }
      case "number": {
        if (raw === "" || raw === undefined || raw === null) {
          if (!field.required) payload[field.name] = null;
          break;
        }
        payload[field.name] = Number(raw);
        break;
      }
      case "checkbox":
        payload[field.name] = Boolean(raw);
        break;
      case "select":
      case "text":
      case "email": {
        const text = ((raw as string) ?? "").trim();
        if (!text) {
          if (!field.required) payload[field.name] = null;
          break;
        }
        payload[field.name] = text;
        break;
      }
      case "image":
        if (raw) payload[field.name] = raw as ImageAsset;
        else if (!field.required) payload[field.name] = null;
        break;
    }
  }
  return payload;
}

/** Drops the `null`s a create has no use for — nothing exists to remove yet. */
function withoutRemovals(payload: FormValues): FormValues {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null),
  );
}

function validate(fields: FieldDef[], values: FormValues): string | null {
  for (const field of fields) {
    const required = "required" in field && field.required;
    if (!required) continue;
    const raw = values[field.name];
    if (field.kind === "localized" && isEmptyLocalized(raw)) {
      return `"${field.label}" needs at least the English text`;
    }
    if (field.kind === "image" && !raw) return `"${field.label}" is required`;
    if (
      (field.kind === "text" || field.kind === "email" || field.kind === "date" || field.kind === "select") &&
      !((raw as string) ?? "").trim()
    ) {
      return `"${field.label}" is required`;
    }
  }
  return null;
}

/* ------------------------------ Form renderer ------------------------------ */

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  switch (field.kind) {
    case "localized":
      return (
        <LocalizedField
          label={field.label}
          value={value as LocalizedText | undefined}
          onChange={onChange}
          multiline={field.multiline}
          required={field.required}
        />
      );
    case "paragraphs":
      return (
        <ParagraphsField
          label={field.label}
          value={value as LocalizedText[] | undefined}
          onChange={onChange}
        />
      );
    case "image":
      return (
        <ImagePicker
          label={field.label}
          value={value as ImageAsset | undefined}
          onChange={onChange}
          required={field.required}
        />
      );
    case "checkbox":
      return (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label>{field.label}</Label>
            {field.help && (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            )}
          </div>
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Select
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
          >
            {(field.allowEmpty ?? !field.required) && <option value="">—</option>}
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      );
    case "date":
      return (
        <div className="space-y-1.5">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            type={field.withTime ? "datetime-local" : "date"}
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
    case "number":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <Input
            type="number"
            value={(value as number | string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          <Label>
            {field.label}
            {"required" in field && field.required && (
              <span className="text-destructive"> *</span>
            )}
          </Label>
          <Input
            type={field.kind === "email" ? "email" : "text"}
            placeholder={"placeholder" in field ? field.placeholder : undefined}
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
  }
}

/* ------------------------------- Page shell -------------------------------- */

/**
 * Generic create/edit screen. `id` undefined → create (POST), otherwise the
 * record is loaded and PATCHed. New records get a status choice (draft by
 * default) so the publish workflow starts in the right place.
 */
export function ResourceFormPage({
  title,
  apiPath,
  routeBase,
  label,
  fields,
  id,
  defaults = {},
  withStatusField = true,
}: {
  title: string;
  apiPath: string;
  routeBase: string;
  label: string;
  fields: FieldDef[];
  id?: string;
  defaults?: FormValues;
  withStatusField?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useResourceItem<FormValues>(apiPath, id);
  const { create, update } = useResourceMutations(apiPath, label);
  const [values, setValues] = useState<FormValues>(defaults);
  const [status, setStatus] = useState<PublishStatus>("draft");

  useEffect(() => {
    if (data) {
      setValues(toFormValues(fields, data));
      setStatus((data.status as PublishStatus) ?? "draft");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const busy = create.isPending || update.isPending;

  const submit = async () => {
    const error = validate(fields, values);
    if (error) {
      toast.error(error);
      return;
    }
    const payload = toPayload(fields, values);
    if (withStatusField) payload.status = status;

    if (isEdit && id) {
      await update.mutateAsync({ id, body: payload });
    } else {
      await create.mutateAsync(withoutRemovals(payload));
      router.push(routeBase);
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  /*
   * Never fall through to a blank form when the record failed to load: the
   * fields would be empty, and saving would wipe the real content with them.
   */
  if (isEdit && isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={title} />
        <ErrorState
          title="Couldn't load this record"
          message={
            error instanceof Error
              ? error.message
              : "The portal could not reach the server."
          }
          onRetry={() => void refetch()}
          busy={isFetching}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={title}
        actions={
          <Button variant="outline" className="hidden lg:inline-flex" asChild>
            <Link href={routeBase}>
              <ArrowLeftIcon /> Back
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="space-y-5 pt-5">
          {fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(next) =>
                setValues((current) => ({ ...current, [field.name]: next }))
              }
            />
          ))}

          {withStatusField && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as PublishStatus)}
              >
                {PUBLISH_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Only published records appear on the public website.
              </p>
            </div>
          )}

          {/* Full-width side-by-side on a phone so both are easy thumb targets. */}
          <div className="grid grid-cols-2 gap-2 border-t pt-4 sm:flex sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href={routeBase}>Cancel</Link>
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => void submit()}
              disabled={busy}
            >
              {busy ? "Saving…" : isEdit ? "Save changes" : `Create ${label.toLowerCase()}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
