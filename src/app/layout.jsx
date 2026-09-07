import { Geist, Geist_Mono } from "next/font/google";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import InteractionAudio from "@/components/layout/InteractionAudio";
import AppFooter from "@/components/layout/AppFooter";
import AppHeader from "@/components/layout/AppHeader";
import FullscreenEscapeButton from "@/components/layout/FullscreenEscapeButton";
import GlobalPushNotifications from "@/components/ui/GlobalPushNotifications";
import StructuredData from "@/components/seo/StructuredData";
import ThemeBootstrap from "@/components/layout/ThemeBootstrap";
import RouteLanguageSync from "@/components/layout/RouteLanguageSync";
import { AdminModeProvider } from "@/hooks/useAdminMode";
import { SiteOperationsProvider } from "@/hooks/useSiteOperations";
import { APP_NAME } from "@/lib/constants";
import {
  ROUTE_SEO,
  SITE_DESCRIPTION,
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: ROUTE_SEO.home.title,
    description: SITE_DESCRIPTION,
    url: "/color",
    siteName: APP_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: ROUTE_SEO.home.title,
    description: SITE_DESCRIPTION,
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
    "msapplication-TileImage": "/icon-512.png",
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
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeBootstrap />
      </head>
      <body
        suppressHydrationWarning
        className="h-full overflow-hidden bg-background text-foreground"
      >
        <GoogleAnalytics />
        <RouteLanguageSync />
        <StructuredData />
        <InteractionAudio />
        <AdminModeProvider>
          <SiteOperationsProvider>
            <AppHeader />
            <FullscreenEscapeButton />
            {children}
            <AppFooter />
            <GlobalPushNotifications />
          </SiteOperationsProvider>
        </AdminModeProvider>
      </body>
    </html>
  );
}
