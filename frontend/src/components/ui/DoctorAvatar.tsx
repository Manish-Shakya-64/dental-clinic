import { useEffect, useState } from "react";
import { useLazyGetDoctorImageQuery } from "@/features/doctors/doctorsApi";
import { initials } from "@/lib/personName";
import { cn } from "@/lib/cn";
import type { PersonName } from "@/types/api";

interface DoctorAvatarProps {
  doctor: PersonName & { _id: string; profile_image?: string | null };
  className?: string;
}

/** Shows a doctor's real uploaded photo when they have one, falling back to their initials —
 *  used anywhere the public site or booking flow lists doctors, via the unauthenticated
 *  GET /doctors/:id/image endpoint (profile photos are otherwise only servable to their owner). */
export function DoctorAvatar({ doctor, className }: DoctorAvatarProps) {
  const [triggerImage, { data: blob }] = useLazyGetDoctorImageQuery();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (doctor.profile_image) void triggerImage(doctor._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor._id, doctor.profile_image]);

  useEffect(() => {
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [blob]);

  return url ? (
    <img src={url} alt="" className={cn("rounded-full object-cover", className)} />
  ) : (
    <div className={cn("flex items-center justify-center rounded-full bg-primary-tint font-bold text-primary", className)}>
      {initials(doctor)}
    </div>
  );
}
