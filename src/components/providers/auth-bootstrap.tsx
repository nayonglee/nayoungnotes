"use client";

import { useEffect } from "react";
import { loadPreviewViewer, savePreviewViewer } from "@/lib/auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loadSession } from "@/lib/supabase/repository";
import { useAuthStore } from "@/store/auth-store";

export function AuthBootstrap() {
  const setViewer = useAuthStore((state) => state.setViewer);
  const setSessionReady = useAuthStore((state) => state.setSessionReady);
  const setSupabaseConfigured = useAuthStore((state) => state.setSupabaseConfigured);

  useEffect(() => {
    let mounted = true;
    const configured = isSupabaseConfigured();
    setSupabaseConfigured(configured);

    const syncSession = async () => {
      const previewViewer = loadPreviewViewer();

      if (!configured) {
        if (mounted) {
          setViewer(previewViewer);
          setSessionReady(true);
        }
        return;
      }

      const session = await loadSession();
      if (!mounted) return;

      if (session?.user) {
        savePreviewViewer(null);
        setViewer({
          id: session.user.id,
          email: session.user.email ?? null,
          mode: "supabase"
        });
      } else {
        setViewer(previewViewer);
      }

      setSessionReady(true);
    };

    void syncSession();

    const supabase = getSupabaseClient();
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        savePreviewViewer(null);
        setViewer({
          id: session.user.id,
          email: session.user.email ?? null,
          mode: "supabase"
        });
      } else {
        setViewer(loadPreviewViewer());
      }

      setSessionReady(true);
    });

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [setSessionReady, setSupabaseConfigured, setViewer]);

  return null;
}
