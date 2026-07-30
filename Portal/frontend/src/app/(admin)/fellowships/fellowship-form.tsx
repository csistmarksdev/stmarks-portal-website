"use client";

import type {
  Fellowship,
  FellowshipCommitteeMember,
  ImageAsset,
  LocalizedText,
  PublishStatus,
  WithStatus,
} from "@portal/shared";
import { FELLOWSHIP_SLUGS } from "@portal/shared";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LocalizedField } from "@/components/admin/localized-field";
import { ImagePicker } from "@/components/admin/media-picker";
import { PageHeader } from "@/components/admin/page-header";
import { ParagraphsField } from "@/components/admin/paragraphs-field";
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
  const { create, update } = useResourceMutations("/admin/fellowships", "Fellowship");

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
    setSlug(data.slug);
    setName(data.name);
    setTagline(data.tagline);
    setAbout(data.about ?? []);
    setVision(data.vision);
    setSchedule(data.schedule);
    setMemberCount(data.memberCount !== undefined ? String(data.memberCount) : "");
    setBanner(data.banner);
    setCommittee(data.committee ?? []);
    setCoordinatorName(data.coordinator?.name ?? EMPTY);
    setCoordinatorPhone(data.coordinator?.phone ?? "");
    setCoordinatorEmail(data.coordinator?.email ?? "");
    setOrder(String(data.order ?? 0));
    setStatus(data.status);
  }, [data]);

  const busy = create.isPending || update.isPending;

  const updateMember = (index: number, patch: Partial<CommitteeDraft>) => {
    setCommittee((current) =>
      current.map((member, i) => (i === index ? { ...member, ...patch } : member)),
    );
  };

  const submit = async () => {
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
      status,
    };

    if (isEdit && id) {
      await update.mutateAsync({ id, body: payload });
    } else {
      await create.mutateAsync(payload);
      router.push("/fellowships");
    }
  };

  if (isEdit && isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${data?.name.en ?? "fellowship"}` : "New fellowship"}
        actions={
          <Button variant="outline" className="hidden lg:inline-flex" asChild>
            <Link href="/fellowships">
              <ArrowLeftIcon /> Back
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Slug (fixed enum — Website routes depend on it)</Label>
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
          <LocalizedField label="Name" value={name} onChange={setName} required />
          <LocalizedField label="Tagline" value={tagline} onChange={setTagline} required />
          <ParagraphsField label="About" value={about} onChange={setAbout} />
          <LocalizedField label="Vision" value={vision} onChange={setVision} multiline required />
          <LocalizedField label="Schedule" value={schedule} onChange={setSchedule} required />
          <div className="grid gap-4 sm:grid-cols-2">
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
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No committee members yet.
            </p>
          )}
          {committee.map((member, index) => (
            <div key={member.id ?? index} className="space-y-3 rounded-md border p-3">
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

      <div className="space-y-2 sm:flex sm:items-center sm:justify-end sm:gap-2 sm:space-y-0">
        <div className="sm:mr-auto sm:w-40">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as PublishStatus)}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/fellowships">Cancel</Link>
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create fellowship"}
          </Button>
        </div>
      </div>
    </div>
  );
}
