import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  end?: boolean;
  icon: LucideIcon;
}

/** Permanently docked desktop sidebar — on mobile, navigation moves to the bottom tab bar instead
 *  (see `BottomTabBar`), so this component only ever renders at the `md` breakpoint and up. */
export function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[220px] flex-shrink-0 flex-col gap-1 overflow-y-auto bg-surface p-4 pt-7 md:flex">
      <div className="font-heading px-2 pb-6 text-lg font-bold text-ink">Bright Smile</div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:text-primary"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-2xl bg-primary-tint"
                  transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                />
              )}
              <item.icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={2.2} color={isActive ? "var(--color-primary)" : "var(--color-border)"} />
              <span className={`relative z-10 ${isActive ? "text-primary" : ""}`}>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </aside>
  );
}
