import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { logout } from "@/features/auth/authSlice";
import { useGetMyProfileQuery, useLazyGetMyProfileImageQuery } from "@/features/profile/profileApi";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import type { NavItem } from "@/components/layout/Sidebar";
import { roleHomePath } from "@/lib/roleHomePath";
import { fullName, initials } from "@/lib/personName";
import type { Patient, Practitioner, StaffMember } from "@/types/api";

function AccountAvatar({ hasImage, label }: { hasImage: boolean; label: string }) {
  const [triggerImage, { data: blob }] = useLazyGetMyProfileImageQuery();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (hasImage) void triggerImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage]);

  useEffect(() => {
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [blob]);

  return url ? (
    <img src={url} alt="" className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{label}</span>
  );
}

/** The account dropdown is rendered into `document.body` — same technique as `Modal` — so it
 *  floats above the page as independent chrome instead of being laid out as part of whichever
 *  page section happens to sit below the navbar. */
function AccountMenu({
  anchorRef,
  open,
  onClose,
  onEdit,
  onLogout,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onLogout: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
  }, [open, anchorRef]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorRef, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          style={{ position: "fixed", top: pos.top, right: pos.right }}
          className="z-50 w-44 overflow-hidden rounded-2xl bg-surface py-1.5 shadow-[10px_10px_26px_rgba(163,184,204,0.35)]"
        >
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-semibold text-ink-soft hover:bg-surface-alt"
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-semibold text-coral-alt hover:bg-surface-alt"
          >
            Log out
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function AppShell({ navItems, title, children }: { navItems: NavItem[]; title: string; children: ReactNode }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { data } = useGetMyProfileQuery(undefined, { skip: !user });

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  const profile = data?.profile as Patient | Practitioner | StaffMember | undefined;
  const displayName = profile ? fullName(profile) : user?.email;
  const avatarLabel = profile ? initials(profile) : "?";

  function handleEdit() {
    setMenuOpen(false);
    if (user) navigate(`${roleHomePath(user.role)}/profile`);
  }

  function handleLogoutConfirmed() {
    setConfirmingLogout(false);
    setMenuOpen(false);
    dispatch(logout());
    // A hard navigation (rather than letting ProtectedRoute reactively redirect) guarantees every
    // in-memory cache — Redux, RTK Query — is gone, and the current page can't keep rendering
    // stale data for even one more tick.
    window.location.assign("/login");
  }

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar items={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface px-4 py-4 shadow-[4px_4px_12px_rgba(163,184,204,0.15)] sm:px-6 md:px-8 md:py-5">
          <h1 className="font-heading min-w-0 truncate text-lg font-bold text-ink sm:text-xl">{title}</h1>
          <div className="flex flex-shrink-0 items-center gap-3">
            <span className="hidden text-sm font-semibold text-ink-soft sm:inline">{displayName}</span>
            <button
              ref={avatarButtonRef}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              title="Account menu"
              className="rounded-full shadow-[4px_4px_10px_rgba(163,184,204,0.3)] transition-transform hover:scale-105"
            >
              <AccountAvatar hasImage={!!profile?.profile_image} label={avatarLabel} />
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pb-10">{children}</main>
        <BottomTabBar items={navItems} />
      </div>

      <AccountMenu
        anchorRef={avatarButtonRef}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onEdit={handleEdit}
        onLogout={() => {
          setMenuOpen(false);
          setConfirmingLogout(true);
        }}
      />

      <ConfirmModal
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        onConfirm={handleLogoutConfirmed}
        title="Log out?"
        description="You'll need to sign in again to access your account."
        confirmLabel="Log out"
      />
    </div>
  );
}
