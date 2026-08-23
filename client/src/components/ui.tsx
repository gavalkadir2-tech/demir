import { PropsWithChildren, useEffect } from "react";

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-600" />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="text-lg font-semibold text-neutral-700">{title}</div>
      {description && <div className="text-sm text-neutral-500 max-w-sm">{description}</div>}
      {action}
    </div>
  );
}

export function HataKutusu({ mesaj }: { mesaj?: string | null }) {
  if (!mesaj) return null;
  return <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">{mesaj}</div>;
}

export function UyariKutusu({ mesajlar }: { mesajlar?: string[] }) {
  if (!mesajlar || mesajlar.length === 0) return null;
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm space-y-1">
      {mesajlar.map((m, i) => (
        <div key={i}>⚠️ {m}</div>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string; wide?: boolean }>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
      <div className={`w-full ${wide ? "md:max-w-2xl" : "md:max-w-md"} max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white p-5 shadow-xl`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <span className={`badge ${className ?? "bg-neutral-200 text-neutral-700"}`}>{children}</span>;
}
