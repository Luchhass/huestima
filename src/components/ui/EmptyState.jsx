"use client";

import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, className = "" }) {
  return (
    <div className={`flex h-full min-h-32 flex-col items-center justify-center px-6 text-center ${className}`}>
      <Icon className="size-7 text-white/42" strokeWidth={1.8} aria-hidden="true" />
      <p className="mt-4 text-base font-semibold text-white/78 sm:text-lg">{title}</p>
      {description && <p className="mt-2 max-w-xs text-sm font-medium leading-[1.4] text-white/45">{description}</p>}
    </div>
  );
}
