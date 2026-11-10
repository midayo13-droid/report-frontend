"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "@/lib/api";

export type Role = "viewer" | "user" | "admin" | "superadmin";
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  area: string;
  title: string;
  roleLabel: string;
  areaLabel: string;
}

interface AuthCtx {
  user: User | null | undefined; // undefined = 확인 중, null = 로그아웃 상태
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (email: string) => Promise<void>;
  logout: () => void;
}
const Auth = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const v = useContext(Auth);
  if (!v) throw new Error("AuthProvider 안에서만 쓸 수 있어요.");
  return v;
};

type ToastTone = "ok" | "err";
const ToastCtx = createContext<(msg: string, tone?: ToastTone) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [toasts, setToasts] = useState<{ id: number; msg: string; tone: ToastTone }[]>([]);

  useEffect(() => {
    if (!tokenStore.get()) {
      setUser(null);
      return;
    }
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      });
  }, []);

  const finish = useCallback((r: { token: string; user: User }) => {
    tokenStore.set(r.token);
    setUser(r.user);
  }, []);

  const auth = useMemo<AuthCtx>(
    () => ({
      user,
      login: async (email, password) => finish(await api("/auth/login", { method: "POST", body: { email, password } })),
      demoLogin: async (email) => finish(await api("/auth/demo-login", { method: "POST", body: { email } })),
      logout: () => {
        tokenStore.clear();
        setUser(null);
      },
    }),
    [user, finish],
  );

  const toast = useCallback((msg: string, tone: ToastTone = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <Auth.Provider value={auth}>
      <ToastCtx.Provider value={toast}>
        {children}
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.tone === "err" ? "err" : ""}`}>
              {t.msg}
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </Auth.Provider>
  );
}
