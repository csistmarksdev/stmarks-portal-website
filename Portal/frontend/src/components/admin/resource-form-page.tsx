"use client";

import type {
  ContentRevision,
  ImageAsset,
  LocalizedText,
  PublishStatus,
  SeoMeta,
} from "@portal/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { LocalizedField } from "@/components/admin/localized-field";
import { ErrorState } from "@/components/admin/error-state";
import { PageHeader } from "@/components/admin/page-header";
import { ParagraphsField } from "@/components/admin/paragraphs-field";
import { ImagePicker } from "@/components/admin/media-picker";
import { SeoFields, seoPayload } from "@/components/admin/seo-fields";
import { StatusSelect, useApprovalLock } from "@/components/admin/status-select";
import {
  ApprovalNotice,
  FormActions,
  FormFooterActions,
  saveLabelFor,
} from "@/components/admin/form-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useResourceItem, useResourceMutations } from "@/hooks/use-resource";
import { slugEditable, slugify } from "@/lib/slug";
import { cn, toDateInput, toDatetimeLocal } from "@/lib/utils";

/* ---------------------------- Field definitions ---------------------------- */

export type FieldDef =
  | { kind: "localized"; name: string; label: string; multiline?: boolean; required?: boolean }
  | { kind: "paragraphs"; name: string; label: string }
  | { kind: "text"; name: string; label: string; required?: boolean; placeholder?: string }
  | { kind: "email"; name: string; label: string; required?: boolean }
  | { kind: "number"; name: string; label: string; required?: boolean }
  | {
      kind: "date";
      name: string;
      label: string;
      required?: boolean;
      withTime?: boolean;
      help?: string;
    }
  | { kind: "checkbox"; name: string; label: string; help?: string }
  | {
      kind: "select";
      name: string;
      label: string;
      options: Array<{ value: string; label: string }>;
      allowEmpty?: boolean;
      required?: boolean;
    }
  | { kind: "image"; name: string; label: string; required?: boolean }
  /**
   * The SEO URL slug. Blank → the API derives it from the English title;
   * editable while the record is a draft, fixed once it has been published.
   */
  | { kind: "slug"; name: string; label: string; urlPrefix: string; help?: string }
  /**
   * Search-engine title, description and keywords, in a card of its own.
   * `fallbackDescription` names the field the website uses when the meta
   * description is blank (an event's summary, an album's description).
   */
  | {
      kind: "seo";
      name: string;
      label: string;
      urlPrefix: string;
      fallbackDescription?: string;
      /** The image field shared when no share image is set. */
      fallbackImage?: string;
    };

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
 * "remove this". Omitting the key instead - which this did - means "leave it
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
        // A required field is never nulled - `validate` has already refused an
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
      case "seo": {
        // null clears it on an edit; a create drops nulls (see `submit`).
        payload[field.name] = seoPayload(raw as SeoMeta | undefined);
        break;
      }
      case "slug": {
        const text = slugify((raw as string) ?? "");
        if (text) payload[field.name] = text;
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

/** Drops the `null`s a create has no use for - nothing exists to remove yet. */
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
  values,
  savedStatus,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
  values: FormValues;
  savedStatus?: PublishStatus;
}) {
  switch (field.kind) {
    case "seo": {
      const slugValue = slugify((values.slug as string) ?? "") ||
        slugify((values.title as LocalizedText | undefined)?.en ?? "");
      return (
        <SeoFields
          value={value as SeoMeta | undefined}
          onChange={onChange}
          urlPath={`${field.urlPrefix}${slugValue}`}
          fallbackTitle={values.title as LocalizedText | undefined}
          fallbackDescription={
            field.fallbackDescription
              ? (values[field.fallbackDescription] as LocalizedText | undefined)
              : undefined
          }
          fallbackImage={
            field.fallbackImage ? (values[field.fallbackImage] as ImageAsset | undefined) : undefined
          }
        />
      );
    }
    case "slug": {
      const typed = (value as string) ?? "";
      const fromTitle = slugify((values.title as LocalizedText | undefined)?.en ?? "");
      const editable = slugEditable(savedStatus);
      const shown = slugify(typed) || fromTitle;
      return (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label>{field.label}</Label>
            {editable && fromTitle && slugify(typed) !== fromTitle && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => onChange(fromTitle)}
              >
                Use title
              </button>
            )}
          </div>
          <Input
            value={typed}
            placeholder={fromTitle || "generated-from-the-title"}
            readOnly={!editable}
            disabled={!editable}
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => typed && onChange(slugify(typed))}
          />
          <p className="break-all font-mono text-xs text-muted-foreground">
            {field.urlPrefix}
            {shown || "…"}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {editable
              ? "Filled in from the English title as you type it; edit it to choose your own. Used in the page's web address and by search engines."
              : "Fixed now that it is published, so links and search results point here."}
            {field.help ? ` ${field.help}` : ""}
          </p>
        </div>
      );
    }
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
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4">
          <div className="space-y-1">
            <Label>{field.label}</Label>
            {field.help && (
              <p className="text-xs leading-relaxed text-muted-foreground">{field.help}</p>
            )}
          </div>
          <Switch checked={Boolean(value)} onCheckedChange={onChange} className="shrink-0" />
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
            {(field.allowEmpty ?? !field.required) && <option value="">None</option>}
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
          {field.help && (
            <p className="text-xs leading-relaxed text-muted-foreground">{field.help}</p>
          )}
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

/**
 * Runs of consecutive date fields share a two-column row (Starts / Ends side by
 * side); a lone one takes half the width. A native date input stretched across
 * the whole form leaves its calendar icon stranded mid-box and reads as a
 * text field.
 */
function groupFields(fields: FieldDef[]): FieldDef[][] {
  const groups: FieldDef[][] = [];
  for (const field of fields) {
    const last = groups[groups.length - 1];
    if (field.kind === "date" && last?.[0].kind === "date" && last.length < 2) last.push(field);
    else groups.push([field]);
  }
  return groups;
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
  belowWriting,
  createExtras,
  updateExtras,
}: {
  title: string;
  apiPath: string;
  routeBase: string;
  label: string;
  fields: FieldDef[];
  id?: string;
  defaults?: FormValues;
  withStatusField?: boolean;
  /**
   * Extra sections for the main column, under the writing - the album's
   * photo stream. Placed here rather than after the page, so they line up
   * with the form instead of trailing below both columns.
   */
  belowWriting?: ReactNode;
  /**
   * Extra fields sent with a create - a new album's photos, chosen before the
   * album exists, so it is created whole in one request.
   */
  createExtras?: () => FormValues;
  /**
   * Extra fields sent with an update - an album's photos when they travel
   * with a change for approval (see the album editor).
   */
  updateExtras?: () => FormValues | undefined;
}) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useResourceItem<FormValues>(apiPath, id);
  const { create, update, rejectRevision } = useResourceMutations(apiPath, label);
  const [values, setValues] = useState<FormValues>(defaults);
  const [status, setStatus] = useState<PublishStatus>("draft");

  useEffect(() => {
    if (data) {
      // A change waiting for approval is what the form edits: the writer
      // keeps working on it; the approver reviews exactly what was sent.
      const revision = data.revision as ContentRevision | undefined;
      setValues(toFormValues(fields, { ...data, ...(revision?.changes ?? {}) }));
      setStatus((data.status as PublishStatus) ?? "draft");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const busy = create.isPending || update.isPending;
  const { locked, holds, canPublish } = useApprovalLock(
    data?.status as PublishStatus | undefined,
    isEdit,
  );
  const revision = (data?.revision as ContentRevision | undefined) ?? null;

  /** Saves; `asStatus` overrides the chosen status (Approve publishes). */
  const submit = async (asStatus?: PublishStatus) => {
    const error = validate(fields, values);
    if (error) {
      toast.error(error);
      return;
    }
    const payload = toPayload(fields, values);
    if (withStatusField) payload.status = asStatus ?? status;

    if (isEdit && id) {
      await update.mutateAsync({ id, body: { ...payload, ...updateExtras?.() } });
      if (asStatus) setStatus(asStatus);
    } else {
      await create.mutateAsync({ ...withoutRemovals(payload), ...createExtras?.() });
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
      <div className="max-w-3xl">
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

  const hasSlug = fields.some((field) => field.kind === "slug");
  const savedForSlug = data?.status as PublishStatus | undefined;
  /**
   * Applies one field's change. While the slug still matches the title it was
   * built from (or is empty), it follows the English title as it is typed;
   * once the writer edits the slug it is theirs and is left alone.
   */
  const withFieldChange = (current: FormValues, name: string, next: unknown): FormValues => {
    const updated = { ...current, [name]: next };
    if (name === "title" && hasSlug && slugEditable(savedForSlug)) {
      const slug = ((current.slug as string) ?? "").trim();
      const before = slugify((current.title as LocalizedText | undefined)?.en ?? "");
      if (!slug || slug === before) {
        updated.slug = slugify((next as LocalizedText | undefined)?.en ?? "");
      }
    }
    return updated;
  };

  const renderGroups = (subset: FieldDef[], dateColumns: string) =>
    groupFields(subset).map((group) => {
      const controls = group.map((field) => (
        <FieldControl
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(next) => setValues((current) => withFieldChange(current, field.name, next))}
          values={values}
          savedStatus={data?.status as PublishStatus | undefined}
        />
      ));
      return group[0].kind === "date" ? (
        <div key={group[0].name} className={cn("grid items-start gap-5", dateColumns)}>
          {controls}
        </div>
      ) : (
        controls
      );
    });

  /*
   * Two columns on a wide screen, the way a writing tool is laid out: the
   * words in a wide main column, everything about them - dates, image,
   * fellowship, status, save - in a details column beside them. One
   * narrow column left most of a desktop screen empty beside the form.
   */
  const savedStatus = data?.status as PublishStatus | undefined;
  const actionProps = {
    backHref: routeBase,
    // Changes waiting on a live item are reviewed just like a new submission.
    savedStatus: revision ? ("pending" as const) : savedStatus,
    onSave: () => void submit(),
    // Approving: the approver's save applies the form (and publishes it).
    onApprove: withStatusField ? () => void submit("published") : undefined,
    // Rejecting a change discards it; rejecting a new item returns it to draft.
    onReject: withStatusField
      ? () =>
          revision && id
            ? rejectRevision.mutateAsync(id).catch(() => undefined)
            : submit("draft")
      : undefined,
    saveLabel: saveLabelFor({
      isEdit,
      holds,
      hasRevision: !!revision,
      canPublish,
      createLabel: `Create ${label.toLowerCase()}`,
    }),
    busy: busy || rejectRevision.isPending,
    disabled: locked,
  };

  const isWriting = (field: FieldDef) => field.kind === "localized" || field.kind === "paragraphs";
  const writing = fields.filter(isWriting);
  const seoFields = fields.filter((field) => field.kind === "seo");
  const details = fields.filter((field) => !isWriting(field) && field.kind !== "seo");

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow={isEdit ? "Editing" : "Creating"}
        title={title}
        actions={<FormActions {...actionProps} />}
      />
      {isEdit && (savedStatus === "pending" || holds || revision) ? (
        <div className="mb-5 empty:hidden">
          <ApprovalNotice status={savedStatus} revision={revision} isEdit={isEdit} />
        </div>
      ) : null}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardContent className="space-y-6">{renderGroups(writing, "sm:grid-cols-2")}</CardContent>
          </Card>
          {seoFields.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Search engines (SEO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">{renderGroups(seoFields, "")}</CardContent>
            </Card>
          )}
          {belowWriting}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* Paired side by side while the column is wide; stacked in the
                narrow details column, where two date pickers do not fit. */}
            {renderGroups(details, "sm:grid-cols-2 xl:grid-cols-1")}

            {withStatusField && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <StatusSelect value={status} onChange={setStatus} isNew={!isEdit} />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Only published records appear on the public website
                  {fields.some((field) => field.name === "publishAt")
                    ? ", and only once their publish time has passed."
                    : "."}
                </p>
              </div>
            )}

            <FormFooterActions {...actionProps} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
