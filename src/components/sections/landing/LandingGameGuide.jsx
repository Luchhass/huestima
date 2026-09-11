"use client";

import { useTranslation } from "@/hooks/useLanguage";

const GUIDE = {
  en: {
    eyebrow: "game guide",
    title: "how Huestima works",
    intro: "Huestima is a collection of color-memory games. Choose a game, study its target, then rebuild the color or palette from memory and see how close your estimate was.",
    sections: [
      {
        title: "How to play",
        text: "Start by choosing a game and playing solo or with others. The target appears briefly, then disappears. Use the available controls to recreate what you remember, submit your guess, and compare it with the original.",
      },
      {
        title: "Choose your difficulty",
        text: "Easy keeps some values fixed so you can focus on the main color. Normal adds more control, while Hard gives you the full set of adjustments. Individual game modes may use their own settings.",
      },
      {
        title: "Play with friends",
        text: "In multiplayer, create a room and share its invite link. Everyone receives the same challenge, then compares their results at the end of the round.",
      },
    ],
  },
  tr: {
    eyebrow: "oyun rehberi",
    title: "Huestima nasıl çalışır",
    intro: "Huestima, renk hafızasını ölçen oyunlardan oluşur. Bir oyun seç, hedefi incele, ardından rengi veya paleti hafızandan yeniden oluştur ve tahmininin ne kadar yakın olduğunu gör.",
    sections: [
      {
        title: "Nasıl oynanır?",
        text: "Bir oyun seçerek tek başına ya da arkadaşlarınla başla. Hedef kısa süre görünür ve ardından kaybolur. Hatırladığın rengi mevcut kontrollerle yeniden oluştur, tahminini gönder ve orijinaliyle karşılaştır.",
      },
      {
        title: "Zorluğunu seç",
        text: "Kolay modda ana renge odaklanman için bazı değerler sabit tutulur. Normal mod daha fazla kontrol ekler; zorda ise tüm ayarlar senin elindedir. Bazı oyun modlarının kendine özgü ayarları olabilir.",
      },
      {
        title: "Arkadaşlarınla oyna",
        text: "Çok oyunculu modda bir oda oluşturup davet bağlantısını paylaşabilirsin. Herkes aynı hedefi görür ve turun sonunda sonuçlarınızı karşılaştırırsınız.",
      },
    ],
  },
};

export default function LandingGameGuide() {
  const { locale } = useTranslation();
  const content = GUIDE[locale] || GUIDE.en;

  return (
    <section
      className="py-20 sm:py-28"
      aria-labelledby="landing-guide-title"
      data-header-theme="light"
      data-footer-theme="light"
    >
      <header className="max-w-3xl" data-scroll-screen-reveal>
        <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-black">
          {content.eyebrow}
        </p>
        <h2
          id="landing-guide-title"
          className="mt-4 text-[clamp(2.6rem,5.2vw,5rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-black"
        >
          {content.title}
        </h2>
        <p className="mb-0 mt-6 max-w-2xl text-[1.05rem] font-medium leading-[1.55] tracking-[-0.03em] text-black/60 sm:text-lg">
          {content.intro}
        </p>
      </header>

      <div className="mt-14 border-t border-black/10">
        {content.sections.map(({ title, text }) => (
          <section
            key={title}
            className="grid gap-4 border-b border-black/10 py-8 sm:py-10 md:grid-cols-[minmax(12rem,0.42fr)_minmax(0,1fr)] md:gap-12"
            data-scroll-screen-reveal
          >
            <h3 className="m-0 text-xl font-semibold leading-none tracking-[-0.05em] text-black sm:text-2xl">
              {title}
            </h3>
            <p className="m-0 max-w-2xl text-[0.98rem] font-medium leading-[1.55] tracking-[-0.025em] text-black/60 sm:text-base">
              {text}
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}
