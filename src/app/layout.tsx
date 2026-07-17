import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";

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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
