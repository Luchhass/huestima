"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Crown, History, Menu, UserRound, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { requestActiveGameExit } from "@/lib/gameNavigation";
import { clearAllGameSessions } from "@/hooks/useGameSession";
import { APP_NAME } from "@/lib/constants";
import { GAME_FAMILY_OPTIONS } from "@/lib/gameFamily";
import { localizeLandingHref } from "../../../shared/landingRoutes.mjs";
import { playScreenFadeOut } from "@/hooks/useScreenReveal";
import {
  playCardToCardExit,
  getRouteCardKind,
  getRenderedCardKind,
  markLandingReturnTransition,
  markCardRouteTransition,
  playHomeToFooterExit,
  requestLandingExit,
  requestWideCardNavigation,
  useFooterChromeReturn,
} from "@/hooks/useFooterPageTransition";
import BrandLogoMark from "./BrandLogoMark";
import LandingHeroLockToggle from "./LandingHeroLockToggle";
import LanguageToggle from "./LanguageToggle";
import MusicToggle from "./MusicToggle";
import SoundToggle from "./SoundToggle";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "@/hooks/useLanguage";
import { useSiteOperations } from "@/hooks/useSiteOperations";
import { useViewportSectionTheme } from "@/hooks/useViewportSectionTheme";

const HISTORY_LEAVE_EVENT = "huestima-history-leave";
const HISTORY_LEAVE_COMPLETE_EVENT = "huestima-history-leave-complete";
const FAMILY_GLOW_COLORS = {
  color: "#b39aff",
  flag: "#ff9eae",
  cartoon: "#81e2b8",
  brand: "#ffd36e",
  team: "#83c6ff",
  perception: "#e49aff",
};

export default function AppHeader() {
  const { locale, t } = useTranslation();
  const { unreadAnnouncementCount } = useSiteOperations();
  const [adminSessionOpen, setAdminSessionOpen] = useState(false);
  const pathname = usePathname()?.replace(/^\/tr(?=\/)/, "");
  const [historyFamily, setHistoryFamily] = useState("color");
  useEffect(() => {
    const family = new URLSearchParams(window.location.search).get("from");
    if (["color", "flag", "cartoon", "brand", "team", "perception"].includes(family)) {
      setHistoryFamily(family);
    }
  }, []);
  const familyHomeHref =
    (pathname?.startsWith("/history") || pathname === "/profile")
      ? `/${historyFamily}`
      : GAME_FAMILY_OPTIONS.find(
          (option) => pathname === option.href || pathname?.startsWith(`${option.href}/`),
          )?.href || "/color";
  const notificationReturnHref = pathname?.startsWith("/color/") || pathname === "/color"
    ? pathname
    : pathname?.startsWith("/flag/") || pathname === "/flag"
      ? pathname
      : pathname?.startsWith("/cartoon/") || pathname === "/cartoon"
        ? pathname
        : pathname?.startsWith("/brand/") || pathname === "/brand"
          ? pathname
          : pathname?.startsWith("/team/") || pathname === "/team"
            ? pathname
            : familyHomeHref;
  const historyReturnFamily =
    GAME_FAMILY_OPTIONS.find(
      (option) => pathname === option.href || pathname?.startsWith(`${option.href}/`),
    )?.id || historyFamily;
  const profileHref = `/profile?from=${encodeURIComponent(historyReturnFamily)}`;
  const historyHref = `/history?from=${encodeURIComponent(historyReturnFamily)}`;
  const router = useRouter();
  const isPrivacyRoute = pathname === "/privacy-policy";
  const isHowItWorksRoute = pathname === "/how-it-works";
  const isExploreRoute = pathname === "/explore" || pathname?.startsWith("/explore/");
  const isCreditsRoute = pathname === "/credits";
  const isNotificationsRoute = pathname === "/notifications";
  const isHistoryRoute = pathname === "/history" || pathname?.startsWith("/history/");
  const headerIconClass = "rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30";
  const iconControlsRef = useRef(null);
  const headerRef = useRef(null);
  const iconHighlightRef = useRef(null);
  const iconLinkRefs = useRef(new Map());
  const headerTooltipRef = useRef(null);
  const headerTooltipTextRef = useRef(null);
  const headerTooltipTargetRef = useRef(null);
  const headerTooltipPointerRef = useRef({ x: 0, y: 0 });
  const [highlightedIcon, setHighlightedIcon] = useState(null);
  const [headerTooltip, setHeaderTooltip] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavRendered, setIsNavRendered] = useState(false);
  const [hoveredFamily, setHoveredFamily] = useState(null);
  const [familyUnderline, setFamilyUnderline] = useState(null);
  const [familyGlowColor, setFamilyGlowColor] = useState(FAMILY_GLOW_COLORS.color);
  const familyGlowRef = useRef(null);
  const landingHeaderTheme = useViewportSectionTheme({
    attribute: "data-header-theme",
    defaultTheme: "dark",
    enabled: pathname === "/",
    routeKey: pathname,
    sampleY: 56,
    scrollSelector: ".landing-page",
  });
  const hasFamilyHighlight = Boolean(
    hoveredFamily ||
    GAME_FAMILY_OPTIONS.some(
      (option) => pathname === option.href || pathname?.startsWith(`${option.href}/`),
    ),
  );

  useFooterChromeReturn(pathname, ".app-header");
  const isNavigatingRef = useRef(false);
  const navigationResetRef = useRef(null);
  const menuButtonRef = useRef(null);
  const mobileOverlayRef = useRef(null);
  const mobileBubbleRef = useRef(null);
  const mobileContentRef = useRef(null);

  useLayoutEffect(() => {
    const controls = iconControlsRef.current;
    const highlight = iconHighlightRef.current;
    if (!controls || !highlight) return undefined;

    const links = [...iconLinkRefs.current.values()];
    const activeLink = links.find((link) => link.dataset.active === "true");
    let hoveredLink = null;
    let animation;

    const moveHighlight = (link) => {
      if (!link) {
        animation?.kill();
        gsap.to(highlight, { autoAlpha: 0, duration: 0.2, ease: "power2.out" });
        setHighlightedIcon(null);
        return;
      }

      const controlsRect = controls.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      animation?.kill();
      animation = gsap.timeline({ defaults: { overwrite: "auto" } });
      animation.to(highlight, {
        x: linkRect.left - controlsRect.left,
        y: linkRect.top - controlsRect.top,
        width: linkRect.width,
        height: linkRect.height,
        autoAlpha: 1,
        duration: 0.48,
        ease: "power3.out",
      });
      setHighlightedIcon(link.dataset.headerIconLink);
    };

    const onEnter = (event) => {
      const link = event.target.closest("[data-header-icon-link]");
      if (!link || !controls.contains(link)) return;
      hoveredLink = link;
      moveHighlight(link);
    };
    const onLeave = (event) => {
      if (event.relatedTarget && controls.contains(event.relatedTarget)) return;
      hoveredLink = null;
      moveHighlight(activeLink);
    };
    const onResize = () => moveHighlight(hoveredLink || activeLink);

    controls.addEventListener("pointerover", onEnter);
    controls.addEventListener("pointerout", onLeave);
    window.addEventListener("resize", onResize);
    moveHighlight(activeLink);

    return () => {
      controls.removeEventListener("pointerover", onEnter);
      controls.removeEventListener("pointerout", onLeave);
      window.removeEventListener("resize", onResize);
      animation?.kill();
    };
  }, [pathname, historyHref, profileHref]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;

    const positionTooltip = () => {
      const tooltip = headerTooltipRef.current;
      if (!tooltip) return;
      const { x, y } = headerTooltipPointerRef.current;
      gsap.to(tooltip, {
        x,
        y: y + 28,
        xPercent: -50,
        duration: 0.24,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const popTooltip = () => {
      gsap.set(headerTooltipRef.current, { autoAlpha: 1 });
      gsap.killTweensOf(headerTooltipTextRef.current);
      gsap.fromTo(
        headerTooltipTextRef.current,
        { scale: 0, transformOrigin: "50% 50%" },
        { scale: 1, duration: 0.34, ease: "back.out(2.2)", overwrite: "auto" },
      );
    };

    const onPointerOver = (event) => {
      if (event.pointerType === "touch") return;
      const target = event.target.closest?.("[data-header-tooltip]");
      if (!target || !header.contains(target) || target === headerTooltipTargetRef.current) return;

      gsap.killTweensOf(headerTooltipRef.current);
      headerTooltipTargetRef.current = target;
      headerTooltipPointerRef.current = { x: event.clientX, y: event.clientY };
      setHeaderTooltip(target.dataset.headerTooltip || "");
      positionTooltip();
      popTooltip();
    };

    const onPointerMove = (event) => {
      if (event.pointerType === "touch") return;
      const target = event.target.closest?.("[data-header-tooltip]");
      if (!target || !header.contains(target)) {
        if (!headerTooltipTargetRef.current) return;
        headerTooltipTargetRef.current = null;
        setHeaderTooltip("");
        gsap.to(headerTooltipRef.current, { autoAlpha: 0, duration: 0.12, ease: "power2.out", overwrite: "auto" });
        return;
      }

      if (target !== headerTooltipTargetRef.current) {
        gsap.killTweensOf(headerTooltipRef.current);
        headerTooltipTargetRef.current = target;
        setHeaderTooltip(target.dataset.headerTooltip || "");
        popTooltip();
      }
      headerTooltipPointerRef.current = { x: event.clientX, y: event.clientY };
      positionTooltip();
    };

    const onPointerOut = (event) => {
      const target = event.target.closest?.("[data-header-tooltip]");
      if (!target || target !== headerTooltipTargetRef.current) return;
      const nextTarget = event.relatedTarget?.closest?.("[data-header-tooltip]");
      if (nextTarget === target) return;

      if (nextTarget && header.contains(nextTarget)) {
        gsap.killTweensOf(headerTooltipRef.current);
        headerTooltipTargetRef.current = nextTarget;
        headerTooltipPointerRef.current = { x: event.clientX, y: event.clientY };
        setHeaderTooltip(nextTarget.dataset.headerTooltip || "");
        positionTooltip();
        popTooltip();
        return;
      }

      headerTooltipTargetRef.current = null;
      setHeaderTooltip("");
      gsap.to(headerTooltipRef.current, { autoAlpha: 0, duration: 0.14, ease: "power2.out", overwrite: "auto" });
    };

    header.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerout", onPointerOut, true);

    return () => {
      header.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      gsap.killTweensOf(headerTooltipRef.current);
    };
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    const group = header?.querySelector("[data-magnetic-group]");
    if (!group || window.matchMedia("(hover: none), (prefers-reduced-motion: reduce)").matches) return undefined;

    const items = [...group.children];
    const radius = 360;
    const onPointerMove = (event) => {
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - distance / radius);
        const pull = influence * influence * 5;
        gsap.to(item, {
          x: distance ? (dx / distance) * pull : 0,
          y: distance ? (dy / distance) * pull : 0,
          rotateY: Math.max(-1.8, Math.min(1.8, dx / 44)) * influence,
          rotateX: -Math.max(-1.8, Math.min(1.8, dy / 44)) * influence,
          transformPerspective: 700,
          duration: 0.42,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    };
    const reset = () => items.forEach((item) => gsap.to(item, {
      x: 0, y: 0, rotateX: 0, rotateY: 0, duration: 0.55, ease: "elastic.out(1, 0.7)", overwrite: "auto",
    }));

    document.addEventListener("pointermove", onPointerMove);
    window.addEventListener("blur", reset);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, []);

  const mobileMenuTimelineRef = useRef(null);
  const familyNavRef = useRef(null);
  const familyLinkRefs = useRef(new Map());
  const closeMenuRef = useRef(() => Promise.resolve());

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
      // This synchronizes the mobile menu with a desktop media-query transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
          clipPath: "none",
        }
      )
      .to(
        controlTargets,
        {
          y: 0,
          clipPath: "none",
          duration: 0.58,
          stagger: { each: 0.07, from: "end" },
          ease: "power3.out",
          clearProps: "transform,willChange",
        },
        "-=0.42",
      );

    closeMenuRef.current = () =>
      new Promise((resolve) => {
        const closeTl = gsap.timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            setIsNavOpen(false);
            setIsNavRendered(false);
            // State updates are committed after this GSAP callback. Wait until
            // the closed menu has actually left the screen before navigation.
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(resolve);
            });
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
      });

    return () => {
      mobileMenuTimelineRef.current?.kill();
    };
  }, [isNavRendered]);

  const playRouteTransition = async (href) => {
    if (/^\/(profile|history)\?/.test(href)) {
      const from = new URL(href, window.location.origin).searchParams.get("from");
      if (GAME_FAMILY_OPTIONS.some((option) => option.id === from)) setHistoryFamily(from);
    }
    await requestActiveGameExit();
    clearAllGameSessions();
    if (await requestWideCardNavigation(href)) return;
    markCardRouteTransition(href);
    const targetCardKind = getRouteCardKind(href);
    const targetPath = href.split("?")[0];
    if (pathname === "/" && targetPath !== "/") {
      const handled = await requestLandingExit(href);
      if (handled) {
        router.push(href);
        return;
      }
    }
    if (targetPath === "/" && pathname !== "/") {
      const card = document.querySelector("[data-intro-card-target]");
      const content = document.querySelector("[data-route-transition-scope]");

      if (card && content) {
        const sourceCardKind = getRenderedCardKind(card, pathname);
        markCardRouteTransition(href, sourceCardKind);
        markLandingReturnTransition(card);
        await playHomeToFooterExit(card, content, {
          scaleCard: false,
          expandCard: false,
          hideChrome: false,
        });
        router.push(href);
        return;
      }
    }
    const isSetupHomeRoute = /^\/(color|flag|cartoon|brand|team|perception)$/.test(pathname || "");
    if (isSetupHomeRoute) {
      const card = document.querySelector("[data-intro-card-target]");
      const content = document.querySelector("[data-route-transition-scope]");

      if (card && content) {
        const sourceCardKind = getRenderedCardKind(card, pathname);
        markCardRouteTransition(href, sourceCardKind);
        await playCardToCardExit(card, content, {
          targetExpanded: false,
          hideChrome: false,
          resizeCard:
            sourceCardKind === "large" &&
            (targetCardKind === "default" || targetCardKind === "expanded"),
        });
        router.push(href);
        return;
      }
    }

    if (pathname?.startsWith("/notifications")) {
      const card = document.querySelector("[data-notification-card]");
      const content = document.querySelector("[data-route-transition-scope]");

      if (card && content) {
        await playCardToCardExit(card, content, {
          targetExpanded: false,
          hideChrome: false,
          resizeCard: targetCardKind === "default" || targetCardKind === "expanded",
        });
        router.push(href);
        return;
      }
    }

    if (pathname?.startsWith("/history")) {
      const card = document.querySelector("[data-history-card]");
      const content = document.querySelector("[data-route-transition-scope]");

      if (card && content) {
        await playCardToCardExit(card, content, {
          targetExpanded: false,
          hideChrome: false,
          resizeCard: targetCardKind === "default" || targetCardKind === "expanded",
        });
        router.push(href);
        return;
      }

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

    if (href === "/admin") {
      const card = document.querySelector("[data-intro-card-target]");
      const content = document.querySelector("[data-route-transition-scope]");

      if (card && content) {
        const sourceCardKind = getRenderedCardKind(card, pathname);
        markCardRouteTransition(href, sourceCardKind);
        await playCardToCardExit(card, content, {
          targetExpanded: false,
          hideChrome: true,
          chromeFirst: true,
          resizeCard: sourceCardKind === "large",
        });
        router.push(href);
        return;
      }
    }

    const routeCard = document.querySelector("[data-intro-card-target]");
    const routeContent = document.querySelector("[data-route-transition-scope]");
    if (routeCard && routeContent) {
      const sourceCardKind = getRenderedCardKind(routeCard, pathname);
      markCardRouteTransition(href, sourceCardKind);
      await playCardToCardExit(routeCard, routeContent, {
        targetExpanded: false,
        hideChrome: false,
        resizeCard:
          sourceCardKind === "large" &&
          (targetCardKind === "default" || targetCardKind === "expanded"),
      });
      router.push(href);
      return;
    }

    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    await playScreenFadeOut(scope, { duration: 0.24 });

    router.push(href);
  };

  const handleFamilyNavigation = (event, href, active) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (active) {
      event.preventDefault();
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

    void (async () => {
      // Mobile sequence: close animation, remove menu, then page transition.
      // Desktop navigation remains immediate.
      if (isNavRendered) {
        await closeMenuRef.current();
      }

      await playRouteTransition(href);
    })().catch(() => {
      isNavigatingRef.current = false;
    });
  };

  if (pathname === "/maintenance") {
    return (
      <header key="maintenance-header" className="app-header pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-end p-6 sm:p-8">
        <div data-sound-kind="switch" className="pointer-events-auto">
          <LanguageToggle />
        </div>
      </header>
    );
  }

  if (
    pathname === "/admin/login" ||
    isPrivacyRoute ||
    isHowItWorksRoute ||
    isExploreRoute ||
    isCreditsRoute
  ) {
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

  if (pathname === "/admin" || pathname === "/admin/login") return null;

  return (
    <header
      ref={headerRef}
      key="application-header"
      className="app-header pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between p-6 sm:p-8"
      data-nav-open={isNavOpen ? "true" : undefined}
      data-landing-chrome={pathname === "/" ? "true" : undefined}
      data-landing-theme={
        pathname === "/" ? (isNavRendered ? "light" : landingHeaderTheme) : undefined
      }
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
              data-sound-kind="navigation"
              className="flex w-full flex-col items-start gap-3 text-[clamp(2.85rem,13vw,4.9rem)] font-semibold leading-[0.96] tracking-normal"
            >
              {GAME_FAMILY_OPTIONS.map((option) => {
                const active =
                  pathname === option.href || pathname?.startsWith(`${option.href}/`);

                return (
                  <div
                    key={option.id}
                    className="-mb-[0.12em] overflow-hidden pb-[0.12em]"
                  >
                    <Link
                      href={localizeLandingHref(option.href, locale)}
                      aria-current={active ? "page" : undefined}
                      data-mobile-menu-nav-item
                      onClick={(event) =>
                        handleFamilyNavigation(
                          event,
                          localizeLandingHref(option.href, locale),
                          pathname === option.href,
                        )
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

            <div className="mt-auto flex w-full flex-wrap items-center gap-x-1 gap-y-3 pb-1">
              <div ref={iconControlsRef} data-sound-kind="navigation" className="relative flex items-center gap-1">
                <span ref={iconHighlightRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-0 rounded-full bg-zinc-950 opacity-0 dark:bg-white" />
                <div data-mobile-menu-control className="overflow-hidden">
                  <Link ref={(node) => node ? iconLinkRefs.current.set("profile", node) : iconLinkRefs.current.delete("profile")} data-header-icon-link="profile" data-header-tooltip={t("profile.title")} data-active={pathname === "/profile"} href={profileHref} aria-label={t("profile.open")} aria-current={pathname === "/profile" ? "page" : undefined} onClick={(event) => handleFamilyNavigation(event, profileHref, pathname === "/profile")} className={`relative z-10 inline-grid size-11 place-items-center ${headerIconClass} ${highlightedIcon === "profile" ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-zinc-50"}`}>
                    <UserRound className="size-6.5" strokeWidth={1.9} />
                  </Link>
                </div>
              <div data-mobile-menu-control className="overflow-hidden">
                <div>
                  <Link
                    href={`/notifications?from=${encodeURIComponent(notificationReturnHref)}`}
                    data-header-tooltip={t("notifications.title")}
                    aria-label={t("notifications.open")}
                    onClick={(event) =>
                      handleFamilyNavigation(event, "/notifications", pathname === "/notifications")
                    }
                    ref={(node) => node ? iconLinkRefs.current.set("notifications", node) : iconLinkRefs.current.delete("notifications")}
                    data-header-icon-link="notifications" data-active={isNotificationsRoute}
                    className={`relative z-10 inline-grid size-11 place-items-center ${headerIconClass} ${highlightedIcon === "notifications" ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-zinc-50"}`}
                  >
                    <Bell className="size-6.5" strokeWidth={1.9} />
                    {unreadAnnouncementCount > 0 && (
                      <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-zinc-950 px-1 text-[0.6rem] font-semibold leading-4 text-white dark:bg-white dark:text-zinc-950">
                        {unreadAnnouncementCount > 9 ? "9+" : unreadAnnouncementCount}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
              <div data-mobile-menu-control className="overflow-hidden">
                <div>
                  <Link
                    href={historyHref}
                    data-header-tooltip={t("history.eyebrow")}
                    aria-label={t("history.open")}
                    onClick={(event) =>
                      handleFamilyNavigation(event, historyHref, isHistoryRoute)
                    }
                    ref={(node) => node ? iconLinkRefs.current.set("history", node) : iconLinkRefs.current.delete("history")}
                    data-header-icon-link="history" data-active={isHistoryRoute}
                    className={`relative z-10 inline-grid size-11 place-items-center ${headerIconClass} ${highlightedIcon === "history" ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-zinc-50"}`}
                  >
                    <History className="size-6.5" strokeWidth={1.9} />
                  </Link>
                </div>
              </div>
              </div>
              <span
                aria-hidden="true"
                data-mobile-menu-control
                className="mx-1 hidden h-6 w-[2px] shrink-0 min-[400px]:block bg-zinc-950/32 dark:bg-white/34"
              />
              <div data-sound-kind="switch" className="flex items-center">
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
        </div>
      )}

      <div className="pointer-events-auto relative z-10 flex h-11 items-center gap-6">
        <Link
          href="/color"
          aria-label={t("app.homeAria")}
          data-sound="off"
          onClick={(event) => handleFamilyNavigation(event, "/?entry=logo", pathname === "/")}
          className="app-header__brand inline-flex h-11 items-center gap-3 rounded-full text-base font-semibold uppercase leading-none tracking-normal text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50 sm:text-[17px]"
        >
          <BrandLogoMark interactive />
          <span className="app-header__brand-label">{APP_NAME}</span>
        </Link>

        <nav
          ref={familyNavRef}
          aria-label={t("gameFamily.label")}
          data-sound-kind="navigation"
          onMouseLeave={() => {
            setHoveredFamily(null);
            gsap.to(familyGlowRef.current, { autoAlpha: 0, duration: 0.2, ease: "power2.out", overwrite: "auto" });
          }}
          className="app-header__family-nav relative hidden h-11 items-center gap-5 text-[13px] font-semibold uppercase leading-none tracking-normal text-zinc-950/42 dark:text-white/42 md:inline-flex"
        >
          <span
            ref={familyGlowRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-0 size-20 rounded-full opacity-0 blur-lg"
            style={{ background: `radial-gradient(circle, ${familyGlowColor} 0%, ${familyGlowColor} 38%, transparent 74%)` }}
          />
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
                href={localizeLandingHref(option.href, locale)}
                data-family-glow={option.id}
                aria-current={active ? "page" : undefined}
                onMouseEnter={(event) => {
                  setHoveredFamily(option.href);
                  setFamilyGlowColor(FAMILY_GLOW_COLORS[option.id]);
                  const navRect = familyNavRef.current.getBoundingClientRect();
                  const linkRect = event.currentTarget.getBoundingClientRect();
                  gsap.to(familyGlowRef.current, {
                    x: linkRect.left - navRect.left + linkRect.width / 2,
                    y: linkRect.top - navRect.top + linkRect.height / 2,
                    xPercent: -50,
                    yPercent: -50,
                    autoAlpha: 1,
                    duration: 0.72,
                    ease: "elastic.out(1, 0.68)",
                    overwrite: "auto",
                  });
                }}
                onClick={(event) =>
                  handleFamilyNavigation(
                    event,
                    localizeLandingHref(option.href, locale),
                    pathname === option.href,
                  )
                }
                className={`relative z-10 top-px inline-flex h-11 items-center rounded-full leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                  highlighted
                    ? "text-zinc-950 dark:text-white"
                    : "text-zinc-950/42 dark:text-white/42"
                }`}
              >
                {t(`gameFamily.${option.id}`)}
              </Link>
            );
          })}
          {familyUnderline && hasFamilyHighlight && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-zinc-950 dark:bg-white"
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
        {adminSessionOpen && (
          <Link
            href="/admin"
            data-sound-kind="navigation"
            onClick={(event) =>
              handleFamilyNavigation(event, "/admin", pathname === "/admin")
            }
            className="group mr-2 inline-flex h-10 items-center gap-2.5 rounded-full border border-white/[0.14] bg-[#111113] px-4 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_22px_rgba(0,0,0,0.16)] transition-[background-color,box-shadow,border-color] duration-300 hover:border-white/25 hover:bg-[#171719] hover:shadow-[0_10px_26px_rgba(0,0,0,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/30 dark:focus-visible:ring-white/40"
            aria-label={locale === "tr" ? "Admin modu açık" : "Admin mode enabled"}
          >
            <Crown className="size-3.5 text-white/90" strokeWidth={2.15} />
            {locale === "tr" ? "Admin oturumu açık" : "Admin session open"}
          </Link>
        )}
        <div className="hidden items-center gap-1 md:inline-flex">
          <div ref={iconControlsRef} data-sound-kind="navigation" className="relative inline-flex items-center gap-1">
          <span ref={iconHighlightRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-0 rounded-full bg-zinc-950 opacity-0 dark:bg-white" />
          <Link ref={(node) => node ? iconLinkRefs.current.set("profile", node) : iconLinkRefs.current.delete("profile")} data-header-icon-link="profile" data-header-tooltip={t("profile.title")} data-active={pathname === "/profile"} href={profileHref} aria-label={t("profile.open")} aria-current={pathname === "/profile" ? "page" : undefined} onClick={(event) => handleFamilyNavigation(event, profileHref, pathname === "/profile")} className={`relative z-10 grid size-11 place-items-center ${headerIconClass} ${highlightedIcon === "profile" ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-zinc-50"}`}>
            <UserRound className="size-6.5" strokeWidth={1.9} />
          </Link>
          <Link
            href={`/notifications?from=${encodeURIComponent(notificationReturnHref)}`}
            data-header-tooltip={t("notifications.title")}
            aria-label={t("notifications.open")}
            onClick={(event) =>
              handleFamilyNavigation(event, "/notifications", pathname === "/notifications")
            }
            ref={(node) => node ? iconLinkRefs.current.set("notifications", node) : iconLinkRefs.current.delete("notifications")}
            data-header-icon-link="notifications" data-active={isNotificationsRoute}
            className={`relative z-10 grid size-11 place-items-center ${headerIconClass} ${highlightedIcon === "notifications" ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-zinc-50"}`}
          >
            <Bell className="size-6.5" strokeWidth={1.9} />
            {unreadAnnouncementCount > 0 && (
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-zinc-950 px-1 text-[0.6rem] font-semibold leading-4 text-white dark:bg-white dark:text-zinc-950">
                {unreadAnnouncementCount > 9 ? "9+" : unreadAnnouncementCount}
              </span>
            )}
          </Link>
          <Link
            href={historyHref}
            data-header-tooltip={t("history.eyebrow")}
            aria-label={t("history.open")}
            onClick={(event) =>
              handleFamilyNavigation(event, historyHref, isHistoryRoute)
            }
            ref={(node) => node ? iconLinkRefs.current.set("history", node) : iconLinkRefs.current.delete("history")}
            data-header-icon-link="history" data-active={isHistoryRoute}
            className={`relative z-10 grid size-11 place-items-center ${headerIconClass} ${highlightedIcon === "history" ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-zinc-50"}`}
          >
            <History className="size-6.5" strokeWidth={1.9} />
          </Link>
          </div>
          <span
            aria-hidden="true"
            className="mx-2 h-6 w-[2px] bg-zinc-950/32 dark:bg-white/34"
          />
          <div data-sound-kind="switch" data-magnetic-group className="inline-flex items-center gap-1">
          <LanguageToggle />
          <SoundToggle />
          <MusicToggle />
          <ThemeToggle />
          {pathname === "/" && <LandingHeroLockToggle />}
          </div>
        </div>

        <div className="md:hidden">
          <div data-sound-kind="switch" className="inline-flex items-center gap-1">
            {pathname === "/" && <LandingHeroLockToggle />}
          </div>
        </div>

        <button
          ref={menuButtonRef}
          data-sound-kind="switch"
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
      <div
        ref={headerTooltipRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] opacity-0"
      >
        <span ref={headerTooltipTextRef} className="block whitespace-nowrap rounded-lg border border-white/10 bg-zinc-950/90 px-2.5 py-1 text-xs font-medium tracking-wide text-white shadow-lg backdrop-blur-md dark:border-black/10 dark:bg-white/90 dark:text-zinc-950">
          {headerTooltip}
        </span>
      </div>
    </header>
  );
}
