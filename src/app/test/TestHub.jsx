"use client";

import { useState } from "react";
import CartoonMaskTester from "./cartoon/CartoonMaskTester";
import FlagTester from "./flag/FlagTester";

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
        active
          ? "bg-zinc-950 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function TestHub({ cartoons, flags }) {
  const [activeTab, setActiveTab] = useState("cartoon");

  return (
    <main className="h-dvh overflow-y-auto bg-white px-5 pb-24 pt-28 text-zinc-950 sm:px-8 sm:pt-32">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            Test
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <TabButton
              active={activeTab === "cartoon"}
              onClick={() => setActiveTab("cartoon")}
            >
              Cartoon
            </TabButton>
            <TabButton
              active={activeTab === "flag"}
              onClick={() => setActiveTab("flag")}
            >
              Flag
            </TabButton>
          </div>
        </div>

        {activeTab === "cartoon" ? (
          <CartoonMaskTester cartoons={cartoons} />
        ) : (
          <FlagTester flags={flags} />
        )}
      </div>
    </main>
  );
}
