import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";
import { SiteNavigation } from "@/components/navigation/site-navigation";

import "./globals.css";

const appearanceBootstrap = `(()=>{let theme="dark",reducedMotion=false;try{const value=JSON.parse(localStorage.getItem("web-band-appearance-v1")||"null");if(value&&(value.theme==="dark"||value.theme==="light"||value.theme==="system"))theme=value.theme;if(value&&typeof value.reducedMotion==="boolean")reducedMotion=value.reducedMotion;}catch{}const resolved=theme==="system"&&matchMedia("(prefers-color-scheme: light)").matches?"light":theme==="system"?"dark":theme;document.documentElement.dataset.theme=resolved;document.documentElement.dataset.reduceMotion=String(reducedMotion);document.querySelector('meta[name="theme-color"]')?.setAttribute("content",resolved==="light"?"#f3eee5":"#12110f");})();`;

const manrope = Manrope({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-manrope",
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Web Band",
  },
  applicationName: "Web Band Rhythm Practice",
  description:
    "A focused drum and rhythm practice companion with sounds synthesized in real time.",
  formatDetection: {
    telephone: false,
  },
  title: {
    default: "Web Band Rhythm Practice",
    template: "%s | Web Band",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#12110f",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={`${manrope.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AppProviders>
          <SiteNavigation />
          <div
            className="pt-[env(safe-area-inset-top)] pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pt-[env(safe-area-inset-top)] lg:pr-[env(safe-area-inset-right)] lg:pb-0 lg:pl-[calc(5rem+env(safe-area-inset-left))]"
            id="main-content"
            tabIndex={-1}
          >
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
