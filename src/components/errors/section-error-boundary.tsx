"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, Fragment, type ReactNode } from "react";

type ErrorBoundaryVariant = "application" | "compact" | "screen" | "silent";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  section: string;
  variant?: ErrorBoundaryVariant;
}

interface SectionErrorBoundaryState {
  error: Error | null;
  retryKey: number;
}

export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { error: null, retryKey: 0 };

  static getDerivedStateFromError(
    error: Error,
  ): Partial<SectionErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(error, errorInfo);
  }

  private retry = (): void => {
    this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));
  };

  render() {
    const { children, section, variant = "screen" } = this.props;
    const { error, retryKey } = this.state;
    if (!error) return <Fragment key={retryKey}>{children}</Fragment>;
    if (variant === "silent") return null;

    const title =
      variant === "application"
        ? "Web Band needs another count-in"
        : `${section} hit a snag`;
    const Heading = variant === "compact" ? "h2" : "h1";
    const content = (
      <section
        aria-labelledby={`error-${variant}-heading`}
        className={`border-danger/30 bg-surface rounded-2xl border p-6 text-center shadow-2xl ${variant === "compact" ? "m-3 max-w-sm" : "w-full max-w-md"}`}
      >
        <CircleAlert
          aria-hidden="true"
          className="text-danger mx-auto size-10"
        />
        <Heading
          className="text-foreground mt-4 text-2xl font-black"
          id={`error-${variant}-heading`}
        >
          {title}
        </Heading>
        <p className="text-muted mt-2 leading-6">
          Your saved local work is untouched. Try loading this section again.
        </p>
        <button
          className="bg-accent text-accent-ink hover:bg-accent-strong mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-extrabold"
          onClick={this.retry}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Try again
        </button>
      </section>
    );

    if (variant === "compact") return content;
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        {content}
      </main>
    );
  }
}
