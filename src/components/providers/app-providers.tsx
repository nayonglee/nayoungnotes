"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useEffectEvent, useState } from "react";
import { flushPendingQueue } from "@/lib/local/sync";
import { loadPinPreferences, loadStoredPin, savePinPreferences } from "@/lib/pin";
import { useAuthStore } from "@/store/auth-store";
import { usePinStore } from "@/store/pin-store";
import { AuthBootstrap } from "@/components/providers/auth-bootstrap";

function ActivityBridge() {
  const viewer = useAuthStore((state) => state.viewer);
  const queryClient = useQueryClient();
  const setHasPin = usePinStore((state) => state.setHasPin);
  const setLoaded = usePinStore((state) => state.setLoaded);
  const setPreferences = usePinStore((state) => state.setPreferences);
  const setLocked = usePinStore((state) => state.setLocked);
  const touchActivity = usePinStore((state) => state.touchActivity);
  const preferences = usePinStore((state) => state.preferences);
  const hasPin = usePinStore((state) => state.hasPin);
  const lastActivityAt = usePinStore((state) => state.lastActivityAt);

  const refreshRemote = useEffectEvent(async () => {
    if (viewer) {
      await flushPendingQueue(viewer);
      await queryClient.invalidateQueries();
    }
  });

  useEffect(() => {
    const storedPin = loadStoredPin();
    const storedPreferences = loadPinPreferences();
    setHasPin(Boolean(storedPin));
    setPreferences(storedPreferences);
    setLoaded(true);
  }, [setHasPin, setLoaded, setPreferences]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshRemote();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && hasPin && preferences.lockOnBackground) {
        setLocked(true);
      }

      if (document.visibilityState === "visible") {
        touchActivity();
        void refreshRemote();
      }
    };

    const handleOnline = () => {
      void refreshRemote();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hasPin, preferences.lockOnBackground, setLocked, touchActivity]);

  useEffect(() => {
    if (!hasPin) return;
    const interval = window.setInterval(() => {
      const elapsedMinutes = (Date.now() - lastActivityAt) / 60000;
      if (elapsedMinutes >= preferences.timeoutMinutes) setLocked(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [hasPin, lastActivityAt, preferences.timeoutMinutes, setLocked]);

  useEffect(() => {
    savePinPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const markActive = () => touchActivity();
    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);
    return () => {
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
    };
  }, [touchActivity]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: 1,
            refetchOnReconnect: true
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <ActivityBridge />
      {children}
    </QueryClientProvider>
  );
}
