"use client";

import { ArrowLeft } from "lucide-react";
import FooterPageShell, {
  FooterPageAction,
  FooterPageHeader,
} from "@/components/sections/footer-pages/FooterPageShell";

export function LibraryFilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 px-1 py-3 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-center after:bg-foreground after:transition-transform ${
        active
          ? "text-foreground after:scale-x-100"
          : "text-foreground/38 after:scale-x-0 hover:text-foreground/68"
      }`}
    >
      {children}
    </button>
  );
}

export default function LibraryPageShell({
  backHref,
  backLabel,
  children,
  count,
  filters,
  mainRef,
  onBack,
  title,
}) {
  return (
    <FooterPageShell
      mainRef={mainRef}
      action={
        <FooterPageAction href={backHref} onClick={onBack}>
          <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
          {backLabel}
        </FooterPageAction>
      }
    >
      <FooterPageHeader
        kicker="Huestima Library"
        title={title}
        meta={count}
      >
        <div className="scrollbar-hidden mt-7 flex items-center gap-7 overflow-x-auto">
          {filters}
        </div>
      </FooterPageHeader>

      <section className="pt-8 sm:pt-10">{children}</section>
    </FooterPageShell>
  );
}
