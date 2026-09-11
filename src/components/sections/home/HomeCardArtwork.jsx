"use client";

import Image from "next/image";
import { GAME_FAMILY_IDS } from "@/lib/gameFamily";

export default function HomeCardArtwork({
  cleanGameFamily, view = "home", stickerRef, cartoonCharacterRef,
  cartoonCharacterConfig = { id: "ben", src: "/game-modes/cartoon/ben-10/ben-home-character-new.png", width: 600, height: 1400, imageClassName: "cartoon-home-character--ben" },
  cartoonBurst = null, handleCartoonCharacterKeyDown,
}) {
  return (
    <>
        {(cleanGameFamily === GAME_FAMILY_IDS.TEAM ||
          cleanGameFamily === GAME_FAMILY_IDS.CARTOON ||
          cleanGameFamily === GAME_FAMILY_IDS.BRAND ||
          cleanGameFamily === GAME_FAMILY_IDS.FLAG ||
          cleanGameFamily === GAME_FAMILY_IDS.COLOR) && (
          <div
            ref={stickerRef}
            aria-hidden="true"
            className={`team-home-sticker pointer-events-none absolute z-0 select-none opacity-0 will-change-[opacity,transform] ${
              cleanGameFamily === GAME_FAMILY_IDS.CARTOON
                ? "-bottom-[140px] right-[-52px] w-[268px] sm:-bottom-[170px] sm:right-[-44px] sm:w-[335px]"
                : cleanGameFamily === GAME_FAMILY_IDS.COLOR
                  ? "inset-0 h-full w-full"
                : cleanGameFamily === GAME_FAMILY_IDS.FLAG
                  ? "inset-0 h-full w-full"
                : cleanGameFamily === GAME_FAMILY_IDS.BRAND
                  ? "bottom-0 right-0 h-[280px] w-[300px] sm:h-[330px] sm:w-[350px]"
                  : "-bottom-8 right-4 w-40 sm:-bottom-12 sm:right-6 sm:w-56"
            }`}
          >
            {cleanGameFamily === GAME_FAMILY_IDS.COLOR ? (
              <svg
                viewBox="0 0 500 500"
                preserveAspectRatio="none"
                className={`home-color-spectrum absolute inset-0 size-full ${
                  view === "home" ? "home-color-spectrum--active" : ""
                }`}
                aria-hidden="true"
              >
                <defs>
                  <path
                    id="home-color-wave-shape"
                    d="M 90 520 C 100 474 112 438 148 428 C 186 418 207 399 232 370 C 260 337 285 307 319 315 C 356 325 379 338 410 312 C 441 286 450 251 476 237 C 494 228 510 238 525 251 L 525 525 L 90 525 Z"
                  >
                  </path>
                  <filter
                    id="home-color-wave-soften"
                    x="-32%"
                    y="-32%"
                    width="164%"
                    height="164%"
                  >
                    <feGaussianBlur stdDeviation="22" />
                  </filter>
                  <filter
                    id="home-color-spectrum-blend"
                    x="-18%"
                    y="-8%"
                    width="136%"
                    height="116%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feGaussianBlur stdDeviation="20 2" />
                  </filter>
                  <mask id="home-color-wave-mask" maskUnits="userSpaceOnUse">
                    <rect y="-30" width="500" height="560" fill="black" />
                    <use
                      href="#home-color-wave-shape"
                      fill="white"
                      filter="url(#home-color-wave-soften)"
                    />
                  </mask>
                  <linearGradient
                    id="home-color-rgb-spectrum"
                    x1="0"
                    y1="0"
                    x2="500"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                    spreadMethod="repeat"
                    colorInterpolation="sRGB"
                  >
                    <stop offset="0" stopColor="#ff5f7a" />
                    <stop offset="0.2" stopColor="#f7d046" />
                    <stop offset="0.4" stopColor="#32d989" />
                    <stop offset="0.6" stopColor="#45a6ff" />
                    <stop offset="0.8" stopColor="#9d6cff" />
                    <stop offset="1" stopColor="#ff5f7a" />
                  </linearGradient>
                </defs>
                <g
                  className="home-color-spectrum__shell"
                  filter="url(#home-color-spectrum-blend)"
                  mask="url(#home-color-wave-mask)"
                >
                  <rect
                    className="home-color-spectrum__track"
                    x="-500"
                    y="-30"
                    width="1500"
                    height="560"
                    fill="url(#home-color-rgb-spectrum)"
                  />
                </g>
              </svg>
            ) : cleanGameFamily === GAME_FAMILY_IDS.FLAG ? (
              <>
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 118% 108% at 102% 104%, rgba(227,10,23,1) 0%, rgba(227,10,23,0.94) 32%, rgba(227,10,23,0.68) 54%, rgba(227,10,23,0.34) 72%, rgba(227,10,23,0.1) 86%, rgba(227,10,23,0) 96%)",
                  }}
                />
                <Image
                  src="/game-modes/flag/decorative/turkey-crescent-star.png"
                  alt=""
                  width={1413}
                  height={1064}
                  sizes="(max-width: 640px) 230px, 290px"
                  className="absolute -bottom-12 -right-9 w-[230px] max-w-none sm:-bottom-16 sm:-right-10 sm:w-[290px]"
                  priority
                />
              </>
            ) : cleanGameFamily === GAME_FAMILY_IDS.BRAND ? (
              <>
                <Image
                  src="/game-modes/brand/brand-logos/google-chrome.png"
                  alt=""
                  width={1024}
                  height={1024}
                  sizes="(max-width: 640px) 72px, 86px"
                  className="absolute bottom-16 right-[120px] w-[72px] -rotate-[17deg] drop-shadow-[0_11px_16px_rgba(0,0,0,0.42)] sm:bottom-[76px] sm:right-[142px] sm:w-[86px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/spotify.png"
                  alt=""
                  width={739}
                  height={709}
                  sizes="(max-width: 640px) 72px, 86px"
                  className="absolute bottom-12 right-[62px] z-20 w-[72px] rotate-[10deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-14 sm:right-[76px] sm:w-[86px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/snapchat.png"
                  alt=""
                  width={1500}
                  height={1500}
                  sizes="(max-width: 640px) 68px, 82px"
                  className="absolute bottom-[105px] right-8 z-20 w-[68px] rotate-[18deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-[120px] sm:right-9 sm:w-[82px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/discord.png"
                  alt=""
                  width={900}
                  height={900}
                  sizes="(max-width: 640px) 92px, 112px"
                  className="absolute -bottom-1 right-[135px] w-[92px] -rotate-[13deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:-bottom-1 sm:right-[158px] sm:w-28"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/netflix.png"
                  alt=""
                  width={4096}
                  height={4096}
                  sizes="(max-width: 640px) 84px, 102px"
                  className="absolute bottom-9 -right-2 z-10 w-[84px] -rotate-[8deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-11 sm:-right-1.5 sm:w-[102px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/instagram.png"
                  alt=""
                  width={4096}
                  height={4096}
                  sizes="(max-width: 640px) 82px, 102px"
                  className="absolute bottom-[166px] -right-1 w-[82px] -rotate-[14deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:bottom-[188px] sm:right-0 sm:w-[102px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/facebook.png"
                  alt=""
                  width={400}
                  height={400}
                  sizes="(max-width: 640px) 168px, 202px"
                  className="absolute -bottom-[60px] -right-8 w-[168px] rotate-[7deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:-bottom-[72px] sm:-right-9 sm:w-[202px]"
                  priority
                />
              </>
            ) : cleanGameFamily === GAME_FAMILY_IDS.CARTOON ? (
              <>
                <Image
                  ref={cartoonCharacterRef}
                  key={cartoonCharacterConfig.id}
                  src={cartoonCharacterConfig.src}
                  alt=""
                  width={cartoonCharacterConfig.width}
                  height={cartoonCharacterConfig.height}
                  sizes="(max-width: 640px) 268px, 335px"
                  className={`cartoon-home-character ${cartoonCharacterConfig.imageClassName}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Ben 10 easter egg"
                  aria-disabled={Boolean(cartoonBurst)}
                  onKeyDown={handleCartoonCharacterKeyDown}
                  priority
                />
              </>
            ) : (
              <>
                <Image
                  src="/game-modes/team/team-logos/fenerbahce.png"
                  alt=""
                  width={3000}
                  height={3000}
                  sizes="(max-width: 640px) 160px, 224px"
                  className="relative z-10 h-auto w-full -rotate-[8deg] drop-shadow-[0_14px_24px_rgba(0,0,0,0.38)]"
                  priority
                />
                <Image
                  src="/game-modes/team/team-logos/galatasaray.png"
                  alt=""
                  width={3000}
                  height={3000}
                  sizes="(max-width: 640px) 36px, 44px"
                  className="absolute -right-1 top-3 z-0 h-auto w-9 rotate-[8deg] drop-shadow-[0_8px_13px_rgba(0,0,0,0.45)] sm:-right-1 sm:top-4 sm:w-11"
                  priority
                />
              </>
            )}
          </div>
        )}
    </>
  );
}
