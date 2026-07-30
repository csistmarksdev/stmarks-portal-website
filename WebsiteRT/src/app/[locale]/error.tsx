"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading, Text } from "@/components/ui/typography";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    // Replace with the project's error reporter when one is configured.
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-[80vh] items-center pt-[var(--header-height)]"
    >
      <Container size="md" className="text-center">
        <Heading as="h1" level="h1">
          {t("title")}
        </Heading>

        <Text size="lg" tone="muted" className="mx-auto mt-4 max-w-md">
          {t("subtitle")}
        </Text>

        <Button size="lg" className="mt-9" onClick={reset}>
          {t("retry")}
        </Button>
      </Container>
    </main>
  );
}
