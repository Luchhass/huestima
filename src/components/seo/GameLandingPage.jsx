"use client";

import { useLanguage } from "@/hooks/useLanguage";
import HomeCard from "@/components/sections/home/HomeCard";
import PageIntro from "@/components/layout/PageIntro";
import StructuredData from "./StructuredData";

export default function GameLandingPage({ family }) {
  const { locale } = useLanguage();
  return (
    <div className="game-landing" lang={locale}>
      <StructuredData family={family} locale={locale} />
      <div id="play" className="game-landing-play">
        <HomeCard gameFamily={family} />
        <PageIntro />
      </div>
    </div>
  );
}
