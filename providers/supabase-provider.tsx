"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (supabase) {
      setConnected(true);
    }
  }, [supabase]);

  if (!connected) return null;
  return <>{children}</>;
}
