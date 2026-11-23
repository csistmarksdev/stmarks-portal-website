"use client";

import type {
  ContentRevision,
  Fellowship,
  FellowshipCommitteeMember,
  ImageAsset,
  LocalizedText,
  PublishStatus,
  WithStatus,
} from "@portal/shared";
import { FELLOWSHIP_SLUGS } from "@portal/shared";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LocalizedField } from "@/components/admin/localized-field";
import { ImagePicker } from "@/components/admin/media-picker";
import { PageHeader } from "@/components/admin/page-header";
import { ParagraphsField } from "@/components/admin/paragraphs-field";
import {
  ApprovalNotice,
  FormActions,
  FormFooterActions,
  saveLabelFor,
} from "@/components/admin/form-actions";
import { StatusSelect, useApprovalLock } from "@/components/admin/status-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceItem, useResourceMutations } from "@/hooks/use-resource";

const EMPTY: LocalizedText = { en: "", ta: "" };

type CommitteeDraft = Omit<FellowshipCommitteeMember, "id"> & { id?: string };

export function FellowshipForm({ id }: { id?: string }) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const { data, isLoading } = useResourceItem<WithStatus<Fellowship>>(
    "/admin/fellowships",
    id,
  );
  // Approval rule: an editor cannot change a published or archived record.
  const { locked, holds, canPublish } = useApprovalLock(data?.status, isEdit);
  const revision = (data as { revision?: ContentRevision } | undefined)?.revision ?? null;
  const { create, update, rejectRevision } = useResourceMutations("/admin/fellowships", "Fellowship");

  const [slug, setSlug] = useState<string>(FELLOWSHIP_SLUGS[0]);
  const [name, setName] = useState(EMPTY);
  const [tagline, setTagline] = useState(EMPTY);
  const [about, setAbout] = useState<LocalizedText[]>([]);
  const [vision, setVision] = useState(EMPTY);
  const [schedule, setSchedule] = useState(EMPTY);
  const [memberCount, setMemberCount] = useState<string>("");
  const [banner, setBanner] = useState<ImageAsset | undefined>();
  const [committee, setCommittee] = useState<CommitteeDraft[]>([]);
  const [coordinatorName, setCoordinatorName] = useState(EMPTY);
  const [coordinatorPhone, setCoordinatorPhone] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [order, setOrder] = useState<string>("0");
  const [status, setStatus] = useState<PublishStatus>("published");

  useEffect(() => {
    if (!data) return;
    // A change waiting for approval is what the form edits.
    const record = {
      ...data,
      ...((data as { revision?: ContentRevision }).revision?.changes ?? {}),
    } as typeof data;
    setSlug(record.slug);
    setName(record.name);
    setTagline(record.tagline);
    setAbout(record.about ?? []);
    setVision(record.vision);
    setSchedule(record.schedule);
    setMemberCount(record.memberCount !== undefined ? String(record.memberCount) : "");
    setBanner(record.banner);
    setCommittee(record.committee ?? []);
    setCoordinatorName(record.coordinator?.name ?? EMPTY);
    setCoordinatorPhone(record.coordinator?.phone ?? "");
    setCoordinatorEmail(record.coordinator?.email ?? "");
    setOrder(String(record.order ?? 0));
    setStatus(record.status);
  }, [data]);

  const busy = create.isPending || update.isPending;

  const updateMember = (index: number, patch: Partial<CommitteeDraft>) => {
    setCommittee((current) =>
      current.map((member, i) => (i === index ? { ...member, ...patch } : member)),
    );
  };

  /** Saves; `asStatus` overrides the chosen status (Approve publishes). */
  const submit = async (asStatus?: PublishStatus) => {
    if (!name.en.trim()) return toast.error("Name (English) is required");
    if (!banner) return toast.error("A banner image is required");

    const payload = {
      ...(isEdit ? {} : { slug }),
      name,
      tagline,
      about,
      vision,
      schedule,
      memberCount: memberCount ? Number(memberCount) : undefined,
      banner,
      committee: committee.map((member) => ({
        id: member.id,
        name: member.name,
        designation: member.designation,
        image: member.image ?? undefined,
      })),
      coordinator: {
        name: coordinatorName,
        phone: coordinatorPhone || undefined,
        email: coordinatorEmail || undefined,
      },
      order: Number(order) || 0,
      status: asStatus ?? status,
    };

    if (isEdit && id) {
      await update.mutateAsync({ id, body: payload });
      if (asStatus) setStatus(asStatus);
    } else {
      await create.mutateAsync(payload);
      router.push("/fellowships");
    }
  };

  if (isEdit && isLoading) return <Skeleton className="h-96 w-full" />;


  const actionProps = {
    backHref: "/fellowships",
    // Changes waiting on a live item are reviewed like a new submission.
    savedStatus: revision ? ("pending" as const) : (data?.status as PublishStatus | undefined),
    onSave: () => void submit(),
    onApprove: () => void submit("published"),
    // Rejecting a change discards it; rejecting a new item returns it to draft.
    onReject: () =>
      revision && id ? rejectRevision.mutateAsync(id).catch(() => undefined) : submit("draft"),
    saveLabel: saveLabelFor({
      isEdit,
      holds,
      hasRevision: !!revision,
      canPublish,
      createLabel: "Create fellowship",
    }),
    busy: busy || rejectRevision.isPending,
    disabled: locked,
  };
  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        eyebrow={isEdit ? "Editing" : "Creating"}
        title={isEdit ? `Edit ${data?.name.en ?? "fellowship"}` : "New fellowship"}
        actions={<FormActions {...actionProps} />}
      />
      {isEdit && data ? (
        <div className="mb-4 empty:hidden">
          <ApprovalNotice
            status={data.status}
            revision={revision}
            isEdit={isEdit}
          />
        </div>
      ) : null}

      {/*
        Two columns on a wide screen: the fellowship's words and committee in
        the main column, its settings, coordinator and save in a details column
        beside it. One narrow column left half the screen empty.
      */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>About the fellowship</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <LocalizedField label="Name" value={name} onChange={setName} required />
              <LocalizedField label="Tagline" value={tagline} onChange={setTagline} required />
              <ParagraphsField label="About" value={about} onChange={setAbout} />
              <LocalizedField label="Vision" value={vision} onChange={setVision} multiline required />
              <LocalizedField label="Schedule" value={schedule} onChange={setSchedule} required />
            </CardContent>
          </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Committee</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCommittee((current) => [
                  ...current,
                  { name: { ...EMPTY }, designation: { ...EMPTY } },
                ])
              }
            >
              <PlusIcon /> Add member
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {committee.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No committee members yet.
              </p>
            )}
            {committee.map((member, index) => (
              <div key={member.id ?? index} className="space-y-4 rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Member {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() =>
                      setCommittee((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <LocalizedField
                  label="Name"
                  value={member.name}
                  onChange={(next) => updateMember(index, { name: next })}
                  required
                />
                <LocalizedField
                  label="Designation"
                  value={member.designation}
                  onChange={(next) => updateMember(index, { designation: next })}
                  required
                />
                <ImagePicker
                  label="Photo"
                  value={member.image}
                  onChange={(next) => updateMember(index, { image: next })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="space-y-1.5">
                <Label>Page address</Label>
                <Select
                  value={slug}
                  disabled={isEdit}
                  onChange={(event) => setSlug(event.target.value)}
                >
                  {FELLOWSHIP_SLUGS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Member count</Label>
                  <Input
                    type="number"
                    value={memberCount}
                    onChange={(event) => setMemberCount(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Display order</Label>
                  <Input
                    type="number"
                    value={order}
                    onChange={(event) => setOrder(event.target.value)}
                  />
                </div>
              </div>
              <ImagePicker label="Banner" value={banner} onChange={setBanner} required />
              <div className="space-y-1.5">
                <Label>Status</Label>
                <StatusSelect value={status} onChange={setStatus} isNew={!isEdit} />
              </div>
              <FormFooterActions {...actionProps} />
            </CardContent>
          </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coordinator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocalizedField
              label="Name"
              value={coordinatorName}
              onChange={setCoordinatorName}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={coordinatorPhone}
                  onChange={(event) => setCoordinatorPhone(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={coordinatorEmail}
                  onChange={(event) => setCoordinatorEmail(event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
