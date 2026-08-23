import { useLocation } from "react-router-dom";

/** Patient management is reachable from both the reception and admin portals via the same screens.
 *  Those screens link back to their own list/cancel targets, so they need to know which portal the
 *  user actually came in through rather than hardcoding one of them. */
export function usePortalBase(): "/admin" | "/reception" {
  return useLocation().pathname.startsWith("/admin") ? "/admin" : "/reception";
}
