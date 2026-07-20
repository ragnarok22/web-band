"use client";

import { AlertTriangle, Download, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type UpdateNotice =
  | "applying"
  | "downloading"
  | "installation-error"
  | "registration-error"
  | "registration-update-error"
  | "reload"
  | "update-error"
  | "waiting";

interface NoticeContent {
  action:
    | "apply"
    | "reload"
    | "reload-registration"
    | "retry-registration"
    | "retry-update"
    | null;
  actionLabel: string | null;
  message: string;
}

const noticeContent: Record<UpdateNotice, NoticeContent> = {
  applying: {
    action: null,
    actionLabel: null,
    message: "Applying the update. Keep this page open for a moment.",
  },
  downloading: {
    action: null,
    actionLabel: null,
    message: "Downloading an app update in the background.",
  },
  "installation-error": {
    action: "reload-registration",
    actionLabel: "Retry offline setup",
    message:
      "Offline support could not finish installing. Reload to try the setup again.",
  },
  "registration-error": {
    action: "retry-registration",
    actionLabel: "Retry offline setup",
    message:
      "Offline support could not start. Web Band remains available while you are online.",
  },
  "registration-update-error": {
    action: "retry-registration",
    actionLabel: "Retry update check",
    message:
      "Web Band could not check for app updates. Your current offline version remains available.",
  },
  reload: {
    action: "reload",
    actionLabel: "Reload",
    message: "The update is active. Reload to use the new version.",
  },
  "update-error": {
    action: "retry-update",
    actionLabel: "Retry update",
    message:
      "The update could not be activated. Your current version remains available.",
  },
  waiting: {
    action: "apply",
    actionLabel: "Apply update",
    message: "An app update is ready to apply.",
  },
};

function subscribeToWorkerState(
  worker: ServiceWorker,
  onStateChange: (state: ServiceWorkerState) => void,
): () => void {
  const handleStateChange = () => onStateChange(worker.state);
  worker.addEventListener("statechange", handleStateChange);
  handleStateChange();
  return () => worker.removeEventListener("statechange", handleStateChange);
}

export function ServiceWorkerUpdate() {
  const [notice, setNotice] = useState<UpdateNotice | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [registrationAttempt, setRegistrationAttempt] = useState(0);
  const candidateIsUpdateRef = useRef(false);
  const candidateRef = useRef<ServiceWorker | null>(null);
  const controllerRef = useRef<ServiceWorker | null>(null);
  const hadControllerRef = useRef(false);
  const retryUpdateRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.serwist === undefined) return;

    let isActive = true;
    let registration: ServiceWorkerRegistration | undefined;
    let stopObservingWorker: () => void = () => undefined;
    const serwist = window.serwist;
    controllerRef.current = navigator.serviceWorker.controller;
    hadControllerRef.current = Boolean(controllerRef.current);

    const isUpdate = (event: { isExternal?: boolean; isUpdate?: boolean }) =>
      Boolean(event.isExternal || event.isUpdate || hadControllerRef.current);
    const failCandidate = (worker: ServiceWorker) => {
      if (!isActive || worker !== candidateRef.current) return;
      const failedUpdate =
        hadControllerRef.current || candidateIsUpdateRef.current;
      candidateRef.current = null;
      candidateIsUpdateRef.current = false;
      setIsPending(false);
      setNotice(failedUpdate ? "update-error" : "installation-error");
    };
    const observeWorker = (
      worker: ServiceWorker,
      isUpdateCandidate: boolean,
    ) => {
      stopObservingWorker();
      candidateRef.current = worker;
      candidateIsUpdateRef.current = isUpdateCandidate;
      stopObservingWorker = subscribeToWorkerState(worker, (state) => {
        if (!isActive || worker !== candidateRef.current) return;
        if (
          state === "installed" &&
          registration?.waiting === worker &&
          isUpdateCandidate
        ) {
          setNotice("waiting");
          setIsPending(false);
        } else if (state === "activating" && isUpdateCandidate) {
          setNotice("applying");
          setIsPending(true);
        } else if (state === "redundant") {
          failCandidate(worker);
        }
      });
    };
    const handleInstalling = (event: {
      isExternal?: boolean;
      isUpdate?: boolean;
      sw?: ServiceWorker;
    }) => {
      if (!isActive || !event.sw) return;
      const isUpdateCandidate = isUpdate(event);
      observeWorker(event.sw, isUpdateCandidate);
      if (!isUpdateCandidate) return;
      setNotice("downloading");
      setIsPending(false);
    };
    const handleWaiting = (event: {
      isExternal?: boolean;
      isUpdate?: boolean;
      sw?: ServiceWorker;
    }) => {
      if (!isActive || !event.sw || !isUpdate(event)) return;
      observeWorker(event.sw, true);
      setNotice("waiting");
      setIsPending(false);
    };
    const handleActivating = (event: { sw?: ServiceWorker }) => {
      if (
        !isActive ||
        event.sw !== candidateRef.current ||
        !candidateIsUpdateRef.current
      ) {
        return;
      }
      setNotice("applying");
      setIsPending(true);
    };
    const handleControlling = () => {
      const controller = navigator.serviceWorker.controller;
      if (!isActive || !controller || controller === controllerRef.current) {
        return;
      }
      const isUpdatedController =
        controllerRef.current !== null || candidateIsUpdateRef.current;
      controllerRef.current = controller;
      hadControllerRef.current = true;
      candidateRef.current = null;
      candidateIsUpdateRef.current = false;
      stopObservingWorker();
      stopObservingWorker = () => undefined;
      setIsPending(false);
      setNotice(isUpdatedController ? "reload" : null);
    };
    const handleRedundant = (event: { sw?: ServiceWorker }) => {
      if (event.sw) failCandidate(event.sw);
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControlling,
    );
    serwist.addEventListener("installing", handleInstalling);
    serwist.addEventListener("waiting", handleWaiting);
    serwist.addEventListener("activating", handleActivating);
    serwist.addEventListener("controlling", handleControlling);
    serwist.addEventListener("redundant", handleRedundant);

    async function register(): Promise<void> {
      setIsPending(true);
      setNotice(null);
      try {
        registration = await serwist.register();
        if (!isActive || !registration) return;
        const hasExistingWorker = Boolean(
          hadControllerRef.current || registration.active,
        );
        if (registration.waiting && hasExistingWorker) {
          observeWorker(registration.waiting, true);
          setNotice("waiting");
        } else if (registration.installing && hasExistingWorker) {
          observeWorker(registration.installing, true);
          setNotice("downloading");
        } else if (registration.installing) {
          observeWorker(registration.installing, false);
        }
      } catch {
        if (isActive) {
          setNotice(
            hadControllerRef.current
              ? "registration-update-error"
              : "registration-error",
          );
        }
      } finally {
        if (isActive) setIsPending(false);
      }
    }

    retryUpdateRef.current = async () => {
      setIsPending(true);
      setNotice("downloading");
      candidateRef.current = null;
      candidateIsUpdateRef.current = false;
      try {
        await serwist.update();
        registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          observeWorker(registration.waiting, true);
          setNotice("waiting");
        } else if (registration?.installing) {
          observeWorker(registration.installing, true);
        } else {
          setNotice(null);
        }
      } catch {
        setNotice("update-error");
      } finally {
        setIsPending(false);
      }
    };

    void register();
    return () => {
      isActive = false;
      retryUpdateRef.current = async () => undefined;
      stopObservingWorker();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControlling,
      );
      serwist.removeEventListener("installing", handleInstalling);
      serwist.removeEventListener("waiting", handleWaiting);
      serwist.removeEventListener("activating", handleActivating);
      serwist.removeEventListener("controlling", handleControlling);
      serwist.removeEventListener("redundant", handleRedundant);
    };
  }, [registrationAttempt]);

  if (!notice) return null;

  const content = noticeContent[notice];
  const isError =
    notice === "installation-error" ||
    notice === "registration-error" ||
    notice === "registration-update-error" ||
    notice === "update-error";
  return (
    <aside
      className={`${isError ? "border-danger/45" : "border-border-strong"} bg-surface-elevated pointer-events-auto flex w-full items-center justify-between gap-3 rounded-xl border p-4 shadow-2xl`}
      role={isError ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        {isError ? (
          <AlertTriangle
            aria-hidden="true"
            className="text-danger mt-0.5 size-5 shrink-0"
          />
        ) : notice === "waiting" || notice === "downloading" ? (
          <Download
            aria-hidden="true"
            className="text-accent mt-0.5 size-5 shrink-0"
          />
        ) : (
          <RefreshCw
            aria-hidden="true"
            className="text-accent mt-0.5 size-5 shrink-0"
          />
        )}
        <p className="text-muted-strong text-sm leading-6">{content.message}</p>
      </div>
      {content.action ? (
        <button
          className="bg-accent text-accent-ink hover:bg-accent-strong min-h-11 shrink-0 rounded-lg px-3 font-bold transition-colors disabled:opacity-50"
          disabled={isPending}
          onClick={() => {
            if (content.action === "apply") {
              setNotice("applying");
              setIsPending(true);
              window.serwist.messageSkipWaiting();
            } else if (
              content.action === "reload" ||
              content.action === "reload-registration"
            ) {
              window.location.reload();
            } else if (content.action === "retry-registration") {
              setRegistrationAttempt((attempt) => attempt + 1);
            } else {
              void retryUpdateRef.current();
            }
          }}
          type="button"
        >
          {content.actionLabel}
        </button>
      ) : null}
    </aside>
  );
}
