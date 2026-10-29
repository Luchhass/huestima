"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "@/hooks/useLanguage";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import { CARTOON_OPTIONS, CARTOON_PACKS } from "@/lib/cartoons";
import FooterPageShell, {
  FooterPageHeader,
} from "@/components/sections/footer-pages/FooterPageShell";
import CardCloseButton from "@/components/ui/CardCloseButton";

const PACK_LABELS = {
  "adventure-time": { en: "Adventure Time", tr: "Adventure Time" },
  "ben-10": { en: "Ben 10", tr: "Ben 10" },
  "regular-show": { en: "Regular Show", tr: "Regular Show" },
  gumball: { en: "The Amazing World of Gumball", tr: "Gumball" },
};

const ALLOWED_FAMILIES = new Set([
  "color",
  "flag",
  "cartoon",
  "brand",
  "team",
  "perception",
]);

function getPackLabel(pack, locale) {
  return PACK_LABELS[pack]?.[locale] || pack.replaceAll("-", " ");
}

export default function CartoonListPage() {
  const { locale } = useTranslation();
  const searchParams = useSearchParams();
  const mainRef = useRef(null);
  const [activePack, setActivePack] = useState("all");
  const isTurkish = locale === "tr";
  const requestedFamily = searchParams.get("from");
  const family = ALLOWED_FAMILIES.has(requestedFamily) ? requestedFamily : "cartoon";
  const returnPath = `/explore?from=${family}&via=child`;
  const leavePage = useFooterPageTransition(mainRef);

  const handleClose = async (event) => {
    event.preventDefault();
    await leavePage(returnPath);
  };

  const visibleCartoons = activePack === "all"
    ? CARTOON_OPTIONS
    : CARTOON_OPTIONS.filter((item) => item.pack === activePack);

  return (
    <FooterPageShell
      mainRef={mainRef}
      fullScreen
      className="text-white"
      action={
        <CardCloseButton
          href={returnPath}
          onClick={handleClose}
          label={isTurkish ? "Explore sayfasına dön" : "Back to Explore"}
          className="absolute right-6 top-6 text-foreground/62 sm:right-10 sm:top-8 lg:right-14"
        />
      }
    >
      <FooterPageHeader
        kicker="Explore"
        title={isTurkish ? "Çizgi film listesi" : "Cartoon list"}
        description={
          isTurkish
            ? "Huestima çizgi film havuzundaki tüm görselleri incele."
            : "Browse every image in Huestima's cartoon pool."
        }
        meta={isTurkish ? `${visibleCartoons.length} görsel` : `${visibleCartoons.length} scenes`}
      />

      <section aria-label={isTurkish ? "Çizgi film görselleri" : "Cartoon images"} className="pt-7">
        <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
          {isTurkish ? "Tüm havuzlar" : "All pools"}
        </h2>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-b border-white/14" aria-label={isTurkish ? "Havuz filtreleri" : "Pool filters"}>
          {CARTOON_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              aria-pressed={activePack === pack.id}
              onClick={() => setActivePack(pack.id)}
              className={`border-b-2 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:text-white ${activePack === pack.id ? "border-white text-white" : "border-transparent text-white/48 hover:text-white/80"}`}
            >
              {getPackLabel(pack.id, locale)}
            </button>
          ))}
        </div>

        {visibleCartoons.length > 0 ? (
          <ul className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCartoons.map((item) => {
              const label = item.labels?.[locale] || item.label;
              return (
                <li key={item.id} className="min-w-0">
                  <div className="relative aspect-video overflow-hidden rounded-2xl">
                    <Image
                      src={item.sourceImagePath}
                      alt={label}
                      fill
                      sizes="(max-width: 639px) 88vw, (max-width: 1023px) 44vw, 31vw"
                      loading="lazy"
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-16 text-center text-sm text-white/52">
            {isTurkish ? "Eşleşen çizgi film bulunamadı." : "No matching cartoons found."}
          </p>
        )}
      </section>
    </FooterPageShell>
  );
}
