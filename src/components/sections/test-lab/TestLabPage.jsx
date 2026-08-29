"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "@/hooks/useLanguage";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import FooterPageShell, {
  FooterPageAction,
  FooterPageHeader,
} from "@/components/sections/footer-pages/FooterPageShell";

const LINKS = {
  en: [
    ["Flag list", "/flag-library"],
    ["Cartoon list", "/cartoon-library"],
    ["Brand list", "/brand-library"],
    ["Team list", "/team-library"],
  ],
  tr: [
    ["Bayrak listesi", "/flag-library"],
    ["Çizgi film listesi", "/cartoon-library"],
    ["Marka listesi", "/brand-library"],
    ["Takım listesi", "/team-library"],
  ],
};

export default function TestLabPage() {
  const { locale, t } = useTranslation();
  const searchParams = useSearchParams();
  const mainRef = useRef(null);
  const links = LINKS[locale] || LINKS.en;
  const from = searchParams.get("from");
  const returnPath = ["color", "flag", "cartoon", "brand", "team"].includes(from)
    ? `/${from}`
    : "/color";

  const leavePage = useFooterPageTransition(mainRef);

  useEffect(() => {
    document.title = locale === "tr" ? "Huestima Test Sayfası" : "Huestima Test Page";
  }, [locale]);

  const handleClose = async (event) => {
    event.preventDefault();
    await leavePage(returnPath);
  };

  const handleLibraryNavigation = async (event, href) => {
    event.preventDefault();
    const target = from ? `${href}?from=${from}` : href;
    await leavePage(target, { returnToHome: false });
  };

  return (
    <FooterPageShell
      mainRef={mainRef}
      staticLanguage
      action={
        <FooterPageAction
          href={returnPath}
          onClick={handleClose}
          aria-label={t("common.closeTestPage")}
          className="size-11 p-0 text-foreground/62"
        >
          <X size={24} strokeWidth={1.8} aria-hidden="true" />
        </FooterPageAction>
      }
    >
      <FooterPageHeader
        title={locale === "tr" ? "Test Sayfası" : "Test Page"}
        description={
          locale === "tr"
            ? "Oyunda kullanılan görsel materyalleri incele."
            : "Browse the visual material used throughout the game."
        }
      />

      <nav className="border-b border-foreground/12" aria-label={t("common.materialLibraries")}>
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={from ? `${href}?from=${from}` : href}
              onClick={(event) => void handleLibraryNavigation(event, href)}
              className="group flex items-center justify-between border-b border-foreground/12 py-6 text-lg font-medium no-underline transition-colors last:border-b-0 hover:text-foreground/55 sm:py-7 sm:text-xl"
            >
              <span>{label}</span>
              <span
                aria-hidden="true"
                className="text-xl font-normal text-foreground/35 transition-colors group-hover:text-foreground/65"
              >
                →
              </span>
            </Link>
          ))}
      </nav>
    </FooterPageShell>
  );
}
