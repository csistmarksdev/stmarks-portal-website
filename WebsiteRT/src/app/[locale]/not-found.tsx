import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading, Text } from "@/components/ui/typography";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main
      id="main"
      className="flex min-h-[80vh] items-center pt-[var(--header-height)]"
    >
      <Container size="md" className="text-center">
        <p className="font-display text-7xl font-semibold text-brand-200 sm:text-8xl">
          404
        </p>

        <Heading as="h1" level="h1" className="mt-6">
          {t("title")}
        </Heading>

        <Text size="lg" tone="muted" className="mx-auto mt-4 max-w-md">
          {t("subtitle")}
        </Text>

        <Button asChild size="lg" className="mt-9">
          <Link href={ROUTES.home}>{t("cta")}</Link>
        </Button>
      </Container>
    </main>
  );
}
