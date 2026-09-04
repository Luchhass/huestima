import { FLAG_DIFFICULTY_OPTIONS } from "../../shared/flagDifficulty.mjs";
import { CARTOON_PACKS } from "@/lib/cartoons";
import { GAME_FAMILY_IDS } from "@/lib/gameFamily";
import { TEAM_OPTIONS } from "@/lib/teams";

export function getPoolLinkLabel(gameFamily, locale, {
  cartoonIds = [],
  flagDifficulties = [],
  teamIds = [],
}) {
  const isTurkish = locale === "tr";
  const allLabel = isTurkish ? "tümü" : "all";
  const multipleLabel = isTurkish ? "birden fazla" : "multiple";
  const options = gameFamily === GAME_FAMILY_IDS.CARTOON
    ? CARTOON_PACKS
    : gameFamily === GAME_FAMILY_IDS.TEAM
      ? [...new Set(TEAM_OPTIONS.map((team) => team.league))]
      : FLAG_DIFFICULTY_OPTIONS;
  const selectedCount = gameFamily === GAME_FAMILY_IDS.CARTOON
    ? options.filter((pack) => pack.itemIds.every((id) => cartoonIds.includes(id))).length
    : gameFamily === GAME_FAMILY_IDS.TEAM
      ? options.filter((league) =>
          TEAM_OPTIONS
            .filter((team) => team.league === league)
            .every((team) => teamIds.includes(team.id)),
        ).length
      : options.filter((option) => flagDifficulties.includes(option.id)).length;
  const selectedName = gameFamily === GAME_FAMILY_IDS.CARTOON
    ? options.find((pack) => pack.itemIds.every((id) => cartoonIds.includes(id)))?.label
    : gameFamily === GAME_FAMILY_IDS.TEAM
      ? options.find((league) =>
          TEAM_OPTIONS
            .filter((team) => team.league === league)
            .every((team) => teamIds.includes(team.id)),
        )
      : options.find((option) => flagDifficulties.includes(option.id))?.label;
  const title = gameFamily === GAME_FAMILY_IDS.CARTOON
    ? (isTurkish ? "Çizgi film listesi" : "Cartoon list")
    : gameFamily === GAME_FAMILY_IDS.FLAG
      ? (isTurkish ? "Bayrak listesi" : "Flag list")
      : (isTurkish ? "Takım listesi" : "Team list");
  const selection = selectedCount === options.length
    ? allLabel
    : selectedCount === 1
      ? selectedName
      : multipleLabel;

  return `${title} (${selection})`;
}
