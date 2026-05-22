"use client";

import { useTranslation } from "@/hooks/useLanguage";
import { DEFAULT_LOCALE, translate } from "@/lib/i18n";

export const MAX_PLAYER_NAME_LENGTH = 18;
export const MIN_PLAYER_NAME_LENGTH = 2;

export function cleanPlayerName(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_PLAYER_NAME_LENGTH);
}

export function validatePlayerName(
  value,
  t = (key, values) => translate(DEFAULT_LOCALE, key, values),
) {
  const cleanName = cleanPlayerName(value);

  if (!cleanName) return t("player.nameRequired");
  if (cleanName.length < MIN_PLAYER_NAME_LENGTH) {
    return t("player.nameTooShort", { min: MIN_PLAYER_NAME_LENGTH });
  }

  if (value.trim().length > MAX_PLAYER_NAME_LENGTH) {
    return t("player.nameTooLong", { max: MAX_PLAYER_NAME_LENGTH });
  }

  return "";
}

export default function PlayerNameField({
  value,
  onChange,
  disabled = false,
}) {
  const { t } = useTranslation();

  return (
    <div className="block">
      <input
        type="text"
        value={value}
        disabled={disabled}
        maxLength={MAX_PLAYER_NAME_LENGTH + 8}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t("player.nameAria")}
        className="card-control-frame card-action-height w-full appearance-none px-7 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:ring-2 focus:ring-white/18 disabled:opacity-60"
        placeholder={t("player.namePlaceholder")}
        autoComplete="nickname"
      />
    </div>
  );
}
