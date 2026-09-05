"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { adminRequest } from "@/lib/adminApi";
import { pushNotification } from "@/components/ui/GlobalPushNotifications";
import RoomCardShell from "@/components/sections/room/RoomCardShell";
import { useTranslation } from "@/hooks/useLanguage";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import { playCardToCardExit } from "@/hooks/useFooterPageTransition";
import CardCloseButton from "@/components/ui/CardCloseButton";

export default function AdminLoginPage() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const [form, setForm] = useState({ username: "", password: "", code: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const scopeRef = useRef(null);

  useScreenReveal(scopeRef, [locale]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await adminRequest("/login", { method: "POST", body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(t("admin.login.authenticationFailed"));
      const card = scopeRef.current?.closest(".game-card-shell");
      await playCardToCardExit(card, scopeRef, {
        targetExpanded: true,
        hideChrome: false,
      });
      router.replace("/admin");
    } catch (loginError) {
      pushNotification(loginError.message || t("admin.login.authenticationFailed"), "error");
      setBusy(false);
    }
  }

  return (
    <RoomCardShell isExpanded>
      <form
        ref={scopeRef}
        data-route-transition-scope
        onSubmit={submit}
        className="relative flex h-full flex-col bg-black p-6 text-white sm:p-8"
      >
        <CardCloseButton
          href="/color"
          label={t("common.closeMenu")}
          className="absolute right-5 top-5 z-20 text-white/60 hover:text-white sm:right-7 sm:top-7"
        />
        <div data-screen-reveal className="max-w-[29rem] pr-10">
          <h1 className="whitespace-nowrap text-[clamp(2.4rem,10vw,4rem)] font-semibold leading-[0.88] tracking-[-0.06em]">{t("admin.login.title")}</h1>
          <p className="mt-5 max-w-[27rem] text-sm font-medium leading-[1.35] text-white/70 sm:text-base">{t("admin.login.description")}</p>
        </div>
        <div data-screen-reveal className="mt-auto grid gap-3 sm:grid-cols-2">
          <input required autoComplete="username" placeholder={t("admin.login.usernamePlaceholder")} aria-label={t("admin.login.usernamePlaceholder")} value={form.username} onChange={(event) => updateField("username", event.target.value)} className="card-control-frame card-action-height min-w-0 px-5 text-base font-semibold text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/20" />
          <div className="relative min-w-0">
            <LockKeyhole className="pointer-events-none absolute left-5 top-1/2 z-10 size-4 -translate-y-1/2 text-white/40" />
            <input required type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder={t("admin.login.passwordPlaceholder")} aria-label={t("admin.login.passwordPlaceholder")} value={form.password} onChange={(event) => updateField("password", event.target.value)} className="card-control-frame card-action-height w-full px-12 pr-12 text-base font-semibold text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/20" />
            <button type="button" aria-label={t(showPassword ? "admin.login.hidePassword" : "admin.login.showPassword")} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-white/55 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3">
            <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder={t("admin.login.codePlaceholder")} aria-label={t("admin.login.codePlaceholder")} value={form.code} onChange={(event) => updateField("code", event.target.value.replace(/\D/g, ""))} className="card-control-frame card-action-height min-w-0 px-4 text-sm font-semibold tracking-[0.12em] text-white outline-none placeholder:tracking-normal placeholder:text-white/35 focus:ring-2 focus:ring-white/20 sm:col-span-1 sm:px-5 sm:text-base sm:tracking-[0.18em]" />
            <button disabled={busy} className="rgb-hover-button card-action-height col-span-1 inline-flex min-w-0 items-center justify-center rounded-full bg-white px-3 text-center text-sm font-semibold text-zinc-950 transition-opacity disabled:cursor-wait disabled:opacity-50 sm:col-span-2 sm:px-5 sm:text-base"><span className="relative z-10">{t(busy ? "admin.login.signingIn" : "admin.login.signIn")}</span></button>
          </div>
        </div>
      </form>
    </RoomCardShell>
  );
}
