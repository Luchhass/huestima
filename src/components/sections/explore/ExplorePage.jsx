"use client";

import Link from "next/link";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "@/hooks/useLanguage";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import FooterPageShell, {
  FooterPageHeader,
} from "@/components/sections/footer-pages/FooterPageShell";
import CardCloseButton from "@/components/ui/CardCloseButton";

const ALLOWED_FAMILIES = new Set([
  "color",
  "flag",
  "cartoon",
  "brand",
  "team",
  "perception",
]);
const EXPLORE_ITEM_HEADING_CLASS =
  "text-xl font-semibold leading-[1.2] tracking-[-0.035em] sm:text-2xl";

export default function ExplorePage() {
  const { locale } = useTranslation();
  const mainRef = useRef(null);
  const searchParams = useSearchParams();
  const isTurkish = locale === "tr";
  const requestedFamily = searchParams.get("from");
  const family = ALLOWED_FAMILIES.has(requestedFamily) ? requestedFamily : "cartoon";
  const viaChild = searchParams.get("via") === "child";
  const returnPath = `/${family}`;
  const leavePage = useFooterPageTransition(mainRef);
  const items = [
    {
      number: "01",
      href: `/explore/cartoon-list?from=${family}`,
      title: isTurkish ? "Çizgi film listesi" : "Cartoon list",
      description: isTurkish
        ? "Huestima çizgi film havuzundaki tüm görselleri incele."
        : "Browse every image in Huestima's cartoon pool.",
    },
    {
      number: "02",
      href: `/how-it-works?from=explore&family=${family}`,
      title: "How it works",
      description: isTurkish
        ? "Çizgi film renk sisteminin nasıl çalıştığını adım adım gör."
        : "See how the cartoon color system works, step by step.",
    },
  ];

  const handleItemNavigation = async (event, href) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    await leavePage(href);
  };

  const handleClose = async (event) => {
    event.preventDefault();
    await leavePage(returnPath);
  };

  return (
    <FooterPageShell
      mainRef={mainRef}
      fullScreen={viaChild}
      className="text-white"
      action={
        <CardCloseButton
          href={returnPath}
          onClick={handleClose}
          label={isTurkish ? "Sayfayı kapat" : "Close page"}
          className="absolute right-6 top-6 text-foreground/62 sm:right-10 sm:top-8 lg:right-14"
        />
      }
    >
      <article>
        <FooterPageHeader
          kicker={null}
          title="Explore"
          description={
            isTurkish
              ? "Çizgi film havuzunu incele ve Huestima'nın renk sistemini keşfet."
              : "Browse the cartoon pool and see how Huestima's color system works."
          }
        />

        <nav aria-label={isTurkish ? "Explore sayfaları" : "Explore pages"} className="mt-8">
          <ul className="divide-y divide-foreground/10">
            {items.map((item) => (
              <li key={item.number}>
                <Link
                  href={item.href}
                  onClick={(event) => void handleItemNavigation(event, item.href)}
                  className="grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-4 py-4 text-white no-underline transition-colors hover:text-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:min-h-28 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6 sm:py-5"
                >
                  <span className={`block ${EXPLORE_ITEM_HEADING_CLASS}`}>
                    {item.number}
                  </span>
                  <span className="min-w-0">
                    <span className={`block ${EXPLORE_ITEM_HEADING_CLASS}`}>
                      {item.title}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-white/52 sm:text-base">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </FooterPageShell>
  );
}
