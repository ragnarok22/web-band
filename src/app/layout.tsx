import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";
import { SiteNavigation } from "@/components/navigation/site-navigation";

import "./globals.css";

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
    <html className={`${manrope.variable} ${geistMono.variable}`} lang="en">
      <body>
        <AppProviders>
          <SiteNavigation />
          <div className="pb-20 lg:pb-0 lg:pl-20">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
