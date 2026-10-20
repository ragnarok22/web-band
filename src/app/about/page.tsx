import type { Metadata } from "next";

import { AboutScreen } from "@/components/about/about-screen";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet your browser-based rhythm practice companion for guitarists: drum grooves, strumming, chord progressions, tempo training, and metronome practice.",
};

export default function AboutPage() {
  return <AboutScreen />;
}
