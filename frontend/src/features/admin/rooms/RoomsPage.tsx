import { useState } from "react";
import { useListRoomsQuery } from "@/features/rooms/roomsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { RoomFormModal } from "@/features/admin/rooms/RoomFormModal";
import type { Room } from "@/types/api";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  AVAILABLE: { bg: "var(--color-teal-tint)", color: "#2E7A6C", label: "Available" },
  OCCUPIED: { bg: "var(--color-primary-tint)", color: "var(--color-primary)", label: "Occupied" },
  SANITIZING: { bg: "var(--color-amber-tint)", color: "var(--color-amber-ink)", label: "Sanitizing" },
};

export function RoomsPage() {
  const { data, isLoading, isError, error } = useListRoomsQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(room: Room) {
    setEditing(room);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-heading text-lg font-bold text-ink">Rooms</div>
        <Button onClick={openCreate}>+ Add room</Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      {!isLoading && !isError && data && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((room) => {
            const style = STATUS_STYLES[room.status];
            return (
              <StaggerItem key={room._id}>
                <Card className="h-full">
                  <div className="flex items-start justify-between">
                    <div className="font-heading text-[14.5px] font-bold text-ink">{room.name}</div>
                    <button onClick={() => openEdit(room)} className="text-primary hover:text-primary-dark" title="Edit">
                      ✎
                    </button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {room.equipment_tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: style.bg, color: style.color }}>
                      {style.label}
                    </span>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      <RoomFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </div>
  );
}
