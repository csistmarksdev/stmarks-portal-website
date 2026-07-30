"use client";

import {
  ArrowRightIcon,
  BookOpenTextIcon,
  ClockIcon,
  MessageSquareQuoteIcon,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="The church itself"
        title="Church content"
        description="Single documents rather than lists — each one is edited in place and served straight to the website."
      />

      <Card>
        <CardContent className="divide-y divide-border/70 p-0">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 px-4 py-4 transition-colors first:rounded-t-3xl last:rounded-b-3xl hover:bg-hover-tint sm:px-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary ring-1 ring-border">
                <item.icon className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                  {item.description}
                </span>
              </span>
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </CardContent>
      </Card>

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
