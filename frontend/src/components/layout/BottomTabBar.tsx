import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/components/layout/Sidebar";

const MAX_PRIMARY_TABS = 5;

function TabLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
    >
      {({ isActive }) => (
        <>
          <item.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} color={isActive ? "var(--color-primary)" : "var(--color-placeholder)"} />
          <span className={cn("text-[10.5px] font-semibold", isActive ? "text-primary" : "text-placeholder")}>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/** Native-app-style bottom navigation for phones — replaces the desktop sidebar below the `md`
 *  breakpoint. Portals with more items than fit comfortably in one bar (currently only Admin, at
 *  6) get a "More" tab that opens the rest in a slide-up sheet instead of cramming everything in. */
export function BottomTabBar({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const overflowing = items.length > MAX_PRIMARY_TABS;
  const primaryItems = overflowing ? items.slice(0, MAX_PRIMARY_TABS - 1) : items;
  const overflowItems = overflowing ? items.slice(MAX_PRIMARY_TABS - 1) : [];
  const overflowActive = overflowItems.some((item) => location.pathname === item.to || (!item.end && location.pathname.startsWith(item.to)));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(163,184,204,0.2)] md:hidden">
        {primaryItems.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
        {overflowing && (
          <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-1 py-2">
            <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={overflowActive ? 2.4 : 2} color={overflowActive ? "var(--color-primary)" : "var(--color-placeholder)"} />
            <span className={cn("text-[10.5px] font-semibold", overflowActive ? "text-primary" : "text-placeholder")}>More</span>
          </button>
        )}
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-surface pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_-10px_30px_rgba(0,0,0,0.15)] md:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-border" />
              <div className="flex flex-col gap-1 p-3">
                {overflowItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMoreOpen(false)}
                    className="relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-muted"
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <div className="absolute inset-0 rounded-2xl bg-primary-tint" />}
                        <item.icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={2.2} color={isActive ? "var(--color-primary)" : "var(--color-border)"} />
                        <span className={cn("relative z-10", isActive && "text-primary")}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
