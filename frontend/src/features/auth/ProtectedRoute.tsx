import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import type { Role } from "@/types/api";
import { roleHomePath } from "@/lib/roleHomePath";

export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { accessToken, user } = useAppSelector((s) => s.auth);

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={roleHomePath(user.role)} replace />;

  return <Outlet />;
}
