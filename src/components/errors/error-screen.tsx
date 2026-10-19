"use client";

import { ArrowRight, AudioLines, LibraryBig, RotateCcw } from "lucide-react";
import Link from "next/link";

import styles from "./error-screen.module.css";

type ErrorScreenProps = { id?: string } & (
  { code: "404"; onRetry?: never } | { code: "500"; onRetry: () => void }
);

export function ErrorScreen({ code, id, onRetry }: ErrorScreenProps) {
  const isNotFound = code === "404";

  return (
    <main
      aria-labelledby="error-heading"
      className={styles.page}
      id={id}
      tabIndex={id ? -1 : undefined}
    >
      <div className={styles.room}>
        <div aria-hidden="true" className={styles.roomLabel}>
          <AudioLines size={16} />
          Web Band / An unscheduled break
        </div>

        <div className={styles.panel}>
          <div aria-hidden="true" className={styles.display}>
            <div className={styles.displayHeader}>
              <span>Rhythm section</span>
              <span className={styles.status}>
                {isNotFound ? "No signal" : "On pause"}
              </span>
            </div>
            <div className={styles.code}>{code}</div>
            <div className={styles.sequence}>
              {Array.from({ length: 16 }, (_, index) => (
                <span
                  className={styles.step}
                  data-active={
                    isNotFound && (index === 0 || index === 4 || index === 12)
                  }
                  data-missing={index >= 8 && index < 12}
                  key={index}
                />
              ))}
            </div>
            <div className={styles.count}>
              <span>01</span>
              <span>02</span>
              <span>—</span>
              <span>04</span>
            </div>
            <p className={styles.displayNote}>
              {isNotFound
                ? "One beat short of a bar."
                : "A little quiet. Not the finale."}
            </p>
          </div>

          <section className={styles.content}>
            <p className={styles.eyebrow}>
              {code} / {isNotFound ? "Page not found" : "Something went wrong"}
            </p>
            <h1 className={styles.heading} id="error-heading">
              {isNotFound ? "This beat is missing." : "We lost the rhythm."}
            </h1>
            <p className={styles.description}>
              {isNotFound
                ? "This page may have moved, or the link took a wrong turn. Let’s get you back to the practice room."
                : "Web Band hit an unexpected snag. Try loading this section again, or make a fresh start in the practice room."}
            </p>

            <div className={styles.actions}>
              {!isNotFound ? (
                <button
                  className={styles.primaryAction}
                  onClick={onRetry}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={17} />
                  Try again
                </button>
              ) : null}
              {isNotFound ? (
                <Link className={styles.primaryAction} href="/practice">
                  Back to practice
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              ) : (
                // A native GET navigation also recovers failed app providers.
                <form action="/practice" method="get">
                  <button className={styles.secondaryAction} type="submit">
                    Back to practice
                    <ArrowRight aria-hidden="true" size={17} />
                  </button>
                </form>
              )}
              {isNotFound ? (
                <Link className={styles.secondaryAction} href="/patterns">
                  <LibraryBig aria-hidden="true" size={17} />
                  Explore grooves
                </Link>
              ) : null}
            </div>

            <p className={styles.note}>
              {isNotFound
                ? "The practice room is right where you left it."
                : "These recovery actions won’t clear your saved patterns or settings."}
            </p>
          </section>
        </div>

        <p className={styles.footer}>Take a breath. Find the pocket.</p>
      </div>
    </main>
  );
}
