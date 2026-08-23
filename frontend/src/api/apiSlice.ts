import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/app/store";
import { logout, setAccessToken } from "@/features/auth/authSlice";
import type { ApiErrorBody, LoginResponse } from "@/types/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

let refreshPromise: Promise<string | null> | null = null;

/** Ends a dead session by forcing a full browser navigation to /login rather than relying on
 *  React to reactively notice the cleared auth state and re-render ProtectedRoute. A soft
 *  client-side redirect leaves whatever page was already mounted rendering for one more tick with
 *  now-vanished data/cache, which is exactly the "stale page flashes then crashes into the error
 *  boundary" bug this replaces — a hard navigation tears the whole page down immediately and reloads
 *  the app from scratch, which also guarantees every in-memory cache (Redux, RTK Query) is gone. */
function forceLoginRedirect(dispatchLogout: () => void) {
  dispatchLogout();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken;
    const isAuthEndpoint = typeof args !== "string" && args.url.startsWith("/auth/");

    if (refreshToken && !isAuthEndpoint) {
      refreshPromise ??= (async () => {
        const refreshResult = await rawBaseQuery(
          { url: "/auth/refresh", method: "POST", body: { refreshToken } },
          api,
          extraOptions,
        );
        const body = refreshResult.data as { data: { accessToken: string } } | undefined;
        return body?.data.accessToken ?? null;
      })();

      const newAccessToken = await refreshPromise;
      refreshPromise = null;

      if (newAccessToken) {
        api.dispatch(setAccessToken(newAccessToken));
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        forceLoginRedirect(() => api.dispatch(logout()));
      }
    } else if (!isAuthEndpoint) {
      forceLoginRedirect(() => api.dispatch(logout()));
    }
  }

  return result;
};

export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const body = (error as { data?: Partial<ApiErrorBody> }).data;
    if (body?.error?.message) return body.error.message;
  }
  return "Something went wrong. Please try again.";
}

export type { LoginResponse };

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Appointment", "Patient", "Profile", "Room", "Staff", "Slot", "Treatment", "Report", "Waitlist", "Bill"],
  endpoints: () => ({}),
});
