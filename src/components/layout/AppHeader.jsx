"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { APP_NAME } from "@/lib/constants";
import { GAME_FAMILY_OPTIONS } from "@/lib/gameFamily";
import { playScreenFadeOut } from "@/hooks/useScreenReveal";
import BrandLogoMark from "./BrandLogoMark";
import FullscreenToggle from "./FullscreenToggle";
import LanguageToggle from "./LanguageToggle";
import MusicToggle from "./MusicToggle";
import SoundToggle from "./SoundToggle";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "@/hooks/useLanguage";

const HISTORY_LEAVE_EVENT = "huestima-history-leave";
const HISTORY_LEAVE_COMPLETE_EVENT = "huestima-history-leave-complete";

export default function AppHeader() {
  const { locale, t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isLibraryRoute =
    pathname === "/cartoon-library" ||
    pathname === "/flag-library" ||
    pathname === "/brand-library";
  const isPrivacyRoute = pathname === "/privacy-policy";
  const isHowItWorksRoute = pathname === "/how-it-works";
  const isTestLabRoute = pathname === "/test-lab";
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavRendered, setIsNavRendered] = useState(false);
  const [hoveredFamily, setHoveredFamily] = useState(null);
  const [familyUnderline, setFamilyUnderline] = useState(null);
  const isNavigatingRef = useRef(false);
  const navigationResetRef = useRef(null);
  const menuButtonRef = useRef(null);
  const mobileOverlayRef = useRef(null);
  const mobileBubbleRef = useRef(null);
  const mobileContentRef = useRef(null);
  const mobileMenuTimelineRef = useRef(null);
  const familyNavRef = useRef(null);
  const familyLinkRefs = useRef(new Map());
  const closeMenuRef = useRef(() => {});

  useLayoutEffect(() => {
    const nav = familyNavRef.current;
    if (!nav) return undefined;

    const activeOption = GAME_FAMILY_OPTIONS.find(
      (option) => pathname === option.href || pathname?.startsWith(`${option.href}/`),
    );
    const targetOption =
      GAME_FAMILY_OPTIONS.find((option) => option.href === hoveredFamily) ||
      activeOption;
    const target = targetOption && familyLinkRefs.current.get(targetOption.href);

    if (!target) return undefined;

    const updateUnderline = () => {
      const navRect = nav.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      setFamilyUnderline({
        left: targetRect.left - navRect.left,
        width: targetRect.width,
      });
    };

    updateUnderline();
    window.addEventListener("resize", updateUnderline);
    return () => window.removeEventListener("resize", updateUnderline);
  }, [hoveredFamily, pathname, locale]);

  useEffect(() => {
    isNavigatingRef.current = false;
    if (navigationResetRef.current) {
      window.clearTimeout(navigationResetRef.current);
      navigationResetRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      mobileMenuTimelineRef.current?.kill();
      if (navigationResetRef.current) {
        window.clearTimeout(navigationResetRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isNavRendered) {
      return undefined;
    }

    const overlay = mobileOverlayRef.current;
    const bubble = mobileBubbleRef.current;
    const content = mobileContentRef.current;
    const button = menuButtonRef.current;

    if (!overlay || !bubble || !content || !button) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");

    if (mediaQuery.matches) {
      setIsNavOpen(false);
      setIsNavRendered(false);
      return undefined;
    }

    const buttonRect = button.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = buttonRect.left + buttonRect.width / 2;
    const centerY = buttonRect.top + buttonRect.height / 2;
    const maxRadius = Math.hypot(
      Math.max(centerX, viewportWidth - centerX),
      Math.max(centerY, viewportHeight - centerY),
    );
    const bubbleSize = Math.max(maxRadius * 2, 120);
    const bubbleLeft = centerX - overlayRect.left - bubbleSize / 2;
    const bubbleTop = centerY - overlayRect.top - bubbleSize / 2;
    const navTargets = content.querySelectorAll("[data-mobile-menu-nav-item]");
    const controlTargets = content.querySelectorAll("[data-mobile-menu-control]");

    mobileMenuTimelineRef.current?.kill();

    gsap.set(overlay, { autoAlpha: 1 });
    gsap.set(bubble, {
      width: bubbleSize,
      height: bubbleSize,
      left: bubbleLeft,
      top: bubbleTop,
      scale: 0,
      transformOrigin: "50% 50%",
    });
    gsap.set(content, { autoAlpha: 0 });
    gsap.set(navTargets, {
      autoAlpha: 1,
      position: "relative",
      left: "-120%",
      clipPath: "inset(-32px -120vw -32px 0px)",
    });
    gsap.set(controlTargets, {
      autoAlpha: 1,
      y: 32,
      clipPath: "inset(100% 0 0 0)",
      willChange: "transform,clip-path",
    });

    const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
    mobileMenuTimelineRef.current = tl;

    tl.to(bubble, {
      scale: 1,
      duration: 0.76,
      ease: "power3.inOut",
    })
      .set(content, { autoAlpha: 1 })
      .to(
        navTargets,
        {
          left: "0%",
          clipPath: "inset(0 0 0 0%)",
          duration: 0.62,
          stagger: 0.07,
          ease: "power3.out",
        }
      )
      .to(
        controlTargets,
        {
          y: 0,
          clipPath: "inset(0 0 0 0)",
          duration: 0.58,
          stagger: 0.075,
          ease: "power3.out",
          clearProps: "transform,clipPath,willChange",
        },
        "-=0.16",
      );

    closeMenuRef.current = () => {
      const closeTl = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          setIsNavOpen(false);
          setIsNavRendered(false);
        },
      });

      mobileMenuTimelineRef.current = closeTl;

      closeTl
        .to([...navTargets, ...controlTargets], {
          autoAlpha: 0,
          duration: 0.16,
          stagger: 0.018,
          ease: "power1.out",
        })
        .to(
          content,
          {
            autoAlpha: 0,
            duration: 0.1,
            ease: "none",
          },
          "<",
        )
        .to(bubble, {
          scale: 0,
          duration: 0.44,
          ease: "power3.inOut",
        });
    };

    return () => {
      mobileMenuTimelineRef.current?.kill();
    };
  }, [isNavRendered]);

  const playRouteTransition = async (href) => {
    if (pathname?.startsWith("/history")) {
      await new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.removeEventListener(HISTORY_LEAVE_COMPLETE_EVENT, finish);
          resolve();
        };

        window.addEventListener(HISTORY_LEAVE_COMPLETE_EVENT, finish, {
          once: true,
        });
        window.dispatchEvent(new Event(HISTORY_LEAVE_EVENT));
        window.setTimeout(finish, 1400);
      });

      router.push(href);
      return;
    }

    const scope =
      document.querySelector("[data-route-transition-scope]") ||
      document.querySelector("[data-intro-card-target]") ||
      document.querySelector("main");

    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    await playScreenFadeOut(scope, { duration: 0.24 });

    router.push(href);
  };

  const handleFamilyNavigation = (event, href, active) => {
    if (active) {
      if (isNavRendered) {
        closeMenuRef.current();
      }
      return;
    }

    if (isNavigatingRef.current) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    isNavigatingRef.current = true;
    navigationResetRef.current = window.setTimeout(() => {
      isNavigatingRef.current = false;
      navigationResetRef.current = null;
    }, 1800);

    if (isNavRendered) {
      closeMenuRef.current();
    }

    void playRouteTransition(href).catch(() => {
      isNavigatingRef.current = false;
    });
  };

  if (isLibraryRoute || isPrivacyRoute || isHowItWorksRoute || isTestLabRoute) {
    return null;
  }

  const handleMenuToggle = () => {
    if (isNavRendered) {
      closeMenuRef.current();
      return;
    }

    setIsNavOpen(true);
    setIsNavRendered(true);
  };

  return (
    <header
      className="app-header pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between p-6 sm:p-8"
      data-nav-open={isNavOpen ? "true" : undefined}
    >
      {isNavRendered && (
        <div
          ref={mobileOverlayRef}
          className="pointer-events-auto fixed inset-0 z-0 overflow-hidden p-6 text-zinc-950 md:hidden"
        >
          <div
            ref={mobileBubbleRef}
            className="absolute rounded-full bg-[#f6f6f6]/96 backdrop-blur-xl dark:bg-[#0f0f11]/94"
          />

          <div
            ref={mobileContentRef}
            className="relative flex h-full flex-col items-start pt-28"
          >
            <nav
              aria-label={t("gameFamily.label")}
              className="flex w-full flex-col items-start gap-3 text-[clamp(2.85rem,13vw,4.9rem)] font-semibold leading-[0.96] tracking-normal"
            >
              {GAME_FAMILY_OPTIONS.map((option) => {
                const active =
                  pathname === option.href || pathname?.startsWith(`${option.href}/`);

                return (
                  <div key={option.id} className="overflow-hidden">
                    <Link
                      href={option.href}
                      aria-current={active ? "page" : undefined}
                      data-mobile-menu-nav-item
                      onClick={(event) =>
                        handleFamilyNavigation(event, option.href, active)
                      }
                      className={`block transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                        active
                          ? "text-zinc-950 dark:text-white"
                          : "text-zinc-950/34 hover:text-zinc-950 dark:text-white/34 dark:hover:text-white"
                      }`}
                    >
                      {t(`gameFamily.${option.id}`)}
                    </Link>
                  </div>
                );
              })}
            </nav>

            <div className="mt-auto flex items-center gap-1 pb-1">
              <div data-mobile-menu-control className="overflow-hidden">
                <div>
                  <LanguageToggle />
                </div>
              </div>
              <div data-mobile-menu-control className="overflow-hidden">
                <div>
                  <SoundToggle />
                </div>
              </div>
              <div data-mobile-menu-control className="overflow-hidden">
                <div>
                  <MusicToggle />
                </div>
              </div>
              <div data-mobile-menu-control className="overflow-hidden">
                <div>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-auto relative z-10 flex h-11 items-center gap-6">
        <Link
          href="/color"
          aria-label={t("app.homeAria")}
          data-sound="off"
          className="app-header__brand inline-flex h-11 items-center gap-3 rounded-full text-base font-semibold uppercase leading-none tracking-normal text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50 sm:text-[17px]"
        >
          <BrandLogoMark interactive />
          <span>{APP_NAME}</span>
        </Link>

        <nav
          ref={familyNavRef}
          aria-label={t("gameFamily.label")}
          onMouseLeave={() => setHoveredFamily(null)}
          className="relative hidden h-11 items-center gap-5 text-[13px] font-semibold uppercase leading-none tracking-normal text-zinc-950/42 dark:text-white/42 md:inline-flex"
        >
          {GAME_FAMILY_OPTIONS.map((option) => {
            const active =
              pathname === option.href || pathname?.startsWith(`${option.href}/`);
            const highlighted = hoveredFamily
              ? hoveredFamily === option.href
              : active;

            return (
              <Link
                key={option.id}
                ref={(node) => {
                  if (node) familyLinkRefs.current.set(option.href, node);
                  else familyLinkRefs.current.delete(option.href);
                }}
                href={option.href}
                aria-current={active ? "page" : undefined}
                data-sound="off"
                onMouseEnter={() => setHoveredFamily(option.href)}
                onClick={(event) =>
                  handleFamilyNavigation(event, option.href, active)
                }
                className={`relative top-px inline-flex h-11 items-center rounded-full leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                  highlighted
                    ? "text-zinc-950 dark:text-white"
                    : "text-zinc-950/42 dark:text-white/42"
                }`}
              >
                {t(`gameFamily.${option.id}`)}
              </Link>
            );
          })}
          {familyUnderline && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-zinc-950 dark:bg-white"
              style={{
                width: familyUnderline.width,
                transform: `translateX(${familyUnderline.left}px)`,
                transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), width 420ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          )}
        </nav>
      </div>

      <div className="header-controls pointer-events-auto relative z-10 inline-flex h-11 items-center justify-end gap-1">
        <div className="hidden items-center gap-1 md:inline-flex">
          <LanguageToggle />
          <SoundToggle />
          <MusicToggle />
          <ThemeToggle />
          <FullscreenToggle />
        </div>

        <div className="md:hidden">
          <FullscreenToggle />
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          aria-label={isNavRendered ? t("common.closeMenu") : t("common.openMenu")}
          aria-expanded={isNavRendered}
          onClick={handleMenuToggle}
          className="grid size-11 place-items-center rounded-full text-zinc-950 transition hover:opacity-62 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50 md:hidden"
        >
          <span className="sr-only">
            {isNavRendered ? t("common.closeMenu") : t("common.openMenu")}
          </span>
          {isNavRendered ? (
            <X size={29} strokeWidth={2.15} />
          ) : (
            <Menu size={30} strokeWidth={2.15} />
          )}
        </button>
      </div>
    </header>
  );
}
