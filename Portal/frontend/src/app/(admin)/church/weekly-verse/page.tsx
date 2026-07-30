"use client";

import type { LocalizedText, WeeklyVerse } from "@portal/shared";
import { useEffect, useState } from "react";

import { LocalizedField } from "@/components/admin/localized-field";
import { SingletonShell } from "@/components/admin/singleton-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSingleton } from "@/hooks/use-singleton";
import { toDateInput } from "@/lib/utils";

const EMPTY: LocalizedText = { en: "", ta: "" };

export default function WeeklyVersePage() {
  const { data, isLoading, save } = useSingleton<WeeklyVerse>("weekly-verse");

  const [reference, setReference] = useState(EMPTY);
  const [text, setText] = useState(EMPTY);
  const [weekOf, setWeekOf] = useState("");

  useEffect(() => {
    if (!data) return;
    setReference(data.reference);
    setText(data.text);
    setWeekOf(toDateInput(data.weekOf));
  }, [data]);

  return (
    <SingletonShell
      title="Weekly verse"
      description="The verse of the week on the website home page."
      loading={isLoading}
      saving={save.isPending}
      onSave={() =>
        save.mutate({
          reference,
          text,
          weekOf: weekOf || new Date().toISOString().slice(0, 10),
        })
      }
    >
      <LocalizedField label="Reference" value={reference} onChange={setReference} required />
      <LocalizedField label="Verse text" value={text} onChange={setText} multiline required />
      <div className="space-y-1.5">
        <Label>Week of</Label>
        <Input type="date" value={weekOf} onChange={(event) => setWeekOf(event.target.value)} />
      </div>
    </SingletonShell>
  );
}
