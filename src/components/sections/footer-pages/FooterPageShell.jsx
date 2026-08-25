"use client";

export function FooterPageAction({ children, className = "", ...props }) {
  return (
    <a
      {...props}
      className={`absolute right-6 top-6 z-30 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-2 text-sm font-medium text-foreground/48 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 sm:right-10 sm:top-8 lg:right-14 ${className}`}
    >
      {children}
    </a>
  );
}

export function FooterPageHeader({
  children,
  description,
  kicker = "Huestima",
  meta,
  metaPlacement = "side",
  title,
}) {
  return (
    <header className="border-b border-foreground/10 pb-7 sm:pb-9">
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/38">
          {kicker}
        </p>
      ) : null}
      <div
        className={`${kicker ? "mt-3" : ""} flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between`}
      >
        <h1 className="text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
          {title}
        </h1>
        {meta && metaPlacement === "side" ? (
          <p className="shrink-0 text-sm font-medium text-foreground/42">
            {meta}
          </p>
        ) : null}
      </div>
      {meta && metaPlacement === "below" ? (
        <p className="mt-4 text-sm font-medium text-foreground/42">{meta}</p>
      ) : null}
      {description ? (
        <p
          className={`${metaPlacement === "below" ? "mt-5" : "mt-4"} max-w-3xl text-base leading-relaxed text-foreground/58 sm:text-lg`}
        >
          {description}
        </p>
      ) : null}
      {children}
    </header>
  );
}

export default function FooterPageShell({
  action,
  children,
  className = "",
  mainRef,
  scrollable = true,
  staticLanguage = false,
}) {
  return (
    <main
      ref={mainRef}
      data-language-static={staticLanguage ? "" : undefined}
      className={`app-gradient relative h-dvh px-6 pt-8 sm:px-10 lg:px-14 ${
        scrollable
          ? "scrollbar-hidden overflow-y-auto pb-16"
          : "overflow-clip pb-6 sm:pb-8"
      } ${className}`}
    >
      {action}
      <div className="mx-auto w-full max-w-[68rem] pt-16 sm:pt-14">
        {children}
      </div>
    </main>
  );
}
