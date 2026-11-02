import LandingPage from "@/components/sections/landing/LandingPage";
import PageIntro from "@/components/layout/PageIntro";
import { redirect } from "next/navigation";
import { SITE_DESCRIPTION, SITE_IMAGE_WIDTH, SITE_IMAGE_HEIGHT } from "@/lib/seo";

export const metadata = {
  title: { absolute: "How well do you remember color? | Huestima" },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "How well do you remember color? | Huestima",
    description: SITE_DESCRIPTION,
    url: "/?entry=logo",
    siteName: "Huestima",
    type: "website",
    locale: "en_US",
    images: [{ url: "/social/og-landing.png", width: SITE_IMAGE_WIDTH, height: SITE_IMAGE_HEIGHT, alt: "Huestima — how well do you remember color?" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How well do you remember color? | Huestima",
    description: SITE_DESCRIPTION,
    images: ["/social/og-landing.png"],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function Home({ searchParams }) {
  const params = await searchParams;

  if (params?.entry !== "logo") {
    redirect("/color");
  }

  return (
    <>
      <LandingPage />
      <PageIntro />
    </>
  );
}
