import type { Metadata } from "next";

import { ErrorScreen } from "@/components/errors/error-screen";

export const metadata: Metadata = {
  title: "404 — Page not found",
};

export default function NotFound() {
  return <ErrorScreen code="404" />;
}
