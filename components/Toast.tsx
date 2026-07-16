"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = {
  id: number;
  message: string;
  kind: "ok" | "error";
};

type ToastContextValue = {
  toast: (message: string) => void;
  toastError: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, kind: Toast["kind"]) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  const value = {
    toast: (m: string) => push(m, "ok"),
    toastError: (m: string) => push(m, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass pointer-events-auto max-w-[90vw] px-4 py-3 text-sm ${
              t.kind === "error"
                ? "border-danger/40 text-danger"
                : "border-accent/30 text-ink glow-live"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
