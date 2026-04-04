import React, { useState, useRef, useEffect } from "react";

export default function ConfirmButton({ onConfirm, children, className = "", confirmText = "Emin misin?" }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
    } else {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={`${className} ${armed ? "!bg-red-600 !text-white" : ""}`}
    >
      {armed ? confirmText : children}
    </button>
  );
}
