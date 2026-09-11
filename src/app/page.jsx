import LandingPage from "@/components/sections/landing/LandingPage";
import PageIntro from "@/components/layout/PageIntro";
import { redirect } from "next/navigation";

export const metadata = {
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
