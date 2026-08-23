import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { dismissToast } from "@/features/toast/toastSlice";

const KIND_STYLES: Record<string, string> = {
  success: "bg-ink text-white",
  error: "bg-coral-alt text-white",
  info: "bg-ink text-white",
};

function ToastItem({ id, kind, message }: { id: string; kind: string; message: string }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(id)), 3500);
    return () => clearTimeout(timer);
  }, [id, dispatch]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className={`flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-[8px_8px_20px_rgba(0,0,0,0.2)] ${KIND_STYLES[kind] ?? KIND_STYLES.info}`}
    >
      {message}
    </motion.div>
  );
}

export function ToastHost() {
  const items = useAppSelector((s) => s.toast.items);

  return (
    <div className="pointer-events-none fixed top-6 right-6 z-[100] flex flex-col gap-2.5">
      <AnimatePresence>
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
