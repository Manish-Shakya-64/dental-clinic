import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = "Remove", loading }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={380}>
      <div className="text-center">
        <div className="font-heading text-[17px] font-bold text-ink">{title}</div>
        <div className="mt-2.5 text-[13.5px] leading-relaxed text-muted">{description}</div>
        <div className="mt-5 flex gap-2.5">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button variant="dangerSolid" fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
