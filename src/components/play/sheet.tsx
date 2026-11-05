"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Modal built on the native <dialog>: focus trap, Esc to close and inert background come for free. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="sheet-title"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-ivory p-0 text-charcoal backdrop:bg-charcoal/60 sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-[8px]"
    >
      {open && (
        <div className="flex h-dvh flex-col sm:h-auto sm:max-h-[92dvh]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
            <h2 id="sheet-title" className="display text-2xl">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center hover:bg-parchment"><X size={22} aria-hidden /></button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      )}
    </dialog>
  );
}
