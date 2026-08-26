import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAppSelector } from "@/app/hooks";
import { Button } from "@/components/ui/Button";
import { roleHomePath } from "@/lib/roleHomePath";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui/Logo";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { accessToken, user } = useAppSelector((s) => s.auth);

  function handleBook() {
    setMenuOpen(false);
    if (accessToken && user?.role === "PATIENT") {
      navigate("/patient/book");
    } else if (accessToken && user) {
      navigate(roleHomePath(user.role));
    } else {
      navigate("/signup");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-marketing-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" onClick={() => setMenuOpen(false)}>
          <Logo size={34} textClassName="text-lg text-ink sm:text-xl">
            Bright Smile <span className="text-primary">Dental</span>
          </Logo>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => cn("text-[14.5px] font-semibold text-ink-soft transition-colors hover:text-primary", isActive && "text-primary")}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {accessToken && user ? (
            <button onClick={() => navigate(roleHomePath(user.role))} className="text-[14px] font-semibold text-ink-soft hover:text-primary">
              My account
            </button>
          ) : (
            <Link to="/login" className="text-[14px] font-semibold text-ink-soft hover:text-primary">
              Log in
            </Link>
          )}
          <Button onClick={handleBook}>Book Appointment</Button>
        </div>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink md:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border/60 md:hidden"
          >
            <nav className="flex flex-col gap-1 px-5 py-4">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => cn("rounded-xl px-3 py-2.5 text-[15px] font-semibold text-ink-soft", isActive && "bg-primary-tint text-primary")}
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="mt-2 flex flex-col gap-2.5 border-t border-border/60 pt-4">
                {accessToken && user ? (
                  <button onClick={() => navigate(roleHomePath(user.role))} className="px-3 text-left text-[14.5px] font-semibold text-ink-soft">
                    My account
                  </button>
                ) : (
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="px-3 text-[14.5px] font-semibold text-ink-soft">
                    Log in
                  </Link>
                )}
                <Button onClick={handleBook} fullWidth>
                  Book Appointment
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
