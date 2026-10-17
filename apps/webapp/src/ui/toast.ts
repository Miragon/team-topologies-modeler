/**
 * Transient toast notifications (state + imperative API).
 *
 * `toast(message, tone)` shows a bottom-centre toast and returns its id. Info, success and warning
 * toasts close after 2.8 s, errors after 5 s; `{ sticky: true }` keeps a toast until the user
 * dismisses it (for problems that persist, such as full storage). Identical messages are merged,
 * at most three toasts are visible (a sticky toast is never pushed out by a newer one), and timers
 * pause while a toast is hovered or focused.
 */

import { create } from "zustand";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastOptions {
  /** Auto-dismiss delay in ms; defaults to the tone's duration. */
  duration?: number;
  /** Stay until dismissed. */
  sticky?: boolean;
}

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  sticky: boolean;
  leaving: boolean;
}

const DEFAULT_DURATION_MS: Record<ToastTone, number> = {
  info: 2800,
  success: 2800,
  warning: 2800,
  error: 5000,
};

/** Matches --cd-motion-base, so the exit animation finishes before the toast unmounts. */
const EXIT_DURATION_MS = 250;
const MAX_VISIBLE = 3;

interface ToastTimer {
  handle?: ReturnType<typeof setTimeout>;
  remaining: number;
  startedAt: number;
}

const timers = new Map<number, ToastTimer>();
let counter = 0;

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone, options?: ToastOptions) => number;
  update: (id: number, message: string, tone?: ToastTone, options?: ToastOptions) => boolean;
  dismiss: (id: number) => void;
  pause: (id: number) => void;
  resume: (id: number) => void;
}

function stopTimer(id: number): void {
  const timer = timers.get(id);
  if (timer?.handle) clearTimeout(timer.handle);
  timers.delete(id);
}

function durationFor(tone: ToastTone, options?: ToastOptions): number | null {
  if (options?.sticky) return null;
  return options?.duration ?? DEFAULT_DURATION_MS[tone];
}

export const useToastStore = create<ToastState>((set, get) => {
  const startTimer = (id: number, duration: number | null) => {
    stopTimer(id);
    if (duration === null) return;
    const timer: ToastTimer = { remaining: duration, startedAt: Date.now() };
    timer.handle = setTimeout(() => get().dismiss(id), duration);
    timers.set(id, timer);
  };

  return {
    toasts: [],

    push: (message, tone = "info", options) => {
      const duplicate = get().toasts.find(
        (existing) => !existing.leaving && existing.message === message && existing.tone === tone,
      );
      if (duplicate) {
        startTimer(duplicate.id, durationFor(tone, options));
        return duplicate.id;
      }

      const id = ++counter;
      const sticky = options?.sticky ?? false;
      set((state) => ({
        toasts: [...state.toasts, { id, message, tone, sticky, leaving: false }],
      }));
      startTimer(id, durationFor(tone, options));

      // Sticky toasts report problems that last, and some are only ever raised once a session.
      const visible = get().toasts.filter((existing) => !existing.leaving);
      const overflow = visible.length - MAX_VISIBLE;
      visible
        .filter((existing) => !existing.sticky && existing.id !== id)
        .slice(0, Math.max(0, overflow))
        .forEach((oldest) => get().dismiss(oldest.id));
      return id;
    },

    update: (id, message, tone, options) => {
      const current = get().toasts.find((existing) => existing.id === id && !existing.leaving);
      if (!current) return false;
      const nextTone = tone ?? current.tone;
      const sticky = options?.sticky ?? false;
      set((state) => ({
        toasts: state.toasts.map((existing) =>
          existing.id === id ? { ...existing, message, tone: nextTone, sticky } : existing,
        ),
      }));
      startTimer(id, durationFor(nextTone, options));
      return true;
    },

    dismiss: (id) => {
      stopTimer(id);
      const current = get().toasts.find((existing) => existing.id === id);
      if (!current || current.leaving) return;
      set((state) => ({
        toasts: state.toasts.map((existing) =>
          existing.id === id ? { ...existing, leaving: true } : existing,
        ),
      }));
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((existing) => existing.id !== id) }));
      }, EXIT_DURATION_MS);
    },

    pause: (id) => {
      const timer = timers.get(id);
      if (!timer?.handle) return;
      clearTimeout(timer.handle);
      timer.handle = undefined;
      timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
    },

    resume: (id) => {
      const timer = timers.get(id);
      if (!timer || timer.handle) return;
      timer.startedAt = Date.now();
      timer.handle = setTimeout(() => get().dismiss(id), timer.remaining);
    },
  };
});

/** Shows a toast and returns its id (for `updateToast` / `dismissToast`). */
export function toast(message: string, tone: ToastTone = "info", options?: ToastOptions): number {
  return useToastStore.getState().push(message, tone, options);
}

/**
 * Replaces a toast's message and tone, and restarts its timer for the new tone. Returns false when
 * the toast is already gone or on its way out, so the caller can show the news as a new toast.
 */
export function updateToast(
  id: number,
  message: string,
  tone?: ToastTone,
  options?: ToastOptions,
): boolean {
  return useToastStore.getState().update(id, message, tone, options);
}

export function dismissToast(id: number): void {
  useToastStore.getState().dismiss(id);
}
