"use client";

import { useEffect, type ReactNode } from "react";
import { useSession } from "@/components/providers/auth-provider";
import { start, stop } from "@/lib/realtime/connection";
import { init, reset } from "@/lib/realtime/notification-store";

/**
 * Ties the SignalR connection to the session.
 *
 * The hub requires a bearer token, so there is nothing to connect to until
 * somebody signs in — and the connection must be torn down when they leave, or
 * the next user on the machine inherits the previous one's socket.
 *
 * Keyed on `userId` rather than the session object: the session is replaced
 * wholesale every time the token refreshes, about once an hour, and reconnecting
 * on that would drop the socket for no reason. `accessTokenFactory` reads the
 * fresh token on its own.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const userId = session?.userId ?? null;

  useEffect(() => {
    if (!userId) {
      reset();
      void stop();
      return;
    }

    void start();
    void init();

    return () => {
      void stop();
    };
  }, [userId]);

  return <>{children}</>;
}
