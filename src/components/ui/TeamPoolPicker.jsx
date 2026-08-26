"use client";

import { X } from "lucide-react";
import { TEAM_OPTIONS } from "@/lib/teams";
import { useTranslation } from "@/hooks/useLanguage";

const LEAGUES = [...new Set(TEAM_OPTIONS.map((team) => team.league))];

export default function TeamPoolPicker({ value = [], onChange, onDone }) {
  const { locale } = useTranslation();
  const allIds = TEAM_OPTIONS.map((team) => team.id);
  const selected = new Set(value.length ? value : allIds);
  const toggle = (league) => {
    const leagueIds = TEAM_OPTIONS.filter((team) => team.league === league).map((team) => team.id);
    const next = new Set(selected);
    if (leagueIds.every((id) => next.has(id))) leagueIds.forEach((id) => next.delete(id));
    else leagueIds.forEach((id) => next.add(id));
    onChange?.(allIds.filter((id) => next.has(id)));
  };

  return <div className="flex h-full flex-col text-white">
    <div data-screen-reveal className="mb-4 flex items-start justify-between gap-4"><div><h1 className="text-[clamp(1.8rem,7vw,2.8rem)] font-semibold leading-none">{locale === "tr" ? "Takım havuzu" : "Team pool"}</h1><p className="mt-2 text-sm font-medium text-white/65">{locale === "tr" ? "Bildiğin ligleri seç." : "Choose the leagues you know."}</p></div><button type="button" onClick={onDone} aria-label={locale === "tr" ? "Takım havuzunu kapat" : "Close team pool"} className="shrink-0 rounded-full p-1 text-white/80 transition-opacity hover:opacity-60"><X className="size-7" strokeWidth={1.8} /></button></div>
    <div data-screen-reveal className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1"><div className="space-y-2">{LEAGUES.map((league) => { const leagueTeams = TEAM_OPTIONS.filter((team) => team.league === league); const active = leagueTeams.some((team) => selected.has(team.id)); return <div key={league} className="border-b border-white/15 px-1 py-2.5 last:border-b-0"><button type="button" onClick={() => toggle(league)} className={`text-sm font-semibold ${active ? "text-white" : "text-white/55 line-through"}`}>{league} <span className="font-normal opacity-55">({leagueTeams.length})</span></button></div>; })}</div></div>
    <div data-screen-reveal className="mt-3"><button type="button" onClick={onDone} disabled={!selected.size} className="card-action-height w-full rounded-full bg-white text-base font-semibold text-zinc-950 disabled:opacity-40">{locale === "tr" ? "Tamam" : "Done"}</button></div>
  </div>;
}
