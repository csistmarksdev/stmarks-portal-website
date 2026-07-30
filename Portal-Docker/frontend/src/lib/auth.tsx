"use client";

import type { AdminUser, LoginResponse, Permission } from "@portal/shared";
import { roleHasPermission } from "@portal/shared";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, tokenStore } from "./api";

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-read `/auth/me`, so a self-service profile edit shows up immediately. */
  refreshUser: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    /*
     * A refresh token alone is enough to restore the session — `/auth/me` will
     * 401 without an access token and `request` then refreshes and retries.
     * Bailing out on a missing access token would sign the user out despite a
     * week of session left.
     */
    if (!tokenStore.access && !tokenStore.refresh) {
      setLoading(false);
      return;
    }
    api
      .get<AdminUser>("/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      tokenStore.set(data);
      setUser(data.user);
      router.replace("/dashboard");
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Local sign-out even if the API call fails.
    }
    tokenStore.clear();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const me = await api.get<AdminUser>("/auth/me");
    setUser(me);
  }, []);

  const can = useCallback(
    (permission: Permission) =>
      user ? roleHasPermission(user.role, permission) : false,
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser, can }),
    [user, loading, login, logout, refreshUser, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
