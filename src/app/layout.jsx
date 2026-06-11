import { Geist, Geist_Mono } from "next/font/google";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import InteractionAudio from "@/components/layout/InteractionAudio";
import AppFooter from "@/components/layout/AppFooter";
import AppHeader from "@/components/layout/AppHeader";
import FullscreenEscapeButton from "@/components/layout/FullscreenEscapeButton";
import StructuredData from "@/components/seo/StructuredData";
import { AdminModeProvider } from "@/hooks/useAdminMode";
import {
  APP_NAME,
  FULLSCREEN_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/constants";
import {
  ROUTE_SEO,
  SEO_KEYWORDS,
  SITE_DESCRIPTION,
  SITE_IMAGE_HEIGHT,
  SITE_IMAGE_URL,
  SITE_IMAGE_WIDTH,
  SITE_URL,
} from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    default: ROUTE_SEO.home.title,
    template: `%s | ${APP_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  authors: [{ name: "furkancosar", url: "https://furkancosar.com" }],
  creator: "furkancosar",
  publisher: "furkancosar",
  generator: "Next.js",
  category: "game",
  classification: "Browser game",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.svg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: ROUTE_SEO.home.title,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: APP_NAME,
    images: [
      {
        url: SITE_IMAGE_URL,
        width: SITE_IMAGE_WIDTH,
        height: SITE_IMAGE_HEIGHT,
        alt: `${APP_NAME} free online color memory game preview`,
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: ROUTE_SEO.home.title,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_IMAGE_URL,
        alt: `${APP_NAME} free online color memory game preview`,
      },
    ],
    creator: "@furkancosar",
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#000000",
    "msapplication-TileImage": "/og-image.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#2f2f2f" },
  ],
};

export default function RootLayout({ children }) {
  const themeScript = `
    (() => {
      try {
        const key = "${THEME_STORAGE_KEY}";
        const stored = window.localStorage.getItem(key);
        const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const theme = stored === "light" || stored === "dark" ? stored : preferred;
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
        const language = window.localStorage.getItem("${LANGUAGE_STORAGE_KEY}") === "tr" ? "tr" : "en";
        document.documentElement.lang = language;
        document.documentElement.dataset.locale = language;
        const fullscreen = window.localStorage.getItem("${FULLSCREEN_STORAGE_KEY}");
        document.documentElement.dataset.fullscreenMode = fullscreen === "on" || fullscreen === "true" ? "on" : "off";
        const pathSegments = window.location.pathname.split("/").filter(Boolean);
        const shouldPlayIntro = window.location.pathname === "/" || pathSegments.length === 1;
        if (shouldPlayIntro) {
          document.documentElement.dataset.pageIntroPending = "true";
          window.setTimeout(() => {
            if (document.documentElement.dataset.pageIntroPending === "true") {
              delete document.documentElement.dataset.pageIntroPending;
            }
          }, 8200);
        }
      } catch (error) {}
    })();
  `;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="h-full overflow-hidden bg-background text-foreground"
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <GoogleAnalytics />
        <StructuredData />
        <InteractionAudio />
        <AdminModeProvider>
          <AppHeader />
          <FullscreenEscapeButton />
          {children}
          <AppFooter />
        </AdminModeProvider>
      </body>
    </html>
  );
}
