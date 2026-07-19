import type { Metadata } from "next";

import { AboutScreen } from "@/components/about/about-screen";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how Web Band turns browser synthesis and precise musical timing into a private, local-first practice room.",
};

export default function AboutPage() {
  return <AboutScreen />;
}
