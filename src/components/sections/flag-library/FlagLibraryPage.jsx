"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FLAG_OPTIONS } from "@/lib/flags";
import { FLAG_DIFFICULTY_OPTIONS } from "@/lib/flags";
import { useTranslation } from "@/hooks/useLanguage";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import LibraryPageShell, {
  LibraryFilterButton,
} from "@/components/sections/library/LibraryPageShell";

const ALL_GROUP_KEY = "all";

const FLAG_GROUPS = FLAG_DIFFICULTY_OPTIONS.map((difficulty) => ({
  group: difficulty.id,
  label: difficulty.label,
  items: FLAG_OPTIONS.filter((flag) => flag.difficulty === difficulty.id),
}));

export default function FlagLibraryPage() {
  const { locale } = useTranslation();
  const mainRef = useRef(null);
  const searchParams = useSearchParams();
  const [activeGroup, setActiveGroup] = useState(ALL_GROUP_KEY);
  const leavePage = useFooterPageTransition(mainRef);
  const from = searchParams.get("from");
  const testLabPath = from ? `/test-lab?from=${from}` : "/test-lab";

  const handleBack = async (event) => {
    event.preventDefault();
    await leavePage(testLabPath, { returnToHome: false });
  };

  const selectedGroup = useMemo(() => {
    if (activeGroup === ALL_GROUP_KEY) {
      return {
        group: ALL_GROUP_KEY,
        items: FLAG_GROUPS.flatMap((group) => group.items),
      };
    }

    return FLAG_GROUPS.find((group) => group.group === activeGroup) || FLAG_GROUPS[0] || null;
  }, [activeGroup]);

  return (
    <LibraryPageShell
      mainRef={mainRef}
      backHref={testLabPath}
      onBack={handleBack}
      backLabel={locale === "tr" ? "Test Page'e dön" : "Back to Test Page"}
      title={locale === "tr" ? "Bayraklar" : "Flags"}
      count={selectedGroup ? `${selectedGroup.items.length} ${locale === "tr" ? "bayrak" : "flags"}` : ""}
      filters={[ALL_GROUP_KEY, ...FLAG_GROUPS.map((group) => group.group)].map((group) => (
        <LibraryFilterButton
          key={group}
          active={group === activeGroup}
          onClick={() => setActiveGroup(group)}
        >
          {group === ALL_GROUP_KEY
            ? locale === "tr" ? "Tümü" : "All"
            : FLAG_GROUPS.find((item) => item.group === group)?.label || group}
        </LibraryFilterButton>
      ))}
    >
      {selectedGroup ? (
        <div className="mx-auto grid w-full max-w-[68rem] grid-cols-1 gap-x-7 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {selectedGroup.items.map((item, index) => (
            <article key={item.id}>
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[18px] border border-foreground/8 bg-white">
                <Image
                  src={item.originalScenePath || item.scenePath}
                  alt={item.label}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 px-1">
                <h2 className="truncate text-base font-semibold text-foreground">
                  {item.label}
                </h2>
                <span className="shrink-0 text-xs font-medium text-foreground/38">
                  #{index + 1}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </LibraryPageShell>
  );
}
