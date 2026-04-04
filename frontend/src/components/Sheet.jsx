import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-4 py-3 z-10">
          <h2 className="font-display text-xl" style={{ color: "#cba96e" }}>{title}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 bg-card border-t border-border p-3">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
