"use client";

import {
  ArrowRightIcon,
  BookOpenTextIcon,
  ClockIcon,
  MessageSquareQuoteIcon,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";

const ITEMS: Array<{
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    href: "/church/weekly-verse",
    label: "Weekly verse",
    description: "The scripture on the home page. Change it when the week turns.",
    icon: BookOpenTextIcon,
  },
  {
    href: "/church/service-timings",
    label: "Service timings",
    description: "The services table — days, times and venues.",
    icon: ClockIcon,
  },
  {
    href: "/church/pastor-message",
    label: "Pastor's message",
    description: "A word from the presbyter, with their photo and role.",
    icon: MessageSquareQuoteIcon,
  },
];

export default function ChurchIndexPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="The church itself"
        title="Church content"
        description="Single documents rather than lists — each one is edited in place and served straight to the website."
      />

      {/* One card per document, across the width rather than a narrow list. */}
      <div className="grid gap-4 md:grid-cols-3">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="flex h-full flex-col gap-4 p-5 transition-colors group-hover:ring-border-strong">
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary ring-1 ring-border">
                <item.icon className="size-4.5" />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium text-foreground">{item.label}</span>
                <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                  {item.description}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-primary">
                Edit
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-4 rounded-2xl border border-dashed border-border-strong px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        The church profile, history, vision &amp; mission, diocese details,
        the leadership roll and hero images are written into the website
        itself. They change once in a
        decade, so they live in the code rather than here — ask a developer if
        one of them ever needs updating.
      </p>
    </div>
  );
}
