import { configureStore, isPlain } from "@reduxjs/toolkit";
import type { Middleware } from "@reduxjs/toolkit";
import { apiSlice } from "@/api/apiSlice";
import authReducer, { logout, setCredentials } from "@/features/auth/authSlice";
import toastReducer from "@/features/toast/toastSlice";

// A few RTK Query endpoints (bill PDFs, profile images) deliberately cache a Blob — legitimate,
// not a bug — so the default serializable-state check needs to allow that one extra type.
const isSerializable = (value: unknown): boolean => value instanceof Blob || isPlain(value);

// Queries scoped to "the current user" (getMyProfile, getMyProfileImage, ...) take no arguments,
// so RTK Query caches them under the same key regardless of who's logged in. Without this, logging
// out and logging back in as someone else would keep serving the previous user's cached profile
// until the cache naturally expired. Wipe every cached query/mutation whenever the session's
// identity changes — on logout, and on every fresh login/signup — so nothing leaks between users.
const resetApiCacheOnAuthChange: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  if (logout.match(action) || setCredentials.match(action)) {
    storeApi.dispatch(apiSlice.util.resetApiState());
  }
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    toast: toastReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { isSerializable },
    }).concat(apiSlice.middleware, resetApiCacheOnAuthChange),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
