"use client";

import Link from "next/link";
import HomeCardArtwork from "../home/HomeCardArtwork";
import LandingGameGuide from "./LandingGameGuide";
import LandingHeroFluid from "./LandingHeroFluid";
import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, UsersRound } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import {
  playScreenFadeOut,
  useScrollCardPopReveal,
  useScreenReveal,
  useScrollScreenReveal,
} from "@/hooks/useScreenReveal";
import {
  APP_CHROME_SELECTOR,
  consumeLandingReturnTransition,
  LANDING_EXIT_REQUEST_EVENT,
  markCardRouteTransition,
  readDefaultCardBox,
  requestLandingExit,
  shouldFadeAppChrome,
} from "@/hooks/useFooterPageTransition";

const LANDING_CARDS = [
  {
    id: "color",
    href: "/color",
    className: "landing-card--color",
    title: "Color",
    description: "Memorize a color, then rebuild its shade from memory.",
  },
  {
    id: "flag",
    href: "/flag",
    className: "landing-card--flag",
    title: "Flag",
    description: "Study a flag and bring its main color back from memory.",
  },
  {
    id: "cartoon",
    href: "/cartoon",
    className: "landing-card--cartoon",
    title: "Cartoon",
    description: "Remember a character's signature colors and rebuild the palette.",
  },
  {
    id: "brand",
    href: "/brand",
    className: "landing-card--brand",
    title: "Brand",
    description: "Recognize the logo, then rebuild its signature color.",
  },
  {
    id: "team",
    href: "/team",
    className: "landing-card--team",
    title: "Teams",
    description: "Choose familiar clubs and recreate their team colors.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const transitionCoverRef = useRef(null);
  const exitInProgressRef = useRef(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("entry") !== "logo") return;

    url.searchParams.delete("entry");
    const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, []);
  const [landingEntryTransition] = useState(consumeLandingReturnTransition);
  const [isLandingEntryTransition, setIsLandingEntryTransition] = useState(
    Boolean(landingEntryTransition),
  );

  useScreenReveal(pageRef, [locale, isLandingEntryTransition], {
    defer: isLandingEntryTransition,
    deferContentVisibility: isLandingEntryTransition,
    preserveScopeVisibility: true,
  });
  useScrollScreenReveal(pageRef, [locale]);
  useScrollCardPopReveal(pageRef, [locale]);

  useLayoutEffect(() => {
    if (!landingEntryTransition) return undefined;

    const hero = heroRef.current;
    const cover = transitionCoverRef.current;
    if (!hero || !cover) return undefined;

    const fluid = hero.querySelector(".landing-hero-fluid");
    const chrome = landingEntryTransition.fadeChrome
      ? Array.from(document.querySelectorAll(APP_CHROME_SELECTOR))
      : [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;

    gsap.killTweensOf([hero, cover, fluid, ...chrome]);
    gsap.set(hero, { visibility: "hidden" });
    if (fluid) gsap.set(fluid, { opacity: 0 });
    if (chrome.length) {
      gsap.set(chrome, { autoAlpha: 0, transition: "none" });
    }
    const fallbackCardShadow = window.getComputedStyle(document.documentElement)
      .getPropertyValue("--app-card-shadow")
      .trim();
    const cardShadow =
      landingEntryTransition.boxShadow &&
      landingEntryTransition.boxShadow !== "none"
        ? landingEntryTransition.boxShadow
        : fallbackCardShadow;
    gsap.set(cover, {
      autoAlpha: 1,
      left: landingEntryTransition.left,
      top: landingEntryTransition.top,
      width: landingEntryTransition.width,
      height: landingEntryTransition.height,
      borderRadius: landingEntryTransition.borderRadius,
      boxShadow: cardShadow,
    });

    const finishEntry = () => {
      delete document.documentElement.dataset.landingReturnTransition;
      gsap.set(hero, { clearProps: "visibility" });
      gsap.set(cover, { autoAlpha: 0 });
      setIsLandingEntryTransition(false);
    };

    if (reduced) {
      finishEntry();
      gsap.set(chrome, { clearProps: "opacity,visibility,transition" });
      if (fluid) gsap.set(fluid, { clearProps: "opacity" });
      return undefined;
    }

    const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });
    timeline
      .to(cover, {
        left: 0,
        top: 0,
        width: viewportWidth,
        height: viewportHeight,
        borderRadius: 0,
        boxShadow: cardShadow,
        duration: 0.72,
        ease: "expo.inOut",
      })
      .call(finishEntry);
    if (chrome.length) {
      timeline.to(chrome, {
          autoAlpha: 1,
          duration: 0.24,
          ease: "power2.in",
          clearProps: "opacity,visibility,transition",
        });
    }
    timeline.to(fluid, {
        opacity: 1,
        duration: 0.34,
        ease: "power2.out",
        clearProps: "opacity",
      }, chrome.length ? "<" : undefined);

    return () => {
      timeline.kill();
      delete document.documentElement.dataset.landingReturnTransition;
      gsap.set(hero, { clearProps: "visibility" });
      gsap.set(cover, { clearProps: "left,top,width,height,borderRadius,boxShadow,opacity,visibility" });
      gsap.set(chrome, { clearProps: "opacity,visibility,transition" });
      if (fluid) gsap.set(fluid, { clearProps: "opacity" });
    };
  }, [landingEntryTransition]);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const hero = heroRef.current;
    const cover = transitionCoverRef.current;
    if (!page || !hero || !cover) return undefined;

    let activeTimeline = null;
    let completed = false;

    const tween = (target, vars) => new Promise((resolve) => {
      activeTimeline = gsap.to(target, {
        ...vars,
        overwrite: "auto",
        onComplete: resolve,
        onInterrupt: resolve,
      });
    });

    const handleLandingExit = async (event) => {
      event.preventDefault();
      if (exitInProgressRef.current) {
        event.detail.resolve(true);
        return;
      }

      exitInProgressRef.current = true;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scrollDistance = page.scrollTop;
      const heroContent = [
        hero.querySelector(".landing-page__intro"),
        hero.querySelector(".landing-hero-fluid"),
      ].filter(Boolean);
      const fadeChrome = shouldFadeAppChrome(event.detail.href);
      const chrome = fadeChrome
        ? Array.from(document.querySelectorAll(APP_CHROME_SELECTOR))
        : [];

      gsap.set(page, { pointerEvents: "none" });

      if (scrollDistance > 1) {
        const previousScrollBehavior = page.style.scrollBehavior;
        const scrollDuration = Math.min(
          2.4,
          Math.max(0.9, 0.55 + scrollDistance / 1050),
        );

        // CSS smooth scrolling adds another interpolation layer and makes the
        // transition feel as though it starts late. GSAP owns this movement.
        page.style.scrollBehavior = "auto";
        await tween(page, {
          scrollTop: 0,
          duration: reduced ? 0 : scrollDuration,
          ease: "power2.out",
        });
        page.style.scrollBehavior = previousScrollBehavior;
      }

      await tween([...heroContent, ...chrome], {
        autoAlpha: 0,
        duration: reduced ? 0 : 0.24,
        ease: "power2.out",
      });

      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const target = readDefaultCardBox();
      const cardShadow = window.getComputedStyle(document.documentElement)
        .getPropertyValue("--app-card-shadow")
        .trim();

      gsap.set(cover, {
        autoAlpha: 1,
        left: 0,
        top: 0,
        width: viewportWidth,
        height: viewportHeight,
        borderRadius: 0,
        boxShadow: cardShadow,
      });
      gsap.set(hero, { visibility: "hidden" });

      await tween(cover, {
        ...target,
        boxShadow: cardShadow,
        duration: reduced ? 0 : 0.72,
        ease: "expo.inOut",
      });

      markCardRouteTransition(event.detail.href, "default");
      completed = true;
      event.detail.resolve(true);
    };

    window.addEventListener(LANDING_EXIT_REQUEST_EVENT, handleLandingExit);
    return () => {
      window.removeEventListener(LANDING_EXIT_REQUEST_EVENT, handleLandingExit);
      activeTimeline?.kill();
      if (!completed) {
        exitInProgressRef.current = false;
        gsap.set(page, { clearProps: "pointerEvents" });
        gsap.set(hero, { clearProps: "visibility" });
        gsap.set(cover, {
          clearProps: "left,top,width,height,borderRadius,boxShadow,opacity,visibility",
        });
        gsap.set(APP_CHROME_SELECTOR, {
          clearProps: "opacity,visibility,transition",
        });
      }
    };
  }, []);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const cards = Array.from(page.querySelectorAll(".landing-card"));
    const resize = () => cards.forEach((card) => {
      card.style.setProperty("--preview-scale", String(card.clientWidth / 500));
    });
    const observer = new ResizeObserver(resize);
    cards.forEach((card) => observer.observe(card));
    resize();
    return () => {
      observer.disconnect();
    };
  }, []);

  const handleNavigation = async (event, href) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (isLeaving) return;
    setIsLeaving(true);
    const handled = await requestLandingExit(href);
    if (!handled) {
      await playScreenFadeOut(pageRef, { duration: 0.34, ease: "power2.inOut" });
    }
    router.push(href);
  };

  return (
    <main
      ref={pageRef}
      className="landing-page"
      lang={locale}
      data-header-theme="light"
      data-footer-theme="light"
    >
      <div
        ref={transitionCoverRef}
        className="pointer-events-none fixed z-[35] invisible bg-black opacity-0"
        aria-hidden="true"
      />
      <div className="landing-page__inner">
        <section
          ref={heroRef}
          className="landing-page__hero"
          aria-labelledby="landing-title"
          data-intro-card-target
          data-header-theme="dark"
          data-footer-theme="dark"
        >
        <LandingHeroFluid />
        <div className="landing-page__intro" data-screen-reveal>
          <h1 id="landing-title">
            <span className="block whitespace-nowrap">how well do you</span>
            <span className="block whitespace-nowrap">remember color?</span>
          </h1>
          <p className="landing-page__subtitle">
            Chase a color after it disappears, pull the defining shade from a
            flag, rebuild a cartoon character&apos;s palette, recognize a brand by
            its signature hue, or prove how well you know your team&apos;s colors.
            Each game turns something familiar into a different test of visual
            memory.
          </p>
        </div>
        </section>

        <LandingGameGuide />

        <nav
          className="landing-page__grid"
          aria-label="Choose a game"
          data-header-theme="light"
          data-footer-theme="light"
        >
          {LANDING_CARDS.map(({ id, href, className, title, description }, index) => (
            <Link
              key={id}
              href={href}
              className={`landing-card ${className}`}
              onClick={(event) => handleNavigation(event, href)}
              data-scroll-card-pop
              data-scroll-reveal-delay={String((index % 3) * 0.055)}
            >
              <div className="landing-card__canvas">
                <div className="landing-card__artwork" aria-hidden="true" inert>
                  <HomeCardArtwork cleanGameFamily={id} />
                </div>
              <span className="landing-card__copy">
                <span className="landing-card__title">{title}</span>
                <span className="landing-card__description">{description}</span>
              </span>
              <span className="landing-card__modes">
                <span>solo or multiplayer</span>
                <span className="landing-card__mode-icons">
                  <User aria-hidden="true" size={23} strokeWidth={2} />
                  <UsersRound aria-hidden="true" size={23} strokeWidth={2} />
                </span>
              </span>
              </div>
            </Link>
          ))}
        </nav>

        <section
          className="landing-page__more-games"
          aria-label="Upcoming games"
          data-header-theme="light"
          data-footer-theme="light"
          data-scroll-screen-reveal
        >
          <h2>more games are coming</h2>
          <p>new ways to test your color memory are already in the works.</p>
        </section>
      </div>
    </main>
  );
}
