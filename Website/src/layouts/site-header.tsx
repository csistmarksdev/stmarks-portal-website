"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { usePastOpening } from "@/providers/hero-scroll-provider";

import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MAIN_NAV } from "@/constants/navigation";
import { ROUTES } from "@/constants/site";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface SiteHeaderProps {
  /**
   * Start transparent with light text, for pages whose first section is dark
   * full-bleed media. Defaults to the home page, whose first section is the
   * cinematic hero. Pass explicitly to override.
   */
  overHero?: boolean;
}

export function SiteHeader({ overHero }: SiteHeaderProps = {}) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tSite = useTranslations("site");
  const pathname = usePathname();

  /*
   * True once the header sits over page content rather than over the opening:
   * the whole cinematic hero on the home page, a short scroll everywhere else.
   * Shared with the back-to-top button so the two appear together.
   */
  const pastOpening = usePastOpening(24);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  /*
   * Close the menu on navigation.
   *
   * Adjusted during render rather than in an effect: React discards this pass
   * and re-runs immediately, so the menu is already closed on the first paint
   * of the new route. Doing it in an effect painted the new page with the old
   * menu still open for a frame.
   */
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setMobileOpen(false);
    setOpenDropdown(null);
  }

  // Lock body scroll while the menu is open; the panel scrolls internally.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  /**
   * On a cinematic page the header stays transparent for the whole hero — it
   * only takes on its glass surface once the sequence has played out. On every
   * other page the first section is the dark PageHero, which is short, so the
   * usual scroll threshold applies.
   */
  const isTransparent = overHero ?? !pastOpening;

  /** The glass surface appears only once the header sits over page content. */
  const showSurface = pastOpening;

  function isActive(href: string) {
    if (href === ROUTES.home) return pathname === ROUTES.home;
    return pathname.startsWith(href);
  }

  /*
    The menu shares the bar's surface, so it shares the bar's text colour too:
    light over a hero, dark once the glass appears.
  */
  const lightOnDark = isTransparent;

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3 sm:pt-5">
      {/* Keeps white nav text legible over bright cinematic frames. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent transition-opacity duration-500",
          isTransparent ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Dims the page behind the open menu and closes it on an outside tap. */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.button
            type="button"
            aria-label={tCommon("closeMenu")}
            onClick={() => setMobileOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 -z-10 bg-sand-950/50 backdrop-blur-sm xl:hidden"
          />
        ) : null}
      </AnimatePresence>

      {/*
        Floating island, sized by the page container so its edges line up
        with the hero text and every section's measure below. Its shape never
        reacts to the menu — the menu is a separate panel beneath it.
      */}
      <Container className="relative">
        <div
          className={cn(
            "rounded-full border transition-all duration-500 ease-[var(--ease-out-expo)]",
            showSurface
              ? "glass border-[var(--border)] shadow-lg shadow-sand-900/5"
              : "border-white/15 bg-white/[0.06] backdrop-blur-md",
          )}
        >
          <div className="flex h-[var(--header-height)] items-center justify-between gap-3 pl-4 pr-2.5 sm:pl-6 sm:pr-4">
          {/* Wordmark */}
          <Link
            href={ROUTES.home}
            className={cn(
              // Must be allowed to shrink: with `shrink-0` the nav overflows
              // on top of the wordmark instead of the name truncating.
              "group flex min-w-0 max-w-[58vw] items-center gap-2.5 transition-colors sm:max-w-none",
              lightOnDark ? "text-white" : "text-[var(--foreground)]",
            )}
          >
            {/* The parish crest. Drop-shadow lifts the silver shield edge off
                both the dark hero and the light glass surface below it. */}
            <Image
              src="/logo-crest.png"
              alt=""
              aria-hidden
              width={44}
              height={44}
              priority
              unoptimized
              className="size-9 shrink-0 object-contain drop-shadow-sm sm:size-10"
            />
            {/* Church name over locality. Both lines truncate rather than
                overflowing into the nav on narrow screens. */}
            <span className="flex min-w-0 flex-col leading-[1.15]">
              <span
                data-wordmark
                className="truncate font-display text-[0.8125rem] font-semibold sm:text-[0.9375rem]"
              >
                {tSite("wordmark.line1")}
              </span>
              <span
                data-wordmark-sub
                className={cn(
                  "truncate text-[0.6rem] uppercase tracking-[0.14em] sm:text-[0.65rem]",
                  lightOnDark
                    ? "text-white/70"
                    : "text-[var(--muted-foreground)]",
                )}
              >
                {tSite("wordmark.line2")}
              </span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav
            data-site-nav
            aria-label={t("primary")}
            className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex"
          >
            {MAIN_NAV.map((item) => {
              const active = isActive(item.href);
              const hasChildren = Boolean(item.children?.length);

              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() =>
                    hasChildren && setOpenDropdown(item.href)
                  }
                  onMouseLeave={() => hasChildren && setOpenDropdown(null)}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-expanded={
                      hasChildren ? openDropdown === item.href : undefined
                    }
                    className={cn(
                      "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-[0.78rem] font-medium transition-colors",
                      isTransparent
                        ? "text-white/85 hover:bg-white/10 hover:text-white"
                        : "text-[var(--foreground)] hover:bg-sand-100",
                      active &&
                        (isTransparent
                          ? "bg-white/15 text-white"
                          : "text-[var(--primary)]"),
                    )}
                  >
                    {t(item.labelKey)}
                    {hasChildren ? (
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "size-3.5 transition-transform duration-300",
                          openDropdown === item.href && "rotate-180",
                        )}
                      />
                    ) : null}
                  </Link>

                  <AnimatePresence>
                    {hasChildren && openDropdown === item.href ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-0 top-full w-60 pt-2"
                      >
                        <ul className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl shadow-sand-900/10">
                          {item.children?.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className="block rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-sand-100 hover:text-[var(--primary)]"
                              >
                                {t(child.labelKey)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex shrink-0 items-center gap-2.5">
            <LanguageSwitcher
              tone={isTransparent ? "onDark" : "default"}
              className="hidden sm:flex"
            />

            <button
              type="button"
              data-nav-toggle
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? tCommon("closeMenu") : tCommon("openMenu")}
              aria-expanded={mobileOpen}
              className={cn(
                "grid size-9 place-items-center rounded-full border transition-colors sm:size-10 xl:hidden",
                lightOnDark
                  ? "border-white/30 text-white hover:bg-white/10"
                  : "border-[var(--border)] text-[var(--foreground)] hover:bg-sand-100",
              )}
            >
              {mobileOpen ? (
                <X aria-hidden className="size-5" />
              ) : (
                <Menu aria-hidden className="size-5" />
              )}
            </button>
            </div>
          </div>
        </div>

        {/*
          Menu panel: its own card below the bar, carrying the bar's surface
          and the site's card radius. It drops into place from the top edge
          rather than the bar stretching to contain it, so the pill keeps its
          shape throughout.
        */}
        <AnimatePresence initial={false}>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "top center" }}
              className={cn(
                "mt-2 overflow-hidden rounded-3xl border xl:hidden",
                showSurface
                  ? "glass border-[var(--border)] shadow-lg shadow-sand-900/5"
                  : "border-white/15 bg-white/[0.06] backdrop-blur-md",
              )}
            >
              <MobileMenu
                onClose={() => setMobileOpen(false)}
                isActive={isActive}
                onDark={lightOnDark}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Container>
    </header>
  );
}


/**
 * Mobile navigation. Rendered in a panel below the header bar rather than a
 * drawer; the panel owns the surface and radius, so this carries no chrome of
 * its own.
 *
 * `onDark` tracks the bar: light text while the header floats over a hero,
 * dark text once the glass surface appears.
 */
function MobileMenu({
  onClose,
  isActive,
  onDark,
}: {
  onClose: () => void;
  isActive: (href: string) => boolean;
  onDark: boolean;
}) {
  const t = useTranslations("nav");
  const tHeader = useTranslations("header");
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      {/* Caps the panel so a long nav scrolls inside the island instead of
          running off the bottom of the screen. */}
      <nav
        aria-label={t("primary")}
        className="max-h-[calc(100svh-var(--header-height)-6rem)] overflow-y-auto px-3 py-4"
      >
        <motion.ul
          // Declares its own initial/animate: the panel above animates height,
          // not a variant, so there is nothing for these to inherit.
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.04, delayChildren: 0.12 },
            },
          }}
          className="space-y-0.5"
        >
          {MAIN_NAV.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const isExpanded = expanded === item.href;
            const active = isActive(item.href);

            return (
              <motion.li
                key={item.href}
                variants={{
                  hidden: { opacity: 0, y: -8 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
              >
                <div className="flex items-center gap-1">
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 font-display text-lg font-semibold transition-colors",
                      active
                        ? onDark
                          ? "text-accent-300"
                          : "text-[var(--primary)]"
                        : onDark
                          ? "text-white/85 hover:bg-white/5 hover:text-white"
                          : "text-[var(--foreground)] hover:bg-sand-100",
                    )}
                  >
                    {/* Marks the current page without relying on colour alone,
                        and holds its space so labels stay aligned. */}
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 shrink-0 rotate-45 transition-colors duration-300",
                        active
                          ? "bg-accent-500"
                          : onDark
                            ? "bg-white/25 group-hover:bg-white/50"
                            : "bg-sand-300 group-hover:bg-sand-400",
                      )}
                    />
                    {t(item.labelKey)}
                  </Link>

                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : item.href)}
                      aria-expanded={isExpanded}
                      aria-label={t(item.labelKey)}
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full transition-colors",
                        onDark
                          ? "text-white/55 hover:bg-white/10 hover:text-white"
                          : "text-[var(--muted-foreground)] hover:bg-sand-100 hover:text-[var(--foreground)]",
                      )}
                    >
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "size-4 transition-transform duration-300",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  ) : null}
                </div>

                <AnimatePresence initial={false}>
                  {hasChildren && isExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      {/* Hairline rail ties the children to their parent. */}
                      <ul
                        className={cn(
                          "ml-[0.4375rem] border-l pl-5 pt-1",
                          onDark ? "border-white/15" : "border-[var(--border)]",
                        )}
                      >
                        {item.children?.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onClose}
                              className={cn(
                                "block rounded-xl px-3 py-2 text-sm transition-colors",
                                onDark
                                  ? "text-white/55 hover:bg-white/5 hover:text-white"
                                  : "text-[var(--muted-foreground)] hover:bg-sand-100 hover:text-[var(--foreground)]",
                              )}
                            >
                              {t(child.labelKey)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

      <div
        className={cn(
          "flex items-center gap-3 border-t p-4",
          onDark ? "border-white/10" : "border-[var(--border)]",
        )}
      >
        <Button asChild variant="accent" size="md" className="flex-1">
          <Link href={ROUTES.contact} onClick={onClose}>
            {tHeader("worshipWithUs")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>

        <LanguageSwitcher
          tone={onDark ? "onDark" : "default"}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
