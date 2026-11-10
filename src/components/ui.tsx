"use client";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { signed } from "@/lib/format";

const ICONS: Record<string, ReactNode> = {
  report: (<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>),
  approve: (<><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>),
  collect: (<><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></>),
  template: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>),
  criteria: (<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>),
  audit: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  admin: (<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>),
  demo: (<><path d="M7 5l12 7-12 7z" /></>),
  more: (<><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>),
  down: (<><path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>),
  left: <path d="m15 5-7 7 7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  alert: (<><path d="M12 4 3 20h18z" /><path d="M12 10v4M12 17.5v.01" /></>),
  box: (<><path d="M4 8l8-4 8 4v8l-8 4-8-4z" /><path d="M4 8l8 4 8-4M12 12v8" /></>),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  spark: (<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></>),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  up: <path d="m5 15 7-7 7 7" />,
  downarrow: <path d="m5 9 7 7 7-7" />,
  trash: (<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>),
  logout: (<><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" /><path d="M16 8l4 4-4 4M9 12h11" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>),
};

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] ?? null}
    </svg>
  );
}

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "xl" | "l" | "m" | "s";
export function Button({ variant = "secondary", size = "m", block, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; block?: boolean }) {
  return <button {...rest} className={`btn btn-${size} btn-${variant} ${block ? "btn-block" : ""} ${className}`} />;
}

export function Badge({ tone = "grey", children }: { tone?: "green" | "red" | "orange" | "blue" | "grey"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Chip({ on, brand, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean; brand?: boolean }) {
  return (
    <button type="button" {...rest} className={`chip ${on ? "on" : ""} ${brand ? "brand" : ""}`}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)} />;
}

export function Loading({ text }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <span className="dots">
        <i />
        <i />
        <i />
      </span>
      {text ? <span className="cap" style={{ marginLeft: 10 }}>{text}</span> : null}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

/** 오른 값은 파랑, 내린 값은 검정 (토스 규칙) */
export function Delta({ value, suffix = "%", invert }: { value: number | null | undefined; suffix?: string; invert?: boolean }) {
  const up = value != null && (invert ? value < 0 : value > 0);
  return <span className={`n ${up ? "up" : "down"}`}>{signed(value, suffix)}</span>;
}

export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <h2 className="h2 mb12">{title}</h2>
        {children}
        {footer ? <div className="row mt16" style={{ justifyContent: "flex-end", gap: 8 }}>{footer}</div> : null}
      </div>
    </div>
  );
}

export function Field({ label, helper, error, children }: { label: string; helper?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <span className="helper err">{error}</span> : helper ? <span className="helper">{helper}</span> : null}
    </div>
  );
}
