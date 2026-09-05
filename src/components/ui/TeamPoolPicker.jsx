"use client";

import { TEAM_OPTIONS } from "@/lib/teams";
import { useTranslation } from "@/hooks/useLanguage";
import CardPanelHeader from "./CardPanelHeader";

const LEAGUES = [...new Set(TEAM_OPTIONS.map((team) => team.league))];

export default function TeamPoolPicker({ value = [], onChange, onDone }) {
  const { t } = useTranslation();
  const allIds = TEAM_OPTIONS.map((team) => team.id);
  const selected = new Set(value);
  const toggle = (league) => {
    const leagueIds = TEAM_OPTIONS.filter((team) => team.league === league).map((team) => team.id);
    const next = new Set(selected);
    if (leagueIds.every((id) => next.has(id))) leagueIds.forEach((id) => next.delete(id));
    else leagueIds.forEach((id) => next.add(id));
    onChange?.(allIds.filter((id) => next.has(id)));
  };

  return <div className="flex h-full flex-col text-white">
    <CardPanelHeader title={t("pools.teamTitle")} description={t("pools.teamSubtitle")} onClose={onDone} closeLabel={t("common.closeTeamPool")} />
    <div data-screen-reveal className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1"><div className="space-y-2">{LEAGUES.map((league) => { const leagueTeams = TEAM_OPTIONS.filter((team) => team.league === league); const active = leagueTeams.some((team) => selected.has(team.id)); return <button key={league} type="button" onClick={() => toggle(league)} className={`block w-full border-b border-white/15 px-1 py-2.5 text-left text-sm font-semibold last:border-b-0 ${active ? "text-white" : "text-white/55 line-through"}`}>{league} <span className="font-normal opacity-55">({leagueTeams.length})</span></button>; })}</div></div>
    <div data-screen-reveal className="mt-3"><button type="button" onClick={onDone} disabled={!selected.size} className="card-action-height w-full rounded-full bg-white text-base font-semibold text-zinc-950 disabled:opacity-40">{t("pools.done")}</button></div>
  </div>;
}
