import React from "react";
import { NavLink } from "react-router-dom";
import { Home, CalendarHeart, Wallet, Package } from "lucide-react";

const items = [
  { to: "/", label: "Ana", icon: Home },
  { to: "/randevu-hasta", label: "Randevu", icon: CalendarHeart },
  { to: "/kasa", label: "Kasa", icon: Wallet },
  { to: "/paketler", label: "Paketler", icon: Package },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card/95 backdrop-blur border-t border-border z-40">
      <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs transition ${
                isActive ? "text-[#cba96e]" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
