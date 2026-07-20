import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerUpdate } from "@/components/providers/service-worker-update";

type LifecycleEventName =
  "activating" | "controlling" | "installing" | "redundant" | "waiting";
type LifecycleListener = (event: {
  isExternal?: boolean;
  isUpdate?: boolean;
  sw?: ServiceWorker;
}) => void;

class MockSerwist {
  private readonly listeners = new Map<
    LifecycleEventName,
    Set<LifecycleListener>
  >();

  register = vi.fn<() => Promise<ServiceWorkerRegistration | undefined>>();
  update = vi.fn<() => Promise<void>>();
  messageSkipWaiting = vi.fn();

  addEventListener(type: LifecycleEventName, listener: LifecycleListener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  emit(type: LifecycleEventName, event: Parameters<LifecycleListener>[0] = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  listenerCount(type: LifecycleEventName): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  removeEventListener(type: LifecycleEventName, listener: LifecycleListener) {
    this.listeners.get(type)?.delete(listener);
  }
}

const initialServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "serviceWorker",
);
const initialSerwistDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "serwist",
);

interface TestServiceWorker extends ServiceWorker {
  transition: (state: ServiceWorkerState) => void;
}

function worker(
  initialState: ServiceWorkerState = "installing",
): TestServiceWorker {
  let state = initialState;
  const listeners = new Set<EventListenerOrEventListenerObject>();
  return {
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      if (type === "statechange" && listener) listeners.add(listener);
    },
    get state() {
      return state;
    },
    removeEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      if (type === "statechange" && listener) listeners.delete(listener);
    },
    transition: (nextState) => {
      state = nextState;
      const event = new Event("statechange");
      for (const listener of listeners) {
        if (typeof listener === "function") listener(event);
        else listener.handleEvent(event);
      }
    },
  } as TestServiceWorker;
}

function registration(
  values: Partial<ServiceWorkerRegistration> = {},
): ServiceWorkerRegistration {
  return {
    active: null,
    installing: null,
    waiting: null,
    ...values,
  } as ServiceWorkerRegistration;
}

function installEnvironment({
  controller = null,
  currentRegistration = registration(),
}: {
  controller?: ServiceWorker | null;
  currentRegistration?: ServiceWorkerRegistration | undefined;
} = {}) {
  const serwist = new MockSerwist();
  serwist.register.mockResolvedValue(currentRegistration);
  serwist.update.mockResolvedValue();
  const controllerChangeListeners =
    new Set<EventListenerOrEventListenerObject>();
  const serviceWorker = {
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      if (type === "controllerchange") controllerChangeListeners.add(listener);
    },
    controller,
    emitControllerChange: () => {
      const event = new Event("controllerchange");
      for (const listener of controllerChangeListeners) {
        if (typeof listener === "function") listener(event);
        else listener.handleEvent(event);
      }
    },
    getRegistration: vi.fn(async () => currentRegistration),
    removeEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      if (type === "controllerchange")
        controllerChangeListeners.delete(listener);
    },
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: serviceWorker,
  });
  Object.defineProperty(window, "serwist", {
    configurable: true,
    value: serwist,
  });
  return { serviceWorker, serwist };
}

describe("ServiceWorkerUpdate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    if (initialServiceWorkerDescriptor) {
      Object.defineProperty(
        navigator,
        "serviceWorker",
        initialServiceWorkerDescriptor,
      );
    } else {
      Reflect.deleteProperty(navigator, "serviceWorker");
    }
    if (initialSerwistDescriptor) {
      Object.defineProperty(window, "serwist", initialSerwistDescriptor);
    } else {
      Reflect.deleteProperty(window, "serwist");
    }
  });

  it("registers without announcing the first installation", async () => {
    const { serviceWorker, serwist } = installEnvironment();

    render(<ServiceWorkerUpdate />);

    await waitFor(() => expect(serwist.register).toHaveBeenCalledOnce());
    const firstWorker = worker();
    serwist.emit("installing", { isUpdate: false, sw: firstWorker });
    serviceWorker.controller = firstWorker;
    serwist.emit("controlling", { isUpdate: false, sw: firstWorker });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports an asynchronous first-install failure", async () => {
    const { serwist } = installEnvironment();
    render(<ServiceWorkerUpdate />);
    await waitFor(() => expect(serwist.register).toHaveBeenCalledOnce());
    const firstWorker = worker();

    serwist.emit("installing", { isUpdate: false, sw: firstWorker });
    firstWorker.transition("redundant");

    expect(
      await screen.findByText(/Offline support could not finish installing/),
    ).toBeVisible();
  });

  it("detects an existing waiting worker and applies it before offering reload", async () => {
    const user = userEvent.setup();
    const oldController = worker();
    const waitingWorker = worker("installed");
    const currentRegistration = registration({
      active: oldController,
      waiting: waitingWorker,
    });
    const { serviceWorker, serwist } = installEnvironment({
      controller: oldController,
      currentRegistration,
    });
    render(<ServiceWorkerUpdate />);

    expect(
      await screen.findByText("An app update is ready to apply."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Apply update" }));
    expect(serwist.messageSkipWaiting).toHaveBeenCalledOnce();
    expect(
      screen.getByText(
        "Applying the update. Keep this page open for a moment.",
      ),
    ).toBeVisible();

    serviceWorker.controller = waitingWorker;
    serwist.emit("controlling", { sw: waitingWorker });
    expect(
      await screen.findByText(
        "The update is active. Reload to use the new version.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Reload" })).toBeEnabled();
  });

  it("reports updatefound installation progress", async () => {
    const oldController = worker();
    const { serwist } = installEnvironment({ controller: oldController });
    render(<ServiceWorkerUpdate />);
    await waitFor(() => expect(serwist.register).toHaveBeenCalledOnce());

    serwist.emit("installing", { isUpdate: true, sw: worker() });

    expect(
      await screen.findByText("Downloading an app update in the background."),
    ).toBeVisible();
  });

  it("detects controller takeover while registration is still pending", async () => {
    const oldController = worker("activated");
    const nextController = worker("activated");
    const { serviceWorker, serwist } = installEnvironment({
      controller: oldController,
    });
    serwist.register.mockReturnValue(new Promise(() => undefined));
    render(<ServiceWorkerUpdate />);
    await waitFor(() => expect(serwist.register).toHaveBeenCalledOnce());

    serviceWorker.controller = nextController;
    serviceWorker.emitControllerChange();

    expect(
      await screen.findByText(
        "The update is active. Reload to use the new version.",
      ),
    ).toBeVisible();
  });

  it("reports registration failure and retries offline setup", async () => {
    const user = userEvent.setup();
    const { serwist } = installEnvironment();
    serwist.register
      .mockRejectedValueOnce(new Error("registration failed"))
      .mockResolvedValueOnce(registration());
    render(<ServiceWorkerUpdate />);

    expect(
      await screen.findByText(/Offline support could not start/),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Retry offline setup" }),
    );

    await waitFor(() => expect(serwist.register).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("preserves the current offline version when an update check cannot register", async () => {
    const oldController = worker();
    const { serwist } = installEnvironment({ controller: oldController });
    serwist.register.mockRejectedValueOnce(new Error("update check failed"));
    render(<ServiceWorkerUpdate />);

    expect(
      await screen.findByText(/current offline version remains available/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Retry update check" }),
    ).toBeEnabled();
  });

  it("reports activation failure and retries the update check", async () => {
    const user = userEvent.setup();
    const oldController = worker();
    const waitingWorker = worker("installed");
    const { serviceWorker, serwist } = installEnvironment({
      controller: oldController,
      currentRegistration: registration({
        active: oldController,
        waiting: waitingWorker,
      }),
    });
    render(<ServiceWorkerUpdate />);
    await screen.findByRole("button", { name: "Apply update" });
    await user.click(screen.getByRole("button", { name: "Apply update" }));

    waitingWorker.transition("redundant");
    expect(
      await screen.findByText(/update could not be activated/i),
    ).toBeVisible();
    const retryWorker = worker();
    const retryRegistration = registration({
      active: oldController,
      installing: retryWorker,
    });
    serviceWorker.getRegistration.mockResolvedValueOnce(retryRegistration);
    await user.click(screen.getByRole("button", { name: "Retry update" }));

    await waitFor(() => expect(serwist.update).toHaveBeenCalledOnce());
    Object.assign(retryRegistration, {
      installing: null,
      waiting: retryWorker,
    });
    retryWorker.transition("installed");
    expect(
      await screen.findByRole("button", { name: "Apply update" }),
    ).toBeVisible();
    retryWorker.transition("activating");
    expect(
      await screen.findByText(
        "Applying the update. Keep this page open for a moment.",
      ),
    ).toBeVisible();
    retryWorker.transition("redundant");
    expect(
      await screen.findByText(/update could not be activated/i),
    ).toBeVisible();
  });

  it("removes lifecycle listeners on unmount", async () => {
    const { serwist } = installEnvironment();
    const view = render(<ServiceWorkerUpdate />);
    await waitFor(() => expect(serwist.register).toHaveBeenCalledOnce());
    expect(serwist.listenerCount("waiting")).toBe(1);

    view.unmount();

    expect(serwist.listenerCount("waiting")).toBe(0);
    expect(serwist.listenerCount("controlling")).toBe(0);
  });
});
