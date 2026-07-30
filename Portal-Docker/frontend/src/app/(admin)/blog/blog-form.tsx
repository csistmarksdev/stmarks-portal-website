"use client";

import type { ImageAsset, LocalizedText, PublishStatus } from "@portal/shared";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ImageIcon,
  ListChecksIcon,
  PenLineIcon,
  SaveIcon,
  TypeIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  BilingualEditor,
  paragraphsToText,
  splitParagraphs,
  textToParagraphs,
} from "@/components/admin/bilingual-editor";
import { ErrorState } from "@/components/admin/error-state";
import { LocalizedField } from "@/components/admin/localized-field";
import { ImagePicker } from "@/components/admin/media-picker";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fellowshipOptions } from "@/config/fields";
import { useResourceItem, useResourceMutations } from "@/hooks/use-resource";
import { renderInline } from "@/lib/rich-text";
import { cn, toDateInput } from "@/lib/utils";

const EMPTY_TEXT: LocalizedText = { en: "", ta: "" };

interface BlogRecord {
  title?: LocalizedText;
  excerpt?: LocalizedText;
  author?: LocalizedText;
  body?: LocalizedText[];
  publishedAt?: string;
  coverImage?: ImageAsset;
  eventSlug?: string;
  fellowshipSlug?: string;
  status?: PublishStatus;
}

/**
 * Draft state. The body is held as prose per language rather than as the
 * stored `LocalizedText[]`; see `bilingual-editor` for the conversion.
 */
interface Draft {
  title: LocalizedText;
  excerpt: LocalizedText;
  author: LocalizedText;
  bodyEn: string;
  bodyTa: string;
  publishedAt: string;
  coverImage?: ImageAsset;
  eventSlug: string;
  fellowshipSlug: string;
}

const BLANK: Draft = {
  title: EMPTY_TEXT,
  excerpt: EMPTY_TEXT,
  author: EMPTY_TEXT,
  bodyEn: "",
  bodyTa: "",
  publishedAt: toDateInput(new Date().toISOString()),
  eventSlug: "",
  fellowshipSlug: "",
};

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

const STEPS = [
  { title: "Headline", blurb: "Title, excerpt and byline", icon: TypeIcon },
  { title: "Write", blurb: "The post itself, in both languages", icon: PenLineIcon },
  { title: "Presentation", blurb: "Cover image and where it belongs", icon: ImageIcon },
  { title: "Review", blurb: "Check it over, then save", icon: ListChecksIcon },
] as const;

/** Blocking problems for a step, in the order a writer would fix them. */
function problemsIn(step: number, draft: Draft): string[] {
  const problems: string[] = [];
  if (step === 0) {
    if (!draft.title.en.trim()) problems.push("The English title is missing.");
    if (!draft.excerpt.en.trim()) problems.push("The English excerpt is missing.");
    if (!draft.author.en.trim()) problems.push("The English author name is missing.");
    if (!draft.publishedAt) problems.push("Pick a publication date.");
  }
  if (step === 1 && splitParagraphs(draft.bodyEn).length === 0) {
    problems.push("The post has no English text yet.");
  }
  return problems;
}

function Stepper({
  current,
  furthest,
  onJump,
}: {
  current: number;
  furthest: number;
  onJump: (step: number) => void;
}) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-1 gap-y-2">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        // Jumping ahead is allowed only over ground already covered, so the
        // writer cannot land on Review having skipped the title.
        const reachable = index <= furthest;

        return (
          <li key={step.title} className="flex items-center">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onJump(index)}
              className={cn(
                "flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition-colors",
                active && "bg-primary text-primary-foreground shadow-sm",
                !active && reachable && "text-muted-foreground hover:bg-hover-tint",
                !reachable && "cursor-not-allowed text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "numeric grid size-6 shrink-0 place-items-center rounded-full text-xs",
                  active && "bg-primary-foreground/20",
                  !active && done && "bg-success-soft text-success",
                  !active && !done && "bg-muted",
                )}
              >
                {done ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              {step.title}
            </button>
            {index < STEPS.length - 1 && (
              <span aria-hidden className="mx-0.5 h-px w-3 bg-border sm:w-5" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Review                                                                     */
/* -------------------------------------------------------------------------- */

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border/70 py-3 last:border-0">
      <dt className="w-32 shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Missing() {
  return <span className="text-muted-foreground">Not set</span>;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Blog post editor.
 *
 * Unlike the other resources this one does not use `ResourceFormPage`: writing
 * an article is a different activity from filling in a record, and a single
 * long column of paired inputs buries the part that actually matters. The work
 * is split into steps so the writing step can have the screen to itself.
 */
export function BlogForm({ id }: { id?: string }) {
  const router = useRouter();
  const isEdit = Boolean(id);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useResourceItem<BlogRecord>("/admin/blog", id);
  const { create, update } = useResourceMutations("/admin/blog", "Post");

  const [draft, setDraft] = useState<Draft>(BLANK);
  const [status, setStatus] = useState<PublishStatus>("draft");
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  /*
   * Load the record into the draft exactly once per post.
   *
   * Keyed on the id rather than on `data`, because `data` changes identity on
   * every refetch — and saving invalidates this very query. Re-running on that
   * would overwrite whatever the writer had typed since, which in a long-form
   * editor means losing an article to a background request.
   */
  useEffect(() => {
    if (!data || !id || hydratedId === id) return;
    setDraft({
      title: data.title ?? EMPTY_TEXT,
      excerpt: data.excerpt ?? EMPTY_TEXT,
      author: data.author ?? EMPTY_TEXT,
      bodyEn: paragraphsToText(data.body, "en"),
      bodyTa: paragraphsToText(data.body, "ta"),
      publishedAt: toDateInput(data.publishedAt),
      coverImage: data.coverImage,
      eventSlug: data.eventSlug ?? "",
      fellowshipSlug: data.fellowshipSlug ?? "",
    });
    setStatus(data.status ?? "draft");
    // An existing post is already past every gate.
    setFurthest(STEPS.length - 1);
    setDirty(false);
    setHydratedId(id);
  }, [data, id, hydratedId]);

  /*
   * A half-written article is the most expensive thing in this CMS to lose,
   * and nothing else here autosaves. The native prompt is crude but it is the
   * only one the browser will honour on a tab close.
   */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setDirty(true);
  };

  const busy = create.isPending || update.isPending;
  const problems = problemsIn(step, draft);
  const isLast = step === STEPS.length - 1;

  const goTo = (next: number) => {
    setStep(next);
    setFurthest((far) => Math.max(far, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (problems.length > 0) {
      toast.error(problems[0]);
      return;
    }
    goTo(step + 1);
  };

  const save = async () => {
    // Every gate, not just this step's — Save is reachable from anywhere.
    const blocking = [0, 1].flatMap((index) => problemsIn(index, draft));
    if (blocking.length > 0) {
      toast.error(blocking[0]);
      return;
    }

    const payload = {
      title: draft.title,
      excerpt: draft.excerpt,
      author: draft.author,
      body: textToParagraphs(draft.bodyEn, draft.bodyTa),
      publishedAt: new Date(draft.publishedAt).toISOString(),
      status,
      ...(draft.coverImage ? { coverImage: draft.coverImage } : {}),
      ...(draft.eventSlug.trim() ? { eventSlug: draft.eventSlug.trim() } : {}),
      ...(draft.fellowshipSlug.trim()
        ? { fellowshipSlug: draft.fellowshipSlug.trim() }
        : {}),
    };

    if (isEdit && id) {
      await update.mutateAsync({ id, body: payload });
      setDirty(false);
    } else {
      await create.mutateAsync(payload);
      setDirty(false);
      router.push("/blog");
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  /* A blank form here would silently overwrite the real post on save. */
  if (isEdit && isError) {
    return (
      <ErrorState
        title="Couldn't load this post"
        message={
          error instanceof Error
            ? error.message
            : "The portal could not reach the server."
        }
        onRetry={() => void refetch()}
        busy={isFetching}
      />
    );
  }

  const englishParagraphs = splitParagraphs(draft.bodyEn).length;
  const tamilParagraphs = splitParagraphs(draft.bodyTa).length;

  return (
    /*
     * Every step scrolls, so every step needs clearance under the fixed action
     * bar — enough that the end of a long article can be scrolled fully clear
     * of it rather than stopping just underneath.
     */
    <div className="mx-auto max-w-5xl pb-32">
      <PageHeader
        eyebrow={isEdit ? "Editing" : "New post"}
        title={isEdit ? "Edit blog post" : "Write a blog post"}
        description={STEPS[step].blurb}
        actions={
          <Button variant="outline" asChild>
            <Link href="/blog">
              <ArrowLeftIcon className="size-4" /> Back
            </Link>
          </Button>
        }
      />

      <Stepper current={step} furthest={furthest} onJump={goTo} />

      {/* ------------------------------------------------ 1 · Headline */}
      {step === 0 && (
        <Card>
          <CardContent className="space-y-5">
            <LocalizedField
              label="Title"
              value={draft.title}
              onChange={(title) => patch({ title })}
              required
            />
            <LocalizedField
              label="Excerpt"
              value={draft.excerpt}
              onChange={(excerpt) => patch({ excerpt })}
              multiline
              required
            />
            <p className="-mt-3 text-[13px] text-muted-foreground">
              One or two sentences. This is what shows on the blog index and
              when the post is shared.
            </p>
            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
              <LocalizedField
                label="Author"
                value={draft.author}
                onChange={(author) => patch({ author })}
                required
              />
              <div className="space-y-1.5">
                <Label>
                  Published on<span className="text-destructive"> *</span>
                </Label>
                <Input
                  type="date"
                  value={draft.publishedAt}
                  onChange={(event) => patch({ publishedAt: event.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --------------------------------------------------- 2 · Write */}
      {step === 1 && (
        <BilingualEditor
          // Remounts the panes when a different post loads — see the editor's
          // note on why it is uncontrolled.
          hydrationKey={hydratedId ?? "new"}
          englishText={draft.bodyEn}
          tamilText={draft.bodyTa}
          onEnglishChange={(bodyEn) => patch({ bodyEn })}
          onTamilChange={(bodyTa) => patch({ bodyTa })}
        />
      )}

      {/* -------------------------------------------- 3 · Presentation */}
      {step === 2 && (
        <Card>
          <CardContent className="space-y-5">
            <ImagePicker
              label="Cover image"
              value={draft.coverImage}
              onChange={(coverImage) => patch({ coverImage })}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Fellowship</Label>
                <Select
                  value={draft.fellowshipSlug}
                  onChange={(event) => patch({ fellowshipSlug: event.target.value })}
                >
                  <option value="">—</option>
                  {fellowshipOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <p className="text-[13px] text-muted-foreground">
                  Optional. Files the post under a fellowship.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Related event slug</Label>
                <Input
                  value={draft.eventSlug}
                  placeholder="e.g. harvest-festival-2026"
                  onChange={(event) => patch({ eventSlug: event.target.value })}
                />
                <p className="text-[13px] text-muted-foreground">
                  Optional. Links the post to an event page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* -------------------------------------------------- 4 · Review */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent>
              <dl>
                <ReviewRow label="Title">
                  {draft.title.en || <Missing />}
                  {draft.title.ta && (
                    <span className="mt-0.5 block text-muted-foreground">
                      {draft.title.ta}
                    </span>
                  )}
                </ReviewRow>
                <ReviewRow label="Author">
                  {draft.author.en || <Missing />}
                </ReviewRow>
                <ReviewRow label="Published on">
                  {draft.publishedAt ? (
                    new Date(draft.publishedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  ) : (
                    <Missing />
                  )}
                </ReviewRow>
                <ReviewRow label="Length">
                  <span className="numeric">
                    {englishParagraphs} paragraph{englishParagraphs === 1 ? "" : "s"} in
                    English
                  </span>
                  {tamilParagraphs !== englishParagraphs && (
                    <span
                      className={cn(
                        "numeric",
                        tamilParagraphs === 0 ? "text-muted-foreground" : "text-accent-fg",
                      )}
                    >
                      {" · "}
                      {tamilParagraphs === 0
                        ? "no Tamil text"
                        : `${tamilParagraphs} in Tamil — counts differ`}
                    </span>
                  )}
                </ReviewRow>
                <ReviewRow label="Cover image">
                  {draft.coverImage ? draft.coverImage.alt?.en || "Selected" : <Missing />}
                </ReviewRow>
                <ReviewRow label="Fellowship">
                  {fellowshipOptions.find(
                    (option) => option.value === draft.fellowshipSlug,
                  )?.label ?? <Missing />}
                </ReviewRow>
              </dl>
            </CardContent>
          </Card>

          {/*
            A preview, because emphasis is written as markers (`**bold**`) and
            nobody should have to publish to find out whether they got it
            right. Uses the same parser the Website does.
          */}
          {splitParagraphs(draft.bodyEn).length > 0 && (
            <Card>
              <CardContent>
                <p className="label mb-3 text-muted-foreground">
                  How it will read
                </p>
                <div className="space-y-4">
                  {splitParagraphs(draft.bodyEn).map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-[15px] leading-[1.85] text-foreground"
                    >
                      {renderInline(paragraph)}
                    </p>
                  ))}
                </div>
                {splitParagraphs(draft.bodyTa).length > 0 && (
                  <div className="mt-5 space-y-4 border-t border-border/70 pt-5">
                    {splitParagraphs(draft.bodyTa).map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-[15px] leading-[1.85] text-foreground"
                      >
                        {renderInline(paragraph)}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as PublishStatus);
                  setDirty(true);
                }}
              >
                <option value="draft">Draft — not on the website</option>
                <option value="published">Published — live on the website</option>
                <option value="archived">Archived — hidden, kept on file</option>
              </Select>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------ Actions */}
      {/*
        A floating bar rather than a full-bleed slab, to match the rail and the
        mobile dock. The wrapper repeats the admin layout's own gutters
        (`px-4 lg:px-6`) and max width so the pill lines up with the content
        column above it instead of drifting inwards.
      */}
      {/*
        The offset is spelled out rather than using the `.bottom-dock` utility:
        that is a plain class in globals.css and outranks `lg:bottom-*` in the
        cascade, so the desktop override would silently never apply. Below lg
        the bar clears the floating dock; above it, the dock is gone.
      */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-30 px-4 lg:bottom-6 lg:left-[17rem] lg:px-6">
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-2 rounded-3xl border border-border/70 bg-card/85 p-2 shadow-lg backdrop-blur-xl">
          <Button
            variant="ghost"
            onClick={() => goTo(step - 1)}
            disabled={step === 0 || busy}
          >
            <ArrowLeftIcon className="size-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Back</span>
          </Button>

          <span className="numeric ml-auto hidden px-1 text-[13px] text-muted-foreground sm:block">
            Step {step + 1} of {STEPS.length}
          </span>

          <div className="ml-auto flex items-center gap-2 sm:ml-2">
            <Button variant="outline" onClick={save} disabled={busy}>
              <SaveIcon className="size-4" />
              {busy ? "Saving…" : isEdit ? "Save" : "Save draft"}
            </Button>

            {!isLast && (
              <Button onClick={next} disabled={busy}>
                Next <ArrowRightIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
