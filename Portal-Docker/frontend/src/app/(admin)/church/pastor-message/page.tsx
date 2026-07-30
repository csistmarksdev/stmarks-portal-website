"use client";

import type { ImageAsset, LocalizedText, PastorMessage } from "@portal/shared";
import { useEffect, useState } from "react";

import { LocalizedField } from "@/components/admin/localized-field";
import { ImagePicker } from "@/components/admin/media-picker";
import { ParagraphsField } from "@/components/admin/paragraphs-field";
import { SingletonShell } from "@/components/admin/singleton-shell";
import { useSingleton } from "@/hooks/use-singleton";

const EMPTY: LocalizedText = { en: "", ta: "" };

export default function PastorMessagePage() {
  const { data, isLoading, save } = useSingleton<PastorMessage>("pastor-message");

  const [authorName, setAuthorName] = useState(EMPTY);
  const [authorRole, setAuthorRole] = useState(EMPTY);
  const [authorImage, setAuthorImage] = useState<ImageAsset | undefined>();
  const [excerpt, setExcerpt] = useState(EMPTY);
  const [body, setBody] = useState<LocalizedText[]>([]);

  useEffect(() => {
    if (!data) return;
    setAuthorName(data.authorName);
    setAuthorRole(data.authorRole);
    setAuthorImage(data.authorImage);
    setExcerpt(data.excerpt);
    setBody(data.body ?? []);
  }, [data]);

  return (
    <SingletonShell
      title="Pastor's message"
      description="Shown on the website home page."
      loading={isLoading}
      saving={save.isPending}
      onSave={() => save.mutate({ authorName, authorRole, authorImage, excerpt, body })}
    >
      <LocalizedField label="Author name" value={authorName} onChange={setAuthorName} required />
      <LocalizedField label="Author role" value={authorRole} onChange={setAuthorRole} required />
      <ImagePicker label="Author photo" value={authorImage} onChange={setAuthorImage} />
      <LocalizedField label="Excerpt" value={excerpt} onChange={setExcerpt} multiline required />
      <ParagraphsField label="Message" value={body} onChange={setBody} />
    </SingletonShell>
  );
}
