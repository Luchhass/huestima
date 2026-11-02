import { POKEMON_ITEMS, getPokemonItem } from "../../shared/pokemonCatalog.mjs";

export const POKEMON_OPTIONS = POKEMON_ITEMS.map((pokemon) => ({
  ...pokemon,
  number: Number(pokemon.id),
}));

export const POKEDEX_STORAGE_KEY = "huestima-pokedex-v1";

export const getPokemon = getPokemonItem;

export function readPokedex() {
  try { const parsed = JSON.parse(localStorage.getItem(POKEDEX_STORAGE_KEY) || "{}"); return parsed && typeof parsed === "object" ? parsed : {}; }
  catch { return {}; }
}

export function recordPokemonScore(id, score) {
  if (!id || !(score > 0)) return;
  const dex = readPokedex();
  const previous = dex[id] || { bestScore: 0, catches: 0 };
  dex[id] = { bestScore: Math.max(previous.bestScore || 0, score), catches: (previous.catches || 0) + 1 };
  localStorage.setItem(POKEDEX_STORAGE_KEY, JSON.stringify(dex));
  window.dispatchEvent(new Event("huestima-pokedex-update"));
}
