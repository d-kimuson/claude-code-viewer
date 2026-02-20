/// <reference types="vitest" />
/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./useIsMobile";

describe("useIsMobile", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  const renderHook = (onValue: (value: boolean) => void) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(<HookConsumer onValue={onValue} />);
    });
  };

  const cleanup = () => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  };

  const HookConsumer = ({ onValue }: { onValue: (value: boolean) => void }) => {
    onValue(useIsMobile());
    return null;
  };

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const createMediaQueryMock = (initialMatches: boolean) => {
    const matches = { value: initialMatches };
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    type MediaQueryChangeListener =
      | EventListenerOrEventListenerObject
      | ((this: MediaQueryList, ev: MediaQueryListEvent) => void)
      | null;

    const normalizeListener = (
      listener: MediaQueryChangeListener,
    ): ((event: MediaQueryListEvent) => void) | undefined => {
      if (typeof listener === "function") {
        return listener;
      }
      if (listener && "handleEvent" in listener && listener.handleEvent) {
        return listener.handleEvent.bind(listener) as (
          event: MediaQueryListEvent,
        ) => void;
      }
      return undefined;
    };
    const mediaQuery = {
      get matches() {
        return matches.value;
      },
      media: "",
      onchange: null,
      dispatchEvent: () => true,
      addEventListener: (
        _: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        const callback = normalizeListener(listener);
        if (callback) {
          listeners.add(callback);
        }
      },
      removeEventListener: (
        _: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        const callback = normalizeListener(listener);
        if (callback) {
          listeners.delete(callback);
        }
      },
      addListener: (
        listener:
          | ((this: MediaQueryList, ev: MediaQueryListEvent) => void)
          | null,
      ) => {
        const callback = normalizeListener(listener);
        if (callback) {
          listeners.add(callback);
        }
      },
      removeListener: (
        listener:
          | ((this: MediaQueryList, ev: MediaQueryListEvent) => void)
          | null,
      ) => {
        const callback = normalizeListener(listener);
        if (callback) {
          listeners.delete(callback);
        }
      },
    } satisfies MediaQueryList;

    const matchMedia = vi.fn((_: string): MediaQueryList => mediaQuery);

    return { matchMedia, listeners, matches };
  };

  it("initially reflects the synchronous viewport check", () => {
    const { matchMedia } = createMediaQueryMock(true);
    vi.stubGlobal("innerWidth", 375);
    vi.stubGlobal("matchMedia", matchMedia);

    const values: boolean[] = [];
    renderHook((value) => values.push(value));

    expect(values[0]).toBe(true);
  });

  it("updates when the media query listener fires", () => {
    const { matchMedia, listeners, matches } = createMediaQueryMock(false);
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("matchMedia", matchMedia);

    const values: boolean[] = [];
    renderHook((value) => values.push(value));

    act(() => {
      matches.value = true;
      listeners.forEach((listener) => {
        listener({
          matches: matches.value,
        } as MediaQueryListEvent);
      });
    });

    expect(values.at(-1)).toBe(true);
  });
});
